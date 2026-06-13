from fastapi import FastAPI, UploadFile, File
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import shutil

app = FastAPI(title="Strategy Intelligence Platform (SIP) API")

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DiagnosticRequest(BaseModel):
    user_input: str

@app.get("/")
def read_root():
    return {"message": "Welcome to Strategy Intelligence Platform (SIP) API"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/documents")
def get_documents():
    from knowledge.database import get_all_documents
    try:
        docs = get_all_documents()
        return {"status": "success", "documents": docs}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.put("/api/documents/{doc_id}/invalidate")
def invalidate_document_endpoint(doc_id: int):
    from knowledge.database import invalidate_document
    try:
        invalidate_document(doc_id)
        return {"status": "success", "message": f"Document {doc_id} invalidated"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/ingest")
async def ingest_knowledge(files: List[UploadFile] = File(...)):
    import time
    from knowledge.extractor import extract_text
    from knowledge.database import save_knowledge

    os.makedirs("data/uploads", exist_ok=True)
    
    extracted_data = []
    
    for file in files:
        file_location = f"data/uploads/{file.filename}"
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        # Extract text
        text = extract_text(file_location)
        if text:
            # Save to lightweight DB (SQLite)
            save_knowledge(file.filename, text)
            extracted_data.append(file.filename)

    # Simulate final processing
    time.sleep(1) 
    return {
        "status": "success", 
        "message": f"{len(extracted_data)} files ingested successfully",
        "files": extracted_data
    }

@app.post("/api/diagnostic")
def run_diagnostic(request: DiagnosticRequest):
    # Mocking the diagnostic response for MVP
    return {
        "reply": f"「{request.user_input}」ですね。組織の文脈をさらに深掘りするため、主要な課題はどこにあるとお考えですか？",
        "next_step": "question_2"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
