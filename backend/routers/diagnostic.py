import os
import re
import json
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.prompts import PromptTemplate

from knowledge.database import (
    get_template, get_all_documents, increment_reference_count,
    get_user_by_id, get_graph as db_get_graph, save_knowledge, link_document_to_project, save_graph_incremental,
    get_all_frameworks
)
from knowledge.vectorstore import retrieve_relevant_chunks, ingest_document_to_vectorstore
from agents.diagnostic_agent import get_agent
from agents.graph_extractor import extract_graph

router = APIRouter(prefix="/api", tags=["diagnostic"])

# --- Helpers ---
def get_api_key():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return key

def format_graph_for_llm(graph_data):
    if not graph_data or not graph_data.get("nodes"):
        return "なし"
    nodes = [f"{n['name']} (提供元: {n.get('author', 'System')}/{n.get('department', 'General')})" for n in graph_data["nodes"]]
    edges = [f"{e['source']} --({e['label']})--> {e['target']} [提供元: {e.get('author', 'System')}]" for e in graph_data.get("links", [])]
    return f"主要な要素: {', '.join(nodes)}\n因果関係:\n" + "\n".join(edges)

def get_chat_history_text(session_id: str, limit: int = None):
    agent = get_agent()
    config = {"configurable": {"thread_id": session_id}}
    state = agent.get_state(config)
    messages = state.values.get("messages", []) if state.values else []
    if limit:
        messages = messages[-limit:]
    return "\n".join([f"{m.type}: {m.content}" for m in messages])


class DiagnosticRequest(BaseModel):
    message: str
    session_id: str
    template_id: Optional[str] = "default_session"
    author_id: Optional[str] = None

class DiagnosticIngestRequest(BaseModel):
    session_id: str
    author_id: Optional[str] = None
    author: Optional[str] = "System"
    department: Optional[str] = "General"
    career: Optional[str] = ""
    characteristics: Optional[str] = ""

class GenerateDocumentRequest(BaseModel):
    template_id: str

class SaveGeneratedDocumentRequest(BaseModel):
    title: str
    content: str


