from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from knowledge.database import (
    get_all_documents, get_top_referenced_documents, invalidate_document,
    delete_document_physically, rename_document
)
from knowledge.vectorstore import delete_document_from_vectorstore

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.get("")
def get_documents(project_id: Optional[str] = None):
    docs = get_all_documents(project_id)
    # Filter valid docs
    docs = [d for d in docs if d.get("is_valid", 1) == 1]
    return {"status": "success", "documents": docs}

@router.get("/ranking")
def get_documents_ranking(limit: int = 5):
    try:
        ranking = get_top_referenced_documents(limit)
        return {"status": "success", "ranking": ranking}
    except Exception as e:
        print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}

@router.put("/{doc_id}/invalidate")
def invalidate_document_endpoint(doc_id: int):
    try:
        invalidate_document(doc_id)
        return {"status": "success", "message": f"Document {doc_id} invalidated"}
    except Exception as e:
        print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}

@router.delete("/{doc_id}")
def delete_document_endpoint(doc_id: int):
    try:
        delete_document_physically(doc_id)
        delete_document_from_vectorstore(doc_id)
        return {"status": "success", "message": f"Document {doc_id} permanently deleted"}
    except Exception as e:
        print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}

class RenameDocumentRequest(BaseModel):
    filename: str

@router.put("/{doc_id}/rename")
def rename_document_endpoint(doc_id: int, request: RenameDocumentRequest):
    try:
        rename_document(doc_id, request.filename)
        return {"status": "success", "message": f"Document {doc_id} renamed to {request.filename}"}
    except Exception as e:
        print(f"API Error: {e}"); return {"status": "error", "message": "An internal server error occurred."}
