import os
import json
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from knowledge.database import (
    get_latest_insight, save_latest_insight, get_graph as db_get_graph, init_db
)
from agents.graph_extractor import extract_meta_insights
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])

@router.get("/abstract")
def get_knowledge_abstraction():
    try:
        saved_insight = get_latest_insight()
        if saved_insight:
            return json.loads(saved_insight)
        return {"archetypes": [], "meta_narrative": "まだ知見が抽出されていません。「グラフ全体から知見を抽出」ボタンを押してください。", "new_insights": []}
    except Exception as e:
        print(f"Error in get_knowledge_abstraction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/abstract")
def generate_knowledge_abstraction():
    try:
        graph_data = db_get_graph("global")
        if not graph_data or not graph_data.get("nodes"):
            return {"archetypes": [], "meta_narrative": "まだ十分なナレッジグラフが蓄積されていません。対話や資料アップロードを通じてグラフを成長させてください。", "new_insights": []}
            
        insights = extract_meta_insights(graph_data)
        
        save_latest_insight(json.dumps(insights, ensure_ascii=False))
        return insights
    except Exception as e:
        print(f"Error in generate_knowledge_abstraction: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/causal_loops")
def get_causal_loops():
    from collections import defaultdict
    db = init_db()
    
    if "graph_edges" not in db.table_names() or "graph_nodes" not in db.table_names():
        return {"loops": []}
        
    edges = list(db.query("SELECT source, target, label, confidence FROM graph_edges"))
    nodes_raw = list(db.query('SELECT id, name, "group", layer FROM graph_nodes'))
    nodes = {r["id"]: {"id": r["id"], "name": r["name"], "group": r.get("group", ""), "layer": r.get("layer", "")} for r in nodes_raw}
    
    adj = defaultdict(list)
    edge_map = {}
    for e in edges:
        s, t = e["source"], e["target"]
        adj[s].append(t)
        edge_map[(s, t)] = e

    loops = []
    
    def dfs(node, start_node, path, visited):
        if len(path) > 4:
            return
        if node in visited:
            if node == start_node and len(path) > 1:
                loops.append(list(path))
            return
            
        visited.add(node)
        path.append(node)
        for neighbor in adj[node]:
            dfs(neighbor, start_node, path, visited)
        path.pop()
        visited.remove(node)
        
    for node in list(adj.keys()):
        dfs(node, node, [], set())
        
    unique_loops = []
    seen_sets = set()
    for loop in loops:
        frozen = frozenset(loop)
        if frozen not in seen_sets:
            seen_sets.add(frozen)
            unique_loops.append(loop)
            
    result_loops = []
    for i, loop_node_ids in enumerate(unique_loops):
        loop_nodes = [nodes.get(nid, {"id": nid, "name": nid}) for nid in loop_node_ids]
        loop_edges = []
        for j in range(len(loop_node_ids)):
            s = loop_node_ids[j]
            t = loop_node_ids[(j + 1) % len(loop_node_ids)]
            edge_info = edge_map.get((s, t), {"label": "関連"})
            loop_edges.append({"source": s, "target": t, "label": edge_info.get("label", ""), "confidence": edge_info.get("confidence", 5)})
            
        result_loops.append({
            "id": f"loop_{i}",
            "nodes": loop_nodes,
            "edges": loop_edges
        })
        
    result_loops.sort(key=lambda x: len(x["nodes"]))
    return {"loops": result_loops}

@router.post("/causal_loops/evaluate")
def evaluate_causal_loop(loop_data: dict):
    nodes = loop_data.get("nodes", [])
    edges = loop_data.get("edges", [])
    
    if not nodes or not edges:
        return {"type": "Unknown", "edges_polarity": {}, "description": "No data"}
        
    loop_desc = "以下のループ構造について分析してください。\n\n"
    for e in edges:
        s_name = next((n["name"] for n in nodes if n["id"] == e["source"]), e["source"])
        t_name = next((n["name"] for n in nodes if n["id"] == e["target"]), e["target"])
        loop_desc += f"- [{s_name}] --({e['label']})--> [{t_name}]\n"
        
    prompt = f"""あなたはシステムダイナミクスと因果ループ図（CLD）の専門家です。
以下の因果ループ構造を分析し、各エッジの「極性（Polarity）」とループ全体の「種類」を判定してください。

極性の定義:
- [+] (Positive/Same direction): 原因が増加すれば結果も増加する。または原因が減少すれば結果も減少する。
- [-] (Negative/Opposite direction): 原因が増加すれば結果は増加する。または原因が減少すれば結果は増加する。

ループの種類:
- Reinforcing (自己強化): マイナスの極性を持つエッジの数が「偶数」または「0」。
- Balancing (バランス): マイナスの極性を持つエッジの数が「奇数」。

{loop_desc}

出力は必ず以下のJSONスキーマに従ってください。Markdownブロック（```json ... ```）は付けずに出力すること。
{{
  "type": "Reinforcing" または "Balancing",
  "description": "このループが組織にどのような力学（強み、または悪循環）をもたらしているかの簡潔な解説",
  "edges_polarity": {{
    "source_id|target_id": "+" または "-"
  }}
}}
"""
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=0.0,
            google_api_key=os.environ.get("GEMINI_API_KEY")
        )
        response = llm.invoke([HumanMessage(content=prompt)])
        content = response.content.strip()
        if content.startswith("```json"):
            content = content[7:-3]
        elif content.startswith("```"):
            content = content[3:-3]
            
        data = json.loads(content)
        return data
    except Exception as e:
        print(f"Error evaluating loop: {e}")
        return {"type": "Unknown", "edges_polarity": {}, "description": "評価に失敗しました。"}