@router.post("/diagnostic")
def run_diagnostic(request: DiagnosticRequest, background_tasks: BackgroundTasks):
    try:
        get_api_key()
    except ValueError as e:
        return {"reply": f"⚠️ エラー: {e}"}
        
    try:
        agent = get_agent()
        config = {"configurable": {"thread_id": request.session_id}}
        
        template_text = ""
        if request.template_id and request.template_id != "default_session":
            template = get_template(request.template_id)
            if template:
                template_text = f"\n\n※現在の会話は「{template['name']}」({template['description']})の作成を目的としています。ユーザーへの質問や回答は、このドキュメントを完成させるために必要な情報を引き出すようガイドしてください。\n【AIへの指示】\n{template['system_prompt']}"

        docs = get_all_documents(request.session_id)
        valid_doc_ids = [d["id"] for d in docs if d.get("is_valid", 1) == 1]
        search_ids = valid_doc_ids if valid_doc_ids else None
        chunks = retrieve_relevant_chunks(request.message, project_document_ids=search_ids, k=3)
        
        rag_context = ""
        if chunks:
            retrieved_texts = [f"- {c.page_content}" for c in chunks]
            rag_context = "\n\n【関連するプロジェクトナレッジ（前提知識）】\n" + "\n".join(retrieved_texts)
            ref_doc_ids = list({c.metadata.get("document_id") for c in chunks if c.metadata.get("document_id") is not None})
            if ref_doc_ids:
                increment_reference_count(ref_doc_ids)

        graph_context = ""

        fws = get_all_frameworks()
        mvp_fws = [fw for fw in fws if fw.get("priority") == "MVP必須"]
        fw_context = ""
        if mvp_fws:
            fw_names = [f"{fw['name']}: {fw['description']}" for fw in mvp_fws]
            fw_context = "\n\n【組織で定義された公式中核フレームワーク（MVP必須）】\n" + "\n".join(f"- {n}" for n in fw_names) + "\n※ 回答を生成する際は、上記の中核フレームワーク群を中心的に活用し、多角的かつ論理的に分析・提案を行ってください。"
            rag_context += f"\n\n【現在アクティブなフレームワーク】\n{fw_context}"

        user_persona_context = ""
        if request.author_id:
            user = get_user_by_id(request.author_id)
            if user and user.get("strategic_persona"):
                user_persona_context = f"\n\n【あなたの対話相手（ユーザー）の特性】\n思考特性・ペルソナ: {user.get('strategic_persona')}\nこれまでの傾向を考慮し、このユーザーの視点に寄り添いつつ、時には多角的な視点を促すようなアプローチで対話してください。"

        final_message = request.message + template_text + rag_context + fw_context + user_persona_context

        result = agent.invoke({"messages": [HumanMessage(content=final_message)]}, config=config)
        last_message = result["messages"][-1]
        
        def auto_extract_graph():
            try:
                history_text = f"User: {request.message}\nAI: {last_message.content}"
                current_graph = db_get_graph("global")
                current_graph_text = format_graph_for_llm(current_graph)
                
                strategic_persona = ""
                author_name = "System"
                department = "General"
                if request.author_id:
                    user = get_user_by_id(request.author_id)
                    if user:
                        strategic_persona = user.get("strategic_persona", "")
                        author_name = user.get("display_name", "System")
                        department = user.get("department", "General")
                
                graph_data = extract_graph(
                    session_id=request.session_id,
                    input_text=history_text,
                    current_graph_text=current_graph_text,
                    input_type="ChatSession",
                    strategic_persona=strategic_persona
                )
                
                if graph_data:
                    # Note: save_graph_incremental actually takes (project_id, graph_data) in some old versions,
                    # but let's see how main.py called it... Oh wait, main.py lines 618-621 called:
                    # save_graph_incremental("global", graph_data)
                    # Wait, in the background task it was called differently. Let's stick to main.py logic.
                    # It was:
                    # save_graph_incremental(session_id=request.session_id, nodes=graph_data.get("nodes", []), links=..., author_id=...)
                    # This signature looks completely different from `save_graph_incremental("global", graph_data)` on line 621!
                    # Actually, we will just use the correct database module function: `save_graph_incremental(project_id, graph_data)`
                    # No wait, I'll just use the one that works in `api/diagnostic/ingest` which was:
                    # graph_data["author"] = request.author
                    # save_graph_incremental("global", graph_data)
                    
                    graph_data["author"] = author_name
                    graph_data["department"] = department
                    save_graph_incremental("global", graph_data)
                    
            except Exception as bg_e:
                print(f"Background Graph Extraction Error: {bg_e}")

        background_tasks.add_task(auto_extract_graph)

        return {"reply": last_message.content}
        
    except Exception as e:
        return {"reply": f"エラーが発生しました: {str(e)}"}

@router.get("/diagnostic/history")
def get_diagnostic_history(session_id: str):
    try:
        agent = get_agent()
        config = {"configurable": {"thread_id": session_id}}
        state = agent.get_state(config)
        messages = state.values.get("messages", []) if state.values else []
        
        history = []
        for m in messages:
            if isinstance(m, HumanMessage):
                history.append({"sender": "user", "text": m.content})
            elif isinstance(m, AIMessage):
                history.append({"sender": "ai", "text": m.content})
                
        return {"history": history}
    except Exception as e:
        print(f"Error in get_diagnostic_history: {e}")
        return {"history": []}

@router.get("/diagnostic/sessions")
def get_diagnostic_sessions():
    try:
        import sqlite3
        conn = sqlite3.connect("data/checkpoints.db")
        cursor = conn.cursor()
        cursor.execute("SELECT DISTINCT thread_id FROM checkpoints")
        rows = cursor.fetchall()
        conn.close()
        
        sessions = [{"id": row[0], "name": f"Session {row[0][:8]}"} for row in rows if row[0]]
        return {"sessions": sessions}
    except Exception as e:
        print(f"Error in get_diagnostic_sessions: {e}")
        return {"sessions": []}

