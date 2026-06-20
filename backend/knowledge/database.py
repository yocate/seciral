from sqlite_utils import Database
import os
import datetime

DB_PATH = "data/knowledge.db"

def init_db(create_tables=False):
    os.makedirs("data", exist_ok=True)
    db = Database(DB_PATH)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=NORMAL")
    
    if not create_tables:
        return db
        
    if "documents" not in db.table_names():
        db["documents"].create({
            "id": int,
            "filename": str,
            "content": str,
            "summary": str,
            "extracted_at": str,
            "is_valid": int,
            "reference_count": int,
            "project_id": str  # null means global
        }, pk="id")
        
    if "projects" not in db.table_names():
        db["projects"].create({
            "id": str,
            "name": str,
            "description": str,
            "created_at": str
        }, pk="id")
        
    if "project_documents" not in db.table_names():
        db["project_documents"].create({
            "project_id": str,
            "document_id": int,
            "linked_at": str
        })
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_project_docs ON project_documents(project_id, document_id)")
        
    if "graph_nodes" not in db.table_names():
        db["graph_nodes"].create({
            "project_id": str,
            "id": str,
            "name": str,
            "group": str,
            "layer": str,
            "author": str,
            "department": str,
            "updated_at": str,
            "valid_from": str,
            "valid_to": str,
            "source_type": str,
            "feedback_score": int
        })
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_nodes ON graph_nodes(project_id, id)")
    else:
        try:
            db.execute("ALTER TABLE graph_nodes ADD COLUMN valid_from TEXT")
            db.execute("ALTER TABLE graph_nodes ADD COLUMN valid_to TEXT")
            db.execute("ALTER TABLE graph_nodes ADD COLUMN source_type TEXT DEFAULT 'chat'")
            db.execute("ALTER TABLE graph_nodes ADD COLUMN feedback_score INTEGER DEFAULT 0")
        except Exception:
            pass

    if "graph_edges" not in db.table_names():
        db["graph_edges"].create({
            "project_id": str,
            "source": str,
            "target": str,
            "label": str,
            "confidence": int,
            "author": str,
            "department": str,
            "updated_at": str,
            "valid_from": str,
            "valid_to": str,
            "source_type": str,
            "feedback_score": int
        })
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_graph_edges ON graph_edges(project_id, source, target)")
    else:
        try:
            db.execute("ALTER TABLE graph_edges ADD COLUMN valid_from TEXT")
            db.execute("ALTER TABLE graph_edges ADD COLUMN valid_to TEXT")
            db.execute("ALTER TABLE graph_edges ADD COLUMN source_type TEXT DEFAULT 'chat'")
            db.execute("ALTER TABLE graph_edges ADD COLUMN feedback_score INTEGER DEFAULT 0")
        except Exception:
            pass

    if "users" not in db.table_names():
        db["users"].create({
            "id": str,
            "email": str,
            "password_hash": str,
            "display_name": str,
            "department": str,
            "career": str,
            "characteristics": str,
            "big5_openness": int,
            "big5_conscientiousness": int,
            "big5_extraversion": int,
            "big5_agreeableness": int,
            "big5_neuroticism": int,
            "strategic_persona": str,
            "mbti_type": str,
            "created_at": str
        }, pk="id")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)")
    else:
        try:
            db.execute("ALTER TABLE users ADD COLUMN mbti_type TEXT")
        except Exception:
            pass

    if "utilized_frameworks" not in db.table_names():
        db["utilized_frameworks"].create({
            "id": str,
            "name": str,
            "description": str,
            "reference_count": int,
            "updated_at": str
        }, pk="id")

    if "insights" not in db.table_names():
        db["insights"].create({
            "id": int,
            "data": str,
            "updated_at": str
        }, pk="id")

    if "templates" not in db.table_names():
        db["templates"].create({
            "id": str,
            "name": str,
            "description": str,
            "system_prompt": str,
            "output_format": str
        }, pk="id")
        seed_templates(db)

    else:
        # Migrate existing table if needed
        if "summary" not in db["documents"].columns_dict:
            db["documents"].add_column("summary", str)
        if "reference_count" not in db["documents"].columns_dict:
            db["documents"].add_column("reference_count", int)
            db.execute("UPDATE documents SET reference_count = 0")
        if "is_valid" not in db["documents"].columns_dict:
            db["documents"].add_column("is_valid", int)
            db.execute("UPDATE documents SET is_valid = 1")
        if "project_id" not in db["documents"].columns_dict:
            db["documents"].add_column("project_id", str)
            
        if "author" not in db["graph_nodes"].columns_dict:
            db["graph_nodes"].add_column("author", str)
        if "department" not in db["graph_nodes"].columns_dict:
            db["graph_nodes"].add_column("department", str)
            
        if "author" not in db["graph_edges"].columns_dict:
            db["graph_edges"].add_column("author", str)
        if "department" not in db["graph_edges"].columns_dict:
            db["graph_edges"].add_column("department", str)
        if "confidence" not in db["graph_edges"].columns_dict:
            db["graph_edges"].add_column("confidence", int)
            db.execute("UPDATE graph_edges SET confidence = 5")
            
        if "big5_openness" not in db["users"].columns_dict:
            db["users"].add_column("big5_openness", int)
            db["users"].add_column("big5_conscientiousness", int)
            db["users"].add_column("big5_extraversion", int)
            db["users"].add_column("big5_agreeableness", int)
            db["users"].add_column("big5_neuroticism", int)
            db["users"].add_column("strategic_persona", str)
            
    return db

