import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';

export interface Document {
  id: number;
  filename: string;
}

export const useProjectDocs = (sessionId: string | null) => {
  const [projectDocs, setProjectDocs] = useState<Document[]>([]);
  const [globalDocs, setGlobalDocs] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents?project_id=${sessionId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setProjectDocs(data.documents);
      }
    } catch (e) {
      console.error('Failed to fetch docs', e);
    }
  }, [sessionId]);

  const fetchGlobalDocs = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents`);
      const data = await res.json();
      if (data.status === 'success') {
        const existingIds = new Set((projectDocs || []).map(d => d.id));
        const availableDocs = (data.documents || []).filter((d: Document) => !existingIds.has(d.id));
        setGlobalDocs(availableDocs);
      }
    } catch (error) {
      console.error("Failed to fetch global documents", error);
    }
  };

  const uploadDocs = async (files: FileList) => {
    if (!sessionId || files.length === 0) return false;
    setIsUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });
    formData.append('project_id', sessionId);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ingest`, {
        method: 'POST',
        body: formData,
      });
      if (response.ok) {
        await fetchDocs();
        return true;
      }
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
    }
    return false;
  };

  const linkGlobalDocs = async (docIds: Set<number>) => {
    if (!sessionId || docIds.size === 0) return false;
    setIsLinking(true);
    try {
      for (const docId of Array.from(docIds)) {
        await fetch(`${API_BASE_URL}/api/projects/${sessionId}/documents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_id: docId })
        });
      }
      await fetchDocs();
      return true;
    } catch (e) {
      console.error("Failed to link documents", e);
    } finally {
      setIsLinking(false);
    }
    return false;
  };

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  return { projectDocs, globalDocs, isUploading, isLinking, fetchDocs, fetchGlobalDocs, uploadDocs, linkGlobalDocs };
};