class FrameworkAddRequest(BaseModel):
    name: str
    description: str

@router.get("/frameworks")
def api_get_all_frameworks():
    from knowledge.database import get_all_frameworks
    try:
        fws = get_all_frameworks()
        return {"status": "success", "frameworks": fws}
    except Exception as e:
        print(f"API Error: {e}")
        return {"status": "error", "message": "An internal server error occurred."}

@router.post("/frameworks")
def api_add_framework(req: FrameworkAddRequest):
    from knowledge.database import add_framework
    try:
        if not req.name.strip() or not req.description.strip():
            return {"status": "error", "message": "Name and description are required"}
        fw = add_framework(req.name.strip(), req.description.strip())
        return {"status": "success", "framework": fw}
    except Exception as e:
        print(f"API Error: {e}")
        return {"status": "error", "message": "An internal server error occurred."}

class GraphGenerateRequest(BaseModel):
    session_id: str = "default_session"

@router.get("/graph")
def get_graph():
    return db_get_graph("global")

@router.post("/graph/generate")
def generate_graph(request: GraphGenerateRequest):
    try:
        from api.diagnostic import format_graph_for_llm, get_chat_history_text
        current_graph = db_get_graph("global")
        current_graph_text = format_graph_for_llm(current_graph) if 'format_graph_for_llm' in globals() else ""
        
        history_text = get_chat_history_text(request.session_id, limit=10) if 'get_chat_history_text' in globals() else ""
        
        graph_data = extract_graph(request.session_id, history_text, current_graph_text)
        
        from knowledge.database import save_graph_incremental
        save_graph_incremental("global", graph_data)
        
        updated_graph = db_get_graph("global")
        return {"status": "success", "graph": updated_graph}
    except Exception as e:
        print(f"Error in generate_graph: {e}")
        return {"status": "error", "message": "Failed to generate graph"}

from fastapi import UploadFile, File, Form, BackgroundTasks
from typing import List
import shutil

def process_ingestion(file_locations: list, filenames: list, project_id: Optional[str], author_id: str = None, author: str = "System", department: str = "General", career: str = "", characteristics: str = ""):
    from knowledge.database import get_user_by_id, save_knowledge, save_graph_incremental
    from knowledge.extractor import extract_text
    from knowledge.vectorstore import ingest_document_to_vectorstore
    from langchain_core.messages import SystemMessage, HumanMessage
    
    strategic_persona = ""
    if author_id:
        user = get_user_by_id(author_id)
        if user and user.get("strategic_persona"):
            strategic_persona = user.get("strategic_persona")
            
    for file_location, filename in zip(file_locations, filenames):
        try:
            text = extract_text(file_location)
            if text:
                summary = ""
                try:
                    llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.0)
                    summary_prompt = "以下のドキュメントの内容を300文字〜400文字程度で要約してください。どのようなナレッジが含まれているかが一目でわかるように説明してください。"
                    target_text_for_summary = text[:10000] if len(text) > 10000 else text
                    res = llm.invoke([SystemMessage(content=summary_prompt), HumanMessage(content=target_text_for_summary)])
                    summary = res.content.strip()
                except Exception as e:
                    print(f"Failed to generate summary for {filename}: {e}")

                doc_id = save_knowledge(filename, text, project_id, summary=summary)
                ingest_document_to_vectorstore(text, doc_id) # The signature in main.py was ingest_document_to_vectorstore(doc_id, filename, text) but wait! The vectorstore module uses `ingest_document_to_vectorstore(text, metadata_id)`
                
                try:
                    current_graph = db_get_graph("global")
                    from api.diagnostic import format_graph_for_llm
                    current_graph_text = format_graph_for_llm(current_graph) if 'format_graph_for_llm' in globals() else ""
                    
                    target_text = text[:5000] if len(text) > 5000 else text
                    graph_data = extract_graph(session_id="global", input_text=target_text, current_graph_text=current_graph_text, input_type=f"ドキュメント:{filename}", strategic_persona=strategic_persona)
                    
                    graph_data["author"] = author
                    graph_data["department"] = department
                    save_graph_incremental("global", graph_data)
                except Exception as e:
                    print(f"Auto graph extraction failed for {filename}: {e}")
        except Exception as e:
            print(f"Ingestion failed for {filename}: {e}")

@router.post("/ingest")
async def ingest_knowledge(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...), project_id: Optional[str] = Form(None), author_id: Optional[str] = Form(None), author: Optional[str] = Form("System"), department: Optional[str] = Form("General"), career: Optional[str] = Form(""), characteristics: Optional[str] = Form("")):
    os.makedirs("data/uploads", exist_ok=True)
    
    file_locations = []
    filenames = []
    
    for file in files:
        file_location = f"data/uploads/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        file_locations.append(file_location)
        filenames.append(file.filename)
        
    background_tasks.add_task(process_ingestion, file_locations, filenames, project_id, author_id, author, department, career, characteristics)
    
    return {
        "status": "processing", 
        "message": "ドキュメントの解析をバックグラウンドで開始しました。画面を移動しても処理は継続されます。",
        "files": filenames
    }