def seed_templates(db):
    templates = [
        {
            "id": "tpl_strategy",
            "name": "事業戦略書",
            "description": "市場環境・競合優位性から導き出される事業戦略を策定します",
            "system_prompt": "あなたは一流の戦略コンサルタントです。事業戦略書を作成するために、現状の課題、ターゲット市場、競合との差別化要因、および具体的な打ち手についてユーザーから情報を引き出してください。質問は1度に1つずつ行い、深掘りしてください。",
            "output_format": "# 事業戦略書\n\n## 1. 経営・事業課題\n[内容]\n\n## 2. ターゲット市場・顧客\n[内容]\n\n## 3. 競合優位性（強み）\n[内容]\n\n## 4. 戦略の方向性と具体策\n[内容]"
        },
        {
            "id": "tpl_project_plan",
            "name": "プロジェクト計画書",
            "description": "システム開発や施策実行のための体制・スケジュール・予算の計画書",
            "system_prompt": "あなたは経験豊富なプロジェクトマネージャーです。プロジェクト計画書を作成するために、プロジェクトの目的、スコープ（対象範囲）、必要なリソース（予算・人員）、および想定スケジュールについてユーザーに質問してください。",
            "output_format": "# プロジェクト計画書\n\n## 1. プロジェクトの目的と背景\n[内容]\n\n## 2. 対象スコープ\n[内容]\n\n## 3. 体制とリソース\n[内容]\n\n## 4. マイルストーン・スケジュール\n[内容]"
        }
    ]
    for t in templates:
        db["templates"].insert(t, ignore=True)

def save_knowledge(filename: str, text: str, project_id: str = None, summary: str = ""):
    db = init_db()
    
    # 常に共有ナレッジとして保存 (project_id列は互換性のためnullにするか無視)
    doc_id = db["documents"].insert({
        "filename": filename,
        "content": text,
        "summary": summary,
        "extracted_at": datetime.datetime.now().isoformat(),
        "is_valid": 1,
        "reference_count": 0,
        "project_id": None
    }).last_pk
    
    # プロジェクト指定があれば紐付け
    if project_id:
        link_document_to_project(doc_id, project_id)
        
    return doc_id
        
def link_document_to_project(doc_id: int, project_id: str):
    db = init_db()
    db["project_documents"].insert({
        "project_id": project_id,
        "document_id": doc_id,
        "linked_at": datetime.datetime.now().isoformat()
    }, ignore=True)
    
def invalidate_document(doc_id: int):
    db = init_db()
    db["documents"].update(doc_id, {"is_valid": 0})
    
def rename_document(doc_id: int, new_filename: str):
    db = init_db()
    db["documents"].update(doc_id, {"filename": new_filename})
    
def delete_document_physically(doc_id: int):
    db = init_db()
    # 紐付けデータ（中間テーブル）からも削除
    if "project_documents" in db.table_names():
        db.execute("DELETE FROM project_documents WHERE document_id = ?", [doc_id])
    # 本体の削除
    db["documents"].delete(doc_id)
    
def get_all_documents(project_id: str = None):
    db = init_db()
    docs = list(db["documents"].rows)
    
    if project_id:
        # プロジェクトに紐づくドキュメントIDを取得
        if "project_documents" in db.table_names():
            linked = list(db.query("SELECT document_id FROM project_documents WHERE project_id = ?", [project_id]))
            linked_ids = {r["document_id"] for r in linked}
            
            # 旧仕様の直接紐付けも一応サポート（後方互換）
            docs = [d for d in docs if d["id"] in linked_ids or d.get("project_id") == project_id]
        else:
            docs = [d for d in docs if d.get("project_id") == project_id]
            
    return docs

def increment_reference_count(doc_ids: list[int]):
    db = init_db()
    if not doc_ids:
        return
    placeholders = ",".join(["?"] * len(doc_ids))
    db.execute(f"UPDATE documents SET reference_count = COALESCE(reference_count, 0) + 1 WHERE id IN ({placeholders})", doc_ids)
    db.conn.commit()

