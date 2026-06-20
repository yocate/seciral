import os
import re

with open("backend/main.py", "r") as f:
    content = f.read()

# 1. Add startup event and centralize imports
# Find the start of app = FastAPI(...)
app_init_index = content.find('app = FastAPI(title="Strategy Intelligence Platform (SIP) API")')
if app_init_index == -1:
    print("Could not find app init")
    exit(1)

# Add imports at the top
top_imports = """
import uuid
import json
from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil
from dotenv import load_dotenv
from langchain_core.globals import set_llm_cache
from langchain_community.cache import SQLiteCache
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# Internal Modules
from knowledge.database import (
    init_db, get_all_documents, get_top_referenced_documents, get_dashboard_stats,
    get_utilized_frameworks, invalidate_document, delete_document_physically,
    rename_document, get_all_projects, get_project as get_project_db, create_project,
    link_document_to_project, get_all_templates, get_template, get_graph as db_get_graph,
    save_graph_incremental, save_knowledge, increment_reference_count
)
from knowledge.vectorstore import delete_document_from_vectorstore, ingest_document_to_vectorstore, retrieve_relevant_chunks
from knowledge.extractor import extract_text
from agents.diagnostic_agent import get_agent
from agents.graph_extractor import extract_graph

"""

# Replace top imports
content = re.sub(r'from fastapi import.*?\n\n', top_imports, content, flags=re.DOTALL | re.MULTILINE)

# Remove all inline imports
content = re.sub(r'^[ \t]*from knowledge\..*?import .*?\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^[ \t]*from agents\..*?import .*?\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^[ \t]*import uuid.*?\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^[ \t]*import json.*?\n', '', content, flags=re.MULTILINE)
content = re.sub(r'^[ \t]*from langchain_.*?\n', '', content, flags=re.MULTILINE)

# 2. Restrict CORS and add startup
cors_startup = """
app = FastAPI(title="Strategy Intelligence Platform (SIP) API")

@app.on_event("startup")
def on_startup():
    print("Initializing Database...")
    init_db(create_tables=True)

# CORS middleware for frontend communication
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helpers ---
def format_graph_for_llm(graph_data):
    if not graph_data or not graph_data.get("nodes"):
        return "なし"
    nodes = [n["name"] for n in graph_data["nodes"]]
    edges = [f"{e['source']} --({e['label']})--> {e['target']}" for e in graph_data.get("links", [])]
    return f"主要な要素: {', '.join(nodes)}\\n因果関係:\\n" + "\\n".join(edges)

def get_chat_history_text(session_id: str, limit: int = None):
    agent = get_agent()
    config = {"configurable": {"thread_id": session_id}}
    state = agent.get_state(config)
    messages = state.values.get("messages", []) if state.values else []
    if limit:
        messages = messages[-limit:]
    return "\\n".join([f"{m.type}: {m.content}" for m in messages])

def get_api_key():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return key
"""

content = re.sub(r'app = FastAPI.*?allow_headers=\["\*"\],\n\)', cors_startup, content, flags=re.DOTALL)


# 3. Refactor generate_graph
gen_graph_old = r"""@app\.post\("/api/graph/generate"\)
def generate_graph\(request: GraphGenerateRequest\):.*?return \{"status": "error", "message": str\(e\)\}"""

gen_graph_new = """@app.post("/api/graph/generate")
def generate_graph(request: GraphGenerateRequest):
    try:
        # 1. 現在のナレッジグラフの取得
        current_graph = db_get_graph("global")
        current_graph_text = format_graph_for_llm(current_graph)
        
        # 2. 会話履歴の取得
        history_text = get_chat_history_text(request.session_id, limit=10)
        
        # 3. グラフ抽出
        graph_data = extract_graph(request.session_id, history_text, current_graph_text)
        
        # 4. DBへインクリメンタル保存 (Upsert)
        save_graph_incremental("global", graph_data)
        
        # 5. 最新の全グラフを取得して返す
        updated_graph = db_get_graph("global")
            
        return {"status": "success", "graph": updated_graph}
        
    except Exception as e:
        print(f"Error in generate_graph: {e}")
        return {"status": "error", "message": "Failed to generate graph"}"""

content = re.sub(gen_graph_old, gen_graph_new, content, flags=re.DOTALL)

# 4. Refactor process_ingestion auto graph extraction
ingestion_old = r"""                # --- Auto Graph Extraction ---
                try:
                    # Get current graph state
                    current_graph = db_get_graph\("global"\)
                    current_graph_text = "なし"
                    if current_graph and current_graph\.get\("nodes"\):
                        nodes = \[n\["name"\] for n in current_graph\["nodes"\]\]
                        edges = \[f"\{e\['source'\]\} --\(\{e\['label'\]\}\)--> \{e\['target'\]\}" for e in current_graph\.get\("links", \[\]\)\]
                        current_graph_text = f"主要な要素: \{\', \'\.join\(nodes\)\}\\n因果関係:\\n" \+ "\\n"\.join\(edges\)
                    
                    # LLMに渡すテキスト量が多すぎるのを防ぐため、ドキュメントの先頭5000文字程度を抽出対象とする
                    target_text = text\[:5000\] if len\(text\) > 5000 else text
                    graph_data = extract_graph\(session_id="global", input_text=target_text, current_graph_text=current_graph_text, input_type=f"ドキュメント:\{filename\}"\)
                    
                    # グラフへ反映
                    save_graph_incremental\("global", graph_data\)
                except Exception as e:
                    print\(f"Auto graph extraction failed for \{filename\}: \{e\}"\)"""

ingestion_new = """                # --- Auto Graph Extraction ---
                try:
                    current_graph = db_get_graph("global")
                    current_graph_text = format_graph_for_llm(current_graph)
                    
                    target_text = text[:5000] if len(text) > 5000 else text
                    graph_data = extract_graph(session_id="global", input_text=target_text, current_graph_text=current_graph_text, input_type=f"ドキュメント:{filename}")
                    
                    save_graph_incremental("global", graph_data)
                except Exception as e:
                    print(f"Auto graph extraction failed for {filename}: {e}")"""

content = re.sub(ingestion_old, ingestion_new, content, flags=re.DOTALL)

# 5. Refactor get_diagnostic_history
history_old = r"""@app\.get\("/api/diagnostic/history"\)
def get_diagnostic_history\(session_id: str\):
    try:.*?return \{"history": history\}
    except Exception as e:
        return \{"history": \[\]\}"""

history_new = """@app.get("/api/diagnostic/history")
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
        return {"history": []}"""

content = re.sub(history_old, history_new, content, flags=re.DOTALL)

# 6. Hide exceptions in general endpoints
content = re.sub(r'return \{"status": "error", "message": str\(e\)\}', r'print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}', content)

# 7. Unify API Key
diag_old = r"""    if not os\.environ\.get\("GEMINI_API_KEY"\):
        return \{
            "reply": "⚠️ エラー: GEMINI_API_KEYが設定されていません。バックエンドの環境変数（\.env等）にAPIキーを設定してください。"
        \}"""

diag_new = """    try:
        get_api_key()
    except ValueError as e:
        return {"reply": f"⚠️ エラー: {e}"}"""

content = re.sub(diag_old, diag_new, content, flags=re.DOTALL)

# GOOGLE_API_KEY -> GEMINI_API_KEY
content = content.replace('os.environ.get("GOOGLE_API_KEY")', 'get_api_key()')


with open("backend/main.py", "w") as f:
    f.write(content)
print("main.py rewritten successfully.")
