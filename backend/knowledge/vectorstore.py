import os
from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

CHROMA_PERSIST_DIR = "data/chroma_db"

def get_embeddings():
    # Use HuggingFace local embedding model (completely free, runs locally)
    return HuggingFaceEmbeddings(model_name="intfloat/multilingual-e5-small")

def get_vectorstore():
    embeddings = get_embeddings()
    # Initialize Chroma vector store
    vectorstore = Chroma(
        collection_name="sip_knowledge",
        embedding_function=embeddings,
        persist_directory=CHROMA_PERSIST_DIR
    )
    return vectorstore

def ingest_document_to_vectorstore(doc_id: int, filename: str, content: str):
    """Chunks the document text and stores it in the vector DB."""
    vectorstore = get_vectorstore()
    
    # Text splitter config
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    
    chunks = text_splitter.split_text(content)
    
    # Metadata for each chunk
    metadatas = [{"document_id": doc_id, "filename": filename} for _ in chunks]
    ids = [f"doc_{doc_id}_chunk_{i}" for i in range(len(chunks))]
    
    # Add to Chroma
    if chunks:
        vectorstore.add_texts(texts=chunks, metadatas=metadatas, ids=ids)

def delete_document_from_vectorstore(doc_id: int):
    """Deletes all chunks related to the document from the vector DB."""
    vectorstore = get_vectorstore()
    vectorstore._collection.delete(where={"document_id": doc_id})

def retrieve_relevant_chunks(query: str, project_document_ids: list[int] = None, k: int = 5):
    """Retrieves top k chunks related to the query, optionally filtered by document IDs."""
    vectorstore = get_vectorstore()
    
    filter_dict = None
    if project_document_ids is not None:
        if len(project_document_ids) == 0:
            return [] # No docs to search
        elif len(project_document_ids) == 1:
            filter_dict = {"document_id": project_document_ids[0]}
        else:
            filter_dict = {"document_id": {"$in": project_document_ids}}

    results = vectorstore.similarity_search(query, k=k, filter=filter_dict)
    return results