def get_top_referenced_documents(limit: int = 5):
    db = init_db()
    return list(db.query(f"SELECT id, filename, summary, reference_count, extracted_at FROM documents WHERE is_valid = 1 ORDER BY COALESCE(reference_count, 0) DESC, extracted_at DESC LIMIT ?", [limit]))

def get_dashboard_stats():
    db = init_db()
    
    # 有効なドキュメント数
    docs_count = 0
    if "documents" in db.table_names():
        docs_count = list(db.query("SELECT COUNT(*) as c FROM documents WHERE is_valid = 1"))[0]["c"]
        
    # プロジェクト数
    projects_count = 0
    if "projects" in db.table_names():
        projects_count = list(db.query("SELECT COUNT(*) as c FROM projects"))[0]["c"]
        
    # ノード数
    nodes_count = 0
    if "graph_nodes" in db.table_names():
        nodes_count = list(db.query("SELECT COUNT(*) as c FROM graph_nodes"))[0]["c"]
        
    # エッジ数
    edges_count = 0
    if "graph_edges" in db.table_names():
        edges_count = list(db.query("SELECT COUNT(*) as c FROM graph_edges"))[0]["c"]
        
    return {
        "total_documents": docs_count,
        "total_projects": projects_count,
        "total_nodes": nodes_count,
        "total_edges": edges_count
    }

# Project Management
def create_project(project_id: str, name: str, description: str = ""):
    db = init_db()
    now = datetime.datetime.utcnow().isoformat() + "Z"
    db["projects"].insert({
        "id": project_id,
        "name": name,
        "description": description,
        "created_at": now
    })

def update_project(project_id: str, name: str, description: str = ""):
    db = init_db()
    table = db["projects"]
    project = table.get(project_id)
    if project:
        table.update(project_id, {
            "name": name,
            "description": description
        })
        return table.get(project_id)
    return None

def get_all_projects():
    db = init_db()
    if "projects" not in db.table_names():
        return []
    return list(db["projects"].rows)

def get_project(project_id: str):
    db = init_db()
    try:
        return db["projects"].get(project_id)
    except Exception:
        return None

# Template Management
def get_all_templates():
    db = init_db()
    if "templates" not in db.table_names():
        return []
    return list(db["templates"].rows)

def get_template(template_id: str):
    db = init_db()
    try:
        return db["templates"].get(template_id)
    except Exception:
        return None

# Graph Management (Incremental)
def save_graph_incremental(project_id: str, graph_data: dict):
    db = init_db()
    now = datetime.datetime.now().isoformat()
    
    author = graph_data.get("author", "System")
    department = graph_data.get("department", "General")
    
    # Upsert nodes
    for node in graph_data.get("nodes", []):
        db["graph_nodes"].upsert({
            "project_id": project_id,
            "id": node.get("id", ""),
            "name": node.get("name", ""),
            "group": node.get("group", ""),
            "layer": node.get("layer", "specific"),
            "author": author,
            "department": department,
            "updated_at": now,
            "valid_from": node.get("valid_from", now),
            "source_type": node.get("source_type", "chat"),
            "feedback_score": node.get("feedback_score", 0)
        }, pk=["project_id", "id"])
        
    # Upsert edges
    for edge in graph_data.get("links", []):
        db["graph_edges"].upsert({
            "project_id": project_id,
            "source": edge.get("source", ""),
            "target": edge.get("target", ""),
            "label": edge.get("label", ""),
            "author": author,
            "department": department,
            "confidence": edge.get("confidence") if edge.get("confidence") is not None else 5,
            "updated_at": now,
            "valid_from": edge.get("valid_from", now),
            "source_type": edge.get("source_type", "chat"),
            "feedback_score": edge.get("feedback_score", 0)
        }, pk=["project_id", "source", "target"])
        
    # Upsert frameworks
    for fw in graph_data.get("frameworks", []):
        name = fw.get("name", "").strip()
        if not name:
            continue
        fw_id = name.lower().replace(" ", "_")
        
        # Check if exists to increment
        existing = db["utilized_frameworks"].get(fw_id) if fw_id in [r["id"] for r in db["utilized_frameworks"].rows] else None
        
        count = existing["reference_count"] + 1 if existing else 1
        desc = fw.get("description", "")
        if existing and not desc:
            desc = existing["description"]
            
        db["utilized_frameworks"].upsert({
            "id": fw_id,
            "name": name,
            "description": desc,
            "reference_count": count,
            "updated_at": now,
            "priority": existing["priority"] if existing and "priority" in existing else "拡張"
        }, pk="id")

