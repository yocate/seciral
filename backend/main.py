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
    init_db, save_graph_incremental, get_graph as db_get_graph, 
    get_all_documents,
    rename_document, get_all_projects, get_project as get_project_db, create_project, update_project,
    link_document_to_project,
    get_top_referenced_documents, get_dashboard_stats,
    get_utilized_frameworks, get_all_frameworks, add_framework, invalidate_document, delete_document_physically,
    get_all_templates, get_template, save_knowledge, increment_reference_count
)
from knowledge.vectorstore import delete_document_from_vectorstore, ingest_document_to_vectorstore, retrieve_relevant_chunks
from knowledge.extractor import extract_text
from agents.diagnostic_agent import get_agent
from agents.graph_extractor import extract_graph
from knowledge.database import create_user, get_user_by_email, get_user_by_id, update_user_profile, save_latest_insight, get_latest_insight
import bcrypt
import jwt
import datetime

load_dotenv()

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "super-secret-key-for-sip-auth")
ALGORITHM = "HS256"

# Initialize global LLM cache to reduce API costs
os.makedirs("data", exist_ok=True)
set_llm_cache(SQLiteCache(database_path="data/llm_cache.db"))


app = FastAPI(title="Strategy Intelligence Platform (SIP) API")

@app.on_event("startup")
def on_startup():
    print("Initializing Database...")
    init_db(create_tables=True)

# CORS middleware for frontend communication
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:5173")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.review import router as review_router
app.include_router(review_router, prefix="/api")

# --- Helpers ---
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
    return "\\n".join([f"{m.type}: {m.content}" for m in messages])

def get_api_key():
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return key


class DiagnosticRequest(BaseModel):
    message: str
    session_id: str
    template_id: Optional[str] = "default_session"
    author_id: Optional[str] = None

class GraphGenerateRequest(BaseModel):
    session_id: str = "default_session"

class ProjectCreateRequest(BaseModel):
    name: str
    description: str = ""

@app.get("/")
def read_root():
    return {"message": "Welcome to Strategy Intelligence Platform (SIP) API"}

from routers.documents import router as documents_router
app.include_router(documents_router)

from routers.dashboard import router as dashboard_router
app.include_router(dashboard_router)

from routers.knowledge import router as knowledge_router
app.include_router(knowledge_router)

# --- Auth API ---

from routers.auth import router as auth_router
app.include_router(auth_router)


# --- Original APIs ---

from routers.projects import router as projects_router
app.include_router(projects_router)



from routers.diagnostic import router as diagnostic_router
app.include_router(diagnostic_router)




if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
