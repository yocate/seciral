from sqlite_utils import Database
import os
import datetime

DB_PATH = "data/knowledge.db"

def init_db():
    os.makedirs("data", exist_ok=True)
    db = Database(DB_PATH)
    if "documents" not in db.table_names():
        db["documents"].create({
            "id": int,
            "filename": str,
            "content": str,
            "extracted_at": str,
            "is_valid": int
        }, pk="id")
    else:
        # Migrate existing table if needed
        if "is_valid" not in db["documents"].columns_dict:
            db["documents"].add_column("is_valid", int)
            db.execute("UPDATE documents SET is_valid = 1")
    return db

def save_knowledge(filename: str, text: str):
    db = init_db()
    db["documents"].insert({
        "filename": filename,
        "content": text,
        "extracted_at": datetime.datetime.now().isoformat(),
        "is_valid": 1
    })
    
def invalidate_document(doc_id: int):
    db = init_db()
    db["documents"].update(doc_id, {"is_valid": 0})
    
def get_all_documents():
    db = init_db()
    return list(db["documents"].rows)