def get_graph(project_id: str):
    db = init_db()
    
    if "graph_nodes" not in db.table_names():
        return {"nodes": [], "links": []}
        
    nodes = list(db.query("""
        SELECT n.id, n.name, n.`group`, n.layer, n.author, n.department, u.strategic_persona, n.valid_from, n.valid_to, n.source_type, n.feedback_score
        FROM graph_nodes n 
        LEFT JOIN users u ON n.author = u.display_name 
        WHERE n.project_id = ?
    """, [project_id]))
    
    links = list(db.query("""
        SELECT e.source, e.target, e.label, e.author, e.department, e.confidence, u.strategic_persona, e.valid_from, e.valid_to, e.source_type, e.feedback_score
        FROM graph_edges e 
        LEFT JOIN users u ON e.author = u.display_name 
        WHERE e.project_id = ?
    """, [project_id]))
    
    # フロントエンドの描画エラーを防ぐため、ノードが存在しないリンクをフィルタリング
    node_ids = {n["id"] for n in nodes}
    valid_links = [l for l in links if l["source"] in node_ids and l["target"] in node_ids]
    
    return {
        "nodes": nodes,
        "links": valid_links
    }

def get_utilized_frameworks(limit: int = 10):
    db = init_db()
    if "utilized_frameworks" not in db.table_names():
        return []
    return list(db.query(f"SELECT id, name, description, reference_count, updated_at, priority FROM utilized_frameworks ORDER BY reference_count DESC LIMIT ?", [limit]))


def get_all_frameworks():
    db = init_db()
    if "utilized_frameworks" not in db.table_names():
        return []
    return list(db.query("SELECT id, name, description, reference_count, updated_at, priority FROM utilized_frameworks ORDER BY updated_at DESC"))

def add_framework(name: str, description: str):
    db = init_db()
    fw_id = name.lower().replace(" ", "_")
    now = datetime.datetime.now().isoformat()
    
    existing = db["utilized_frameworks"].get(fw_id) if fw_id in [r["id"] for r in db["utilized_frameworks"].rows] else None
    count = existing["reference_count"] if existing else 0
    
    db["utilized_frameworks"].upsert({
        "id": fw_id,
        "name": name,
        "description": description,
        "reference_count": count,
        "updated_at": now,
        "priority": "拡張" # デフォルトは拡張とする
    }, pk="id")
    return {"id": fw_id, "name": name, "description": description}

def update_framework(fw_id: str, name: str, description: str):
    db = init_db()
    now = datetime.datetime.now().isoformat()
    db["utilized_frameworks"].update(fw_id, {
        "name": name,
        "description": description,
        "updated_at": now
    })

def delete_framework(fw_id: str):
    db = init_db()
    db["utilized_frameworks"].delete(fw_id)

# --- User Auth Management ---

def create_user(user_id: str, email: str, password_hash: str, display_name: str, department: str, career: str, characteristics: str):
    db = init_db()
    db["users"].insert({
        "id": user_id,
        "email": email,
        "password_hash": password_hash,
        "display_name": display_name,
        "department": department,
        "career": career,
        "characteristics": characteristics,
        "created_at": datetime.datetime.now().isoformat()
    })

def get_user_by_email(email: str):
    db = init_db()
    results = list(db["users"].rows_where("email = ?", [email]))
    return results[0] if results else None

def get_user_by_id(user_id: str):
    db = init_db()
    try:
        return db["users"].get(user_id)
    except Exception:
        return None

def update_user_profile(user_id: str, display_name: str = None, department: str = None, career: str = None, characteristics: str = None,
                        big5_openness: int = None, big5_conscientiousness: int = None, big5_extraversion: int = None,
                        big5_agreeableness: int = None, big5_neuroticism: int = None, strategic_persona: str = None,
                        mbti_type: str = None):
    db = init_db()
    update_data = {}
    if display_name is not None: update_data["display_name"] = display_name
    if department is not None: update_data["department"] = department
    if career is not None: update_data["career"] = career
    if characteristics is not None: update_data["characteristics"] = characteristics
    if big5_openness is not None: update_data["big5_openness"] = big5_openness
    if big5_conscientiousness is not None: update_data["big5_conscientiousness"] = big5_conscientiousness
    if big5_extraversion is not None: update_data["big5_extraversion"] = big5_extraversion
    if big5_agreeableness is not None: update_data["big5_agreeableness"] = big5_agreeableness
    if big5_neuroticism is not None: update_data["big5_neuroticism"] = big5_neuroticism
    if strategic_persona is not None: update_data["strategic_persona"] = strategic_persona
    if mbti_type is not None: update_data["mbti_type"] = mbti_type
    
    if update_data:
        db["users"].update(user_id, update_data)

# --- Insights Persistence ---

def save_latest_insight(insight_json: str):
    db = init_db()
    # Always use id=1 to keep only the latest
    db["insights"].upsert({
        "id": 1,
        "data": insight_json,
        "updated_at": datetime.datetime.now().isoformat()
    }, pk="id")

def get_latest_insight():
    db = init_db()
    try:
        row = db["insights"].get(1)
        return row["data"]
    except Exception:
        return None
