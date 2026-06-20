from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from langchain_core.messages import HumanMessage
import datetime
from agents.diagnostic_agent import get_agent

router = APIRouter()

class ReviewRequest(BaseModel):
    session_id: str
    deliverable_text: str
    author_id: Optional[str] = None
from fastapi import APIRouter, HTTPException, BackgroundTasks, UploadFile, File
import os
import shutil

@router.post("/review/extract")
async def extract_review_text(file: UploadFile = File(...)):
    try:
        from knowledge.extractor import extract_text
        os.makedirs("data/uploads", exist_ok=True)
        file_location = f"data/uploads/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        text = extract_text(file_location)
        if not text:
            raise ValueError("Could not extract text from file")
            
        return {"status": "success", "extracted_text": text}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/review")
def review_deliverable(request: ReviewRequest, background_tasks: BackgroundTasks):
    try:
        from knowledge.database import get_graph as db_get_graph, get_all_documents
        from knowledge.vectorstore import retrieve_relevant_chunks
        
        agent = get_agent()
        config = {"configurable": {"thread_id": request.session_id}}
        
        # 1. 成果物のコンテキスト
        review_context = f"【ユーザーからのレビュー依頼（成果物）】\n{request.deliverable_text}\n\nこの成果物に対して、現在のTemporal Knowledge Graphと過去の知見に基づき、矛盾の指摘や抜け漏れの発見、品質向上のための問いかけを行ってください。"
        
        # 2. ナレッジグラフの取得
        graph_data = db_get_graph("global")
        graph_context = ""
        if graph_data and graph_data.get("nodes"):
            import main
            graph_context = f"\n\n【Temporal Knowledge Graph（現在の組織の知見と提供元）】\n{main.format_graph_for_llm(graph_data)}"
            
        final_message = review_context + graph_context
        
        # 実行
        result = agent.invoke({"messages": [HumanMessage(content=final_message)]}, config=config)
        last_message = result["messages"][-1]
        
        # バックグラウンドで自動的にナレッジグラフを抽出・更新する
        def auto_extract_graph_review():
            try:
                from agents.graph_extractor import extract_graph
                from knowledge.database import save_graph_incremental, get_user_by_id
                
                # 直近のやり取りをテキスト化
                history_text = f"User (成果物): {request.deliverable_text}\nAI (レビュー): {last_message.content}"
                
                # 既存グラフの取得 (メインの関数から流用する形)
                import main
                current_graph_text = main.format_graph_for_llm(graph_data) if graph_data else ""
                
                strategic_persona = ""
                author_name = "System"
                department = "General"
                if request.author_id:
                    user = get_user_by_id(request.author_id)
                    if user:
                        strategic_persona = user.get("strategic_persona", "")
                        author_name = user.get("display_name", "System")
                        department = user.get("department", "General")
                
                graph_data_extracted = extract_graph(
                    session_id=request.session_id,
                    input_text=history_text,
                    current_graph_text=current_graph_text,
                    input_type="DeliverableReview",
                    strategic_persona=strategic_persona
                )
                
                if graph_data_extracted:
                    save_graph_incremental(
                        session_id=request.session_id,
                        nodes=graph_data_extracted.get("nodes", []),
                        links=graph_data_extracted.get("links", []),
                        author_id=request.author_id,
                        author_name=author_name,
                        department=department,
                        source_type="deliverable"
                    )
            except Exception as bg_e:
                print(f"Background Graph Extraction Error (Review): {bg_e}")

        background_tasks.add_task(auto_extract_graph_review)
        
        return {"status": "success", "reply": last_message.content}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
