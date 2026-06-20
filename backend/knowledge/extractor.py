import pymupdf4llm
import os
from bs4 import BeautifulSoup

def extract_text(file_path: str) -> str:
    """Extract text from supported file formats."""
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    
    text = ""
    try:
        if ext == '.pdf':
            text = pymupdf4llm.to_markdown(file_path)
        elif ext in ['.txt', '.md', '.csv']:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        elif ext in ['.html', '.htm']:
            with open(file_path, 'r', encoding='utf-8') as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
                text = soup.get_text(separator='\n', strip=True)
        else:
            # Fallback for unsupported formats in MVP
            text = f"[Unsupported Format: {ext}]"
    except Exception as e:
        print(f"Error extracting text from {file_path}: {e}")
    
    return text.strip()
