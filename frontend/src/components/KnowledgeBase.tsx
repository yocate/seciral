import React, { useEffect, useState } from 'react';
import { Database, FileText, Calendar, Loader2 } from 'lucide-react';
import './KnowledgeBase.css';

interface Document {
  id: number;
  filename: string;
  content: string;
  extracted_at: string;
  is_valid: number;
}

export const KnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/documents');
        const data = await response.json();
        if (data.status === 'success') {
          setDocuments(data.documents);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
  }, []);

  const handleInvalidate = async (docId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/documents/${docId}/invalidate`, {
        method: 'PUT'
      });
      if (response.ok) {
        setDocuments(prev => prev.map(doc => doc.id === docId ? { ...doc, is_valid: 0 } : doc));
        if (selectedDoc?.id === docId) {
          setSelectedDoc(prev => prev ? { ...prev, is_valid: 0 } : null);
        }
      }
    } catch (error) {
      console.error('Failed to invalidate document:', error);
    }
  };

  return (
    <div className="knowledge-base-container animate-fade-in">
      <div className="kb-header">
        <h2>ナレッジ管理 (Knowledge Base)</h2>
        <p>インジェストされた組織の記憶・情報資産の一覧</p>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <Loader2 className="spinning-icon" size={32} />
          <p>ナレッジを読み込み中...</p>
        </div>
      ) : (
        <div className="kb-content">
          <div className="document-list glass-panel">
            <h3><Database size={18} /> 登録済みドキュメント ({documents.length})</h3>
            {documents.length === 0 ? (
              <p className="empty-state">まだナレッジが登録されていません。「ナレッジ取込」からファイルをアップロードしてください。</p>
            ) : (
              <ul>
                {documents.map(doc => (
                  <li 
                    key={doc.id} 
                    className={`doc-item ${selectedDoc?.id === doc.id ? 'active' : ''} ${doc.is_valid === 0 ? 'invalidated' : ''}`}
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <FileText size={18} className="doc-icon" />
                    <div className="doc-info">
                      <span className="doc-name" style={{ textDecoration: doc.is_valid === 0 ? 'line-through' : 'none' }}>
                        {doc.filename}
                      </span>
                      <span className="doc-date">
                        <Calendar size={12} /> 
                        {new Date(doc.extracted_at).toLocaleString('ja-JP')}
                        {doc.is_valid === 0 && <span className="invalid-badge">無効</span>}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="document-viewer glass-panel">
            {selectedDoc ? (
              <>
                <div className="viewer-header">
                  <div className="viewer-title-row">
                    <h3>{selectedDoc.filename}</h3>
                    {selectedDoc.is_valid === 1 ? (
                      <button 
                        className="btn-invalidate" 
                        onClick={() => handleInvalidate(selectedDoc.id)}
                      >
                        このナレッジを無効化
                      </button>
                    ) : (
                      <span className="invalid-label">※このナレッジは無効化されています</span>
                    )}
                  </div>
                  <span className="viewer-meta">抽出日時: {new Date(selectedDoc.extracted_at).toLocaleString('ja-JP')}</span>
                </div>
                <div className="viewer-body">
                  <pre className="extracted-text">{selectedDoc.content}</pre>
                </div>
              </>
            ) : (
              <div className="empty-viewer">
                <FileText size={48} />
                <p>左側のリストからドキュメントを選択すると、抽出されたナレッジ（テキスト）が表示されます。</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