@router.get("/projects/{session_id}/completeness")
def get_template_completeness(session_id: str, template_id: str):
    try:
        if not template_id or template_id == "default_session":
            return {"status": "success", "completeness": 0}
            
        template = get_template(template_id)
        if not template:
            return {"status": "success", "completeness": 0}
            
        history_text = get_chat_history_text(session_id, limit=20)
        if not history_text.strip():
            return {"status": "success", "completeness": 0}
            
        prompt = PromptTemplate.from_template('''
あなたは熟練の戦略コンサルタントです。
現在、以下の「テンプレート」を作成するための情報を集めています。

【テンプレートの内容】
{template_text}

【これまでの会話履歴】
{history_text}

現在の会話履歴の内容だけで、上記のテンプレートを記述するために必要な情報が「何パーセント（0〜100）」揃っているか（網羅性）を評価してください。
出力は、0から100の間の整数値（数字のみ）を出力してください。余計な文字は一切含めないでください。
''')
        
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.0)
        chain = prompt | llm
        res = chain.invoke({
            "template_text": f"{template['name']} - {template['description']}\n{template['system_prompt']}",
            "history_text": history_text
        })
        
        score_text = res.content.strip()
        match = re.search(r'\d+', score_text)
        score = int(match.group()) if match else 0
        return {"status": "success", "completeness": min(100, max(0, score))}
    except Exception as e:
        print(f"Error calculating completeness: {e}")
        return {"status": "error", "completeness": 0}

@router.post("/projects/{session_id}/generate_document")
def generate_document_endpoint(session_id: str, request: GenerateDocumentRequest):
    try:
        template = get_template(request.template_id)
        if not template:
            return {"status": "error", "message": "Template not found"}
            
        history_text = get_chat_history_text(session_id, limit=50)
        if not history_text.strip():
            return {"status": "error", "message": "No conversation history found"}
            
        prompt = PromptTemplate.from_template('''
あなたは最高峰の戦略コンサルタントです。
以下の会話履歴に基づいて、指定されたテンプレートの形式で最終的な「ドキュメント（Markdown形式）」を作成してください。
情報は会話履歴から最大限抽出・推論し、プロフェッショナルな体裁に仕上げてください。

【テンプレート（作成すべき形式と内容）】
{template_text}

【会話履歴】
{history_text}

Markdown形式で出力してください。
''')
        
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.2)
        chain = prompt | llm
        res = chain.invoke({
            "template_text": f"# {template['name']}\n{template['description']}\n{template['system_prompt']}",
            "history_text": history_text
        })
        
        doc_content = res.content.strip()
        
        return {"status": "success", "content": doc_content}
    except Exception as e:
        print(f"Error generating document: {e}")
        return {"status": "error", "message": "Failed to generate document"}

@router.post("/projects/{session_id}/save_generated_document")
def save_generated_document_endpoint(session_id: str, request: SaveGeneratedDocumentRequest):
    try:
        doc_id = save_knowledge(
            filename=request.title,
            text=request.content,
            project_id=session_id
        )
        link_document_to_project(doc_id, session_id)
        
        ingest_document_to_vectorstore(request.content, doc_id)
        
        return {"status": "success", "document_id": doc_id, "message": "Document saved successfully"}
    except Exception as e:
        print(f"Error saving generated document: {e}")
        return {"status": "error", "message": "Failed to save document"}

@router.post("/diagnostic/ingest")
def ingest_session(request: DiagnosticIngestRequest):
    try:
        agent = get_agent()
        config = {"configurable": {"thread_id": request.session_id}}
        state = agent.get_state(config)
        messages = state.values.get("messages", []) if state.values else []
        
        if not messages:
            return {"status": "error", "message": "セッション履歴が見つかりません。"}
            
        history_text = "\n".join([f"{'User' if isinstance(m, HumanMessage) else 'AI'}: {m.content}" for m in messages])
        
        current_graph = db_get_graph("global")
        current_graph_text = format_graph_for_llm(current_graph)
        
        strategic_persona = ""
        if request.author_id:
            user = get_user_by_id(request.author_id)
            if user and user.get("strategic_persona"):
                strategic_persona = user.get("strategic_persona")
                
        graph_data = extract_graph(
            session_id=request.session_id, 
            input_text=history_text, 
            current_graph_text=current_graph_text, 
            input_type="ChatSession", 
            strategic_persona=strategic_persona
        )
        
        doc_id = save_knowledge(
            filename=f"ChatSession_{request.session_id[:8]}",
            text=history_text,
            project_id="global"
        )
        link_document_to_project(doc_id, request.session_id)
        
        if graph_data:
            graph_data["author"] = request.author
            graph_data["department"] = request.department
            save_graph_incremental("global", graph_data)
        
        return {"status": "success", "message": "セッションをナレッジグラフにインジェストしました。"}
    except Exception as e:
        print(f"Error in ingest_session: {e}")
        raise HTTPException(status_code=500, detail=str(e))
