import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../api';
import { Database, FileText, Calendar, Loader2, BookOpen, Plus, ChevronDown, ChevronUp, Search, Download } from 'lucide-react';
import { KnowledgeIngestion } from './KnowledgeIngestion';
import './KnowledgeBase.css';

interface Document {
  id: number;
  filename: string;
  content: string;
  summary?: string;
  extracted_at: string;
  is_valid: number;
}


interface Framework {
  id: string;
  name: string;
  description: string;
  reference_count: number;
}

const FrameworkManagement: React.FC = () => {
  const [frameworks, setFrameworks] = useState<Framework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFwId, setEditingFwId] = useState<string | null>(null);
  const [editFwName, setEditFwName] = useState("");
  const [editFwDesc, setEditFwDesc] = useState("");

  const fetchFrameworks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/frameworks`);
      const data = await res.json();
      if (data.status === 'success') setFrameworks(data.frameworks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFrameworks();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDesc.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/frameworks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setShowAddForm(false);
        setNewName("");
        setNewDesc("");
        fetchFrameworks();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFwDelete = async (fwId: string) => {
    if (!window.confirm("このフレームワークを削除してもよろしいですか？")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/frameworks/${fwId}`, { method: 'DELETE' });
      if (res.ok) {
        setFrameworks(prev => prev.filter(fw => fw.id !== fwId));
      } else {
        alert("削除に失敗しました");
      }
    } catch (error) {
      console.error(error);
      alert("削除でエラーが発生しました");
    }
  };

  const handleFwUpdateSubmit = async (fwId: string) => {
    if (!editFwName.trim() || !editFwDesc.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/frameworks/${fwId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editFwName.trim(), description: editFwDesc.trim() })
      });
      if (res.ok) {
        setFrameworks(prev => prev.map(fw => fw.id === fwId ? { ...fw, name: editFwName.trim(), description: editFwDesc.trim() } : fw));
        setEditingFwId(null);
      } else {
        alert("更新に失敗しました");
      }
    } catch (error) {
      console.error(error);
      alert("更新でエラーが発生しました");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>登録済みのフレームワーク</h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>AIが思考や分析に使用するナレッジの辞書です</p>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
        >
          <Plus size={18} /> {showAddForm ? 'キャンセル' : '手動で登録'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="glass-panel animate-fade-in" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <h4 style={{ margin: 0, color: '#334155' }}>新しいフレームワークを追加</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>フレームワーク名</label>
            <input 
              type="text" 
              value={newName} 
              onChange={e => setNewName(e.target.value)} 
              placeholder="例: PEST分析" 
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>説明・使い方</label>
            <textarea 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)} 
              placeholder="フレームワークの具体的な説明や、AIにどう使ってほしいかを記述します。" 
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '100px', resize: 'vertical' }}
              required
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ padding: '10px 24px' }}>
              {isSubmitting ? '登録中...' : '登録する'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}><Loader2 className="spinning-icon" size={24} /></div>
      ) : frameworks.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
          フレームワークが登録されていません
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {frameworks.map(fw => (
            <div key={fw.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {editingFwId === fw.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={editFwName} 
                    onChange={e => setEditFwName(e.target.value)} 
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
                  />
                  <textarea 
                    value={editFwDesc} 
                    onChange={e => setEditFwDesc(e.target.value)} 
                    style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button onClick={() => setEditingFwId(null)} style={{ padding: '4px 12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
                    <button onClick={() => handleFwUpdateSubmit(fw.id)} style={{ padding: '4px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>保存</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <BookOpen size={18} color="#2563eb" /> {fw.name}
                    </h4>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600 }}>
                        参照: {fw.reference_count}回
                      </div>
                    </div>
                  </div>
                  <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {fw.description}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '8px' }}>
                    <button 
                      onClick={() => { setEditingFwId(fw.id); setEditFwName(fw.name); setEditFwDesc(fw.description); }}
                      style={{ padding: '4px 10px', fontSize: '0.8rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}
                    >
                      編集
                    </button>
                    <button 
                      onClick={() => handleFwDelete(fw.id)}
                      style={{ padding: '4px 10px', fontSize: '0.8rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #f87171', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      削除
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const KnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [activeTab, setActiveTab] = useState<'docs' | 'frameworks'>('docs');
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleDocExpand = (docId: number) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/documents`);
        const data = await response.json();
        if (data.status === 'success') {
          setDocuments(data.documents || []);
        } else {
          setDocuments([]);
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
  }, []);

  const handleInvalidate = async (docId: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${docId}/invalidate`, {
        method: 'PUT'
      });
      if (response.ok) {
        setDocuments(prev => prev.map(doc => doc.id === docId ? { ...doc, is_valid: 0 } : doc));
      }
    } catch (error) {
      console.error('Failed to invalidate document:', error);
    }
  };

  const handleDeletePhysical = async (docId: number) => {
    if (!window.confirm('このナレッジを物理削除します。データはRDBおよびVectorDBから完全に消去され、すべてのプロジェクトの共有ナレッジからも削除されます。本当に削除しますか？')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setDocuments(prev => (prev || []).filter(doc => doc.id !== docId));
      } else {
        alert('物理削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to physically delete document:', error);
      alert('物理削除でエラーが発生しました');
    }
  };

  const handleRenameSubmit = async (docId: number) => {
    if (!editNameValue.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${docId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: editNameValue.trim() })
      });
      if (response.ok) {
        setDocuments(prev => prev.map(doc => doc.id === docId ? { ...doc, filename: editNameValue.trim() } : doc));
      }
    } catch (error) {
      console.error('Failed to rename document:', error);
    } finally {
      setEditingDocId(null);
    }
  };

  const downloadRawText = (doc: Document) => {
    const blob = new Blob([doc.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.filename}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = async () => {
    try {
      // 既存のエクスポートAPIを流用（全てのナレッジとフレームワークを含む）
      const res = await fetch(`${API_BASE_URL}/api/knowledge/export`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seciral_knowledge_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('エクスポートに失敗しました');
    }
  };

  return (
    <div className="knowledge-base-container animate-fade-in">
      <div className="kb-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>ナレッジエクスプローラー</h2>
          <p>組織の情報資産・ナレッジとフレームワークの管理</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            onClick={handleExportAll}
            style={{ padding: '8px 16px', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          >
            <Download size={16} /> 全データをエクスポート
          </button>
          {activeTab === 'docs' && <KnowledgeIngestion />}
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e2e8f0' }}>
        <button 
          onClick={() => setActiveTab('docs')}
          style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'docs' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'docs' ? '#2563eb' : '#64748b', fontWeight: activeTab === 'docs' ? 600 : 400, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <FileText size={18} /> ドキュメント管理
        </button>
        <button 
          onClick={() => setActiveTab('frameworks')}
          style={{ padding: '12px 16px', background: 'none', border: 'none', borderBottom: activeTab === 'frameworks' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'frameworks' ? '#2563eb' : '#64748b', fontWeight: activeTab === 'frameworks' ? 600 : 400, cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <BookOpen size={18} /> フレームワーク管理
        </button>
      </div>

      {activeTab === 'frameworks' ? (
        <FrameworkManagement />
      ) : isLoading ? (
        <div className="loading-state">
          <Loader2 className="spinning-icon" size={32} />
          <p>ナレッジを読み込み中...</p>
        </div>
      ) : (
        <div className="kb-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', flex: 1, paddingRight: '8px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="ドキュメント名で検索..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
            />
          </div>

          <div className="document-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {(!documents || documents.length === 0) ? (
              <div className="empty-state glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 24px' }}>
                <Database size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>まだナレッジが登録されていません。右上の「＋ ナレッジを追加」からファイルをアップロードしてください。</p>
              </div>
            ) : documents.filter(doc => doc.filename.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
              <div className="empty-state glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px 24px' }}>
                <Search size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                <p>検索に一致するナレッジが見つかりません。</p>
              </div>
            ) : (
              documents.filter(doc => doc.filename.toLowerCase().includes(searchQuery.toLowerCase())).map(doc => (
                <div key={doc.id} className={`glass-panel doc-card ${doc.is_valid === 0 ? 'invalidated' : ''}`} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Card Header: Title and Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    
                    <div style={{ flex: 1 }}>
                      {editingDocId === doc.id ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <input 
                            type="text" 
                            value={editNameValue} 
                            onChange={(e) => setEditNameValue(e.target.value)}
                            style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1.1rem', width: '300px' }}
                            autoFocus
                          />
                          <button onClick={() => handleRenameSubmit(doc.id)} style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>保存</button>
                          <button onClick={() => setEditingDocId(null)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>キャンセル</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <FileText size={20} color="#2563eb" />
                          <h3 style={{ margin: 0, fontSize: '1.2rem', textDecoration: doc.is_valid === 0 ? 'line-through' : 'none' }}>
                            {doc.filename}
                          </h3>
                          <button 
                            onClick={() => { setEditingDocId(doc.id); setEditNameValue(doc.filename); }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: '#6b7280', textDecoration: 'underline', padding: 0 }}
                          >
                            名前を変更
                          </button>
                        </div>
                      )}
                      
                      <div style={{ color: '#6b7280', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={14} /> 取り込み: {new Date(doc.extracted_at).toLocaleString('ja-JP')}
                        </span>
                        {doc.is_valid === 0 && <span style={{ color: '#dc2626', fontWeight: 500, border: '1px solid #fca5a5', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>論理削除済み</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        onClick={() => downloadRawText(doc)}
                        style={{ padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}
                        title="抽出されたプレーンテキストを保存"
                      >
                        生データをDL
                      </button>
                      {doc.is_valid === 1 && (
                        <button 
                          onClick={() => handleInvalidate(doc.id)}
                          style={{ padding: '6px 12px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}
                        >
                          無効化
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeletePhysical(doc.id)}
                        style={{ padding: '6px 12px', fontSize: '0.85rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #f87171', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        完全削除
                      </button>
                    </div>

                  </div>

                  {/* Card Body: Summary Toggle */}
                  <div style={{ background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginTop: '4px', overflow: 'hidden' }}>
                    <div 
                      onClick={() => toggleDocExpand(doc.id)}
                      style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedDocs.has(doc.id) ? '#f1f5f9' : 'transparent' }}
                    >
                      <h4 style={{ margin: 0, color: '#334155', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✨ AI要約 (Summary)
                      </h4>
                      {expandedDocs.has(doc.id) ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
                    </div>
                    {expandedDocs.has(doc.id) && (
                      <div style={{ padding: '0 16px 16px 16px', borderTop: '1px solid #e2e8f0' }}>
                        <p style={{ margin: '12px 0 0 0', lineHeight: 1.6, color: '#475569', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                          {doc.summary || '要約情報がありません。（過去にアップロードされたドキュメント、もしくは要約抽出に失敗したドキュメントです）'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
