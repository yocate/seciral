import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../api';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, User, Bot, Loader2, FileText, Upload, Settings, X, Download, Database, Lightbulb, Plus, MessageSquare, Edit2, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useAuth } from '../contexts/AuthContext';
import './DiagnosticSession.css';

interface Evaluation {
  confidence: 'High' | 'Medium' | 'Low';
  reason: string;
  sources: string[];
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  evaluation?: Evaluation;
}

interface Template {
  id: string;
  name: string;
  description: string;
}

interface Document {
  id: number;
  filename: string;
}



interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

const parseMessageWithEvaluation = (text: string): { cleanText: string, evaluation?: Evaluation } => {
  const evalRegex = /<evaluation>([\s\S]*?)<\/evaluation>/;
  const match = text.match(evalRegex);
  
  if (match && match[1]) {
    try {
      const evaluationData = JSON.parse(match[1]);
      const cleanText = text.replace(evalRegex, '').trim();
      return { cleanText, evaluation: evaluationData };
    } catch (e) {
      console.error("Failed to parse evaluation JSON:", e);
    }
  }
  
  // 評価タグがストリーミング中（未完了）の場合は、そこから後ろを隠す
  if (text.includes('<evaluation>')) {
    const cleanText = text.substring(0, text.indexOf('<evaluation>')).trim();
    return { cleanText };
  }

  return { cleanText: text };
};

import { useProjects } from '../hooks/useProjects';
import { useProjectDocs } from '../hooks/useProjectDocs';
import { useDiagnosticChat } from '../hooks/useDiagnosticChat';

export const DiagnosticSession: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const sessionId = projectId || 'default_session';
  const [projectName, setProjectName] = useState<string>('');

  const { projects, isCreatingProject, createProject, renameProject } = useProjects();
  const { projectDocs, globalDocs, isUploading, isLinking, uploadDocs, fetchGlobalDocs, linkGlobalDocs } = useProjectDocs(sessionId);
  const { messages, isLoading, isIngesting, sendMessage, ingestSession, reviewDeliverable } = useDiagnosticChat(sessionId, user?.id);

  // Deliverable Review
  const [deliverableText, setDeliverableText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  // Shared Knowledge Selection Modal
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false);
  const [selectedGlobalDocs, setSelectedGlobalDocs] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const extractFileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // UI state
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [input, setInput] = useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (projectId) {
      setProjectName('');
      fetch(`${API_BASE_URL}/api/projects/${projectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success' && data.project) {
            setProjectName(data.project.name);
          }
        })
        .catch(err => console.error("Project fetch error:", err));
    }
  }, [projectId]);

  const submitRenameProject = async (id: string) => {
    const success = await renameProject(id, editingProjectName);
    if (success && id === projectId) {
      setProjectName(editingProjectName);
    }
    setEditingProjectId(null);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const newId = await createProject(newProjectName);
    if (newId) {
      setNewProjectName('');
      navigate(`/projects/${newId}/session`);
    }
  };

  const handleIngestKnowledge = async () => {
    const success = await ingestSession(user);
    if (success) {
      alert('セッションをナレッジグラフに吸収しました！ダッシュボードで成長を確認できます。');
    } else {
      alert('エラーが発生しました。');
    }
  };

  const handleReviewDeliverable = async () => {
    setIsReviewing(true);
    await reviewDeliverable(deliverableText);
    setDeliverableText('');
    setIsReviewing(false);
  };

  const handleSend = async () => {
    const text = input;
    setInput('');
    await sendMessage(text);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    await uploadDocs(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExtractFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsExtracting(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const response = await fetch(`${API_BASE_URL}/api/review/extract`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.status === 'success') {
        setDeliverableText(data.extracted_text);
        setUploadedFileName(e.target.files[0].name);
      } else {
        alert('テキスト抽出に失敗しました: ' + (data.message || '不明なエラー'));
      }
    } catch (error) {
      console.error('Extract failed', error);
      alert('ファイルのアップロードに失敗しました。');
    } finally {
      setIsExtracting(false);
      if (extractFileInputRef.current) extractFileInputRef.current.value = '';
    }
  };

  const handleOpenKnowledgeModal = async () => {
    setShowKnowledgeModal(true);
    await fetchGlobalDocs();
    setSelectedGlobalDocs(new Set());
  };

  const toggleGlobalDocSelection = (id: number) => {
    const newSet = new Set(selectedGlobalDocs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedGlobalDocs(newSet);
  };

  const handleLinkGlobalDocs = async () => {
    await linkGlobalDocs(selectedGlobalDocs);
    setShowKnowledgeModal(false);
  };



  return (
    <div className="diagnostic-container animate-fade-in" style={{ display: 'flex', gap: '16px', width: '100%', height: 'calc(100vh - 130px)' }}>
      
      {/* 1. プロジェクト（履歴）サイドバー (左端ペイン) */}
      <div className="glass-panel" style={{ width: '250px', display: 'flex', flexDirection: 'column', gap: '16px', flexShrink: 0, padding: '16px' }}>
        <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <MessageSquare size={16} className="text-accent" /> チャット履歴
        </h3>
        
        <form onSubmit={handleCreateProject} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="新しいチャット名..." 
            value={newProjectName} 
            onChange={(e) => setNewProjectName(e.target.value)}
            style={{ flex: 1, padding: '6px 10px', fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn-primary" disabled={isCreatingProject} style={{ padding: '6px', minWidth: '32px', display: 'flex', justifyContent: 'center' }}>
            {isCreatingProject ? <Loader2 size={14} className="spinning-icon" /> : <Plus size={14} />}
          </button>
        </form>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {projects.map(p => (
            <div 
              key={p.id} 
              style={{ 
                padding: '10px', 
                borderRadius: '8px', 
                cursor: 'pointer',
                background: projectId === p.id ? 'var(--glass-bg)' : 'transparent',
                border: projectId === p.id ? '1px solid var(--text-secondary)' : '1px solid transparent',
                transition: 'all 0.2s',
                fontSize: '0.9rem',
                fontWeight: projectId === p.id ? 600 : 400,
                color: projectId === p.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              className="hover-bg-light"
              onClick={() => {
                if (editingProjectId !== p.id) navigate(`/projects/${p.id}/session`);
              }}
            >
              {editingProjectId === p.id ? (
                <input 
                  type="text" 
                  value={editingProjectName} 
                  onChange={e => setEditingProjectName(e.target.value)}
                  onBlur={() => submitRenameProject(p.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submitRenameProject(p.id);
                    if (e.key === 'Escape') setEditingProjectId(null);
                  }}
                  autoFocus
                  style={{ flex: 1, border: '1px solid var(--text-secondary)', borderRadius: '4px', padding: '4px', fontSize: '0.9rem' }}
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{p.name}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingProjectId(p.id);
                      setEditingProjectName(p.name);
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    title="名前を変更"
                  >
                    <Edit2 size={12} />
                  </button>
                </>
              )}
            </div>
          ))}
          {projects.length === 0 && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
              履歴がありません。上の入力欄から新しく始めてください。
            </p>
          )}
        </div>
      </div>

      {/* 2. ナレッジエクスプローラー (中央ペイン) */}
      <div className="glass-panel" style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '20px', flexShrink: 0, padding: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '12px' }}>
            <FileText size={18} className="text-accent" /> 成果物レビュー依頼
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
            現在のTemporal Knowledge Graph（蓄積された知見）と照らし合わせ、成果物の矛盾点や死角をレビューします。
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => extractFileInputRef.current?.click()}
              disabled={isExtracting}
              style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isExtracting ? <Loader2 size={14} className="spinning-icon" /> : <Upload size={14} />}
              {isExtracting ? 'テキスト抽出中...' : 'ファイルから読み込む (PDF/Txt)'}
            </button>
            <input 
              type="file" 
              ref={extractFileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleExtractFile}
              accept=".txt,.md,.pdf"
            />
          </div>

          {uploadedFileName ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-light)', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--glass-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <FileText size={16} className="text-accent" />
                <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {uploadedFileName}
                </span>
              </div>
              <button 
                onClick={() => {
                  setDeliverableText('');
                  setUploadedFileName(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
                title="クリア"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              background: 'var(--bg-light)', 
              borderRadius: '8px', 
              marginBottom: '12px',
              border: '1px dashed var(--glass-border)',
              color: 'var(--text-secondary)',
              fontSize: '0.85rem'
            }}>
              レビューするファイル（PDF / Markdown 等）を読み込んでください
            </div>
          )}

          <button 
            className="btn-primary" 
            onClick={handleReviewDeliverable} 
            disabled={isReviewing || !deliverableText.trim()}
            style={{ width: '100%', marginTop: '12px', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isReviewing ? <Loader2 size={16} className="spinning-icon" /> : <Bot size={16} />}
            AIレビューを実行
          </button>
        </div>

        <hr style={{ borderTop: '1px solid var(--glass-border)', margin: 0 }} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', marginBottom: '12px' }}>
            <FileText size={18} className="text-accent" /> ナレッジエクスプローラー
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            プロジェクト固有の資料をアップロード、または共有ナレッジから選択します。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <button 
              className="btn-secondary" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
              {isUploading ? <Loader2 size={16} className="spinning-icon" /> : <Upload size={16} />}
              資料アップロード
            </button>
            <button 
              className="btn-secondary" 
              onClick={handleOpenKnowledgeModal}
              disabled={isUploading}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
            >
              <Database size={16} />
              共有ナレッジから選択
            </button>
          </div>
          <input 
            type="file" 
            multiple 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload}
            accept=".txt,.md,.pdf"
          />
          
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, overflowY: 'auto' }}>
            {(projectDocs || []).map(doc => (
              <li key={doc.id} style={{ 
                padding: '10px 12px', 
                marginBottom: '8px',
                background: '#f3f4f6', 
                borderRadius: '6px',
                fontSize: '0.9rem', 
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FileText size={14} style={{ color: '#9ca3af' }}/>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.filename}</span>
              </li>
            ))}
            {(!projectDocs || projectDocs.length === 0) && !isUploading && (
              <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.9rem', marginTop: '20px' }}>
                アップロードされた資料はありません
              </div>
            )}
          </ul>
        </div>
      </div>

      {/* 3. 戦略立案・資料作成チャット (右端ペイン) */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="session-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1.4rem' }}>
              {projectName ? `💭 チャット: ${projectName}` : '戦略立案・ドキュメント作成'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
              この会話コンテキストは独立しており、履歴として保存されます。
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              className="btn-secondary" 
              onClick={handleIngestKnowledge}
              disabled={isIngesting || !sessionId}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'var(--accent-color)', color: 'white', border: 'none' }}
            >
              {isIngesting ? <Loader2 size={18} className="spinning-icon" /> : <Lightbulb size={18} />}
              ✨ ナレッジ化
            </button>
          </div>
        </div>
        
        <div className="chat-area" style={{ flex: 1, overflowY: 'auto', paddingRight: '12px', paddingTop: '10px' }}>
          {messages.map((msg) => {
            const { cleanText, evaluation } = parseMessageWithEvaluation(msg.text);
            return (
              <div key={msg.id} className={`message-wrapper ${msg.sender === 'user' ? 'user' : 'ai'}`}>
                <div className="avatar">
                  {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className="message-content">
                  {msg.sender === 'ai' ? (
                    <>
                      {evaluation && (
                        <div style={{ marginBottom: '12px', padding: '12px', background: 'rgba(255, 255, 255, 0.7)', borderRadius: '8px', border: '1px solid var(--glass-border)', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ 
                              padding: '2px 8px', 
                              borderRadius: '12px', 
                              fontWeight: 600,
                              background: evaluation.confidence === 'High' ? '#e5e7eb' : (evaluation.confidence === 'Medium' ? '#fef3c7' : '#fee2e2'),
                              color: evaluation.confidence === 'High' ? '#1f2937' : (evaluation.confidence === 'Medium' ? '#92400e' : '#991b1b'),
                            }}>
                              🛡️ 信頼度: {evaluation.confidence === 'High' ? '高' : (evaluation.confidence === 'Medium' ? '中' : '低')}
                            </span>
                            <span style={{ color: 'var(--text-secondary)' }}>{evaluation.reason}</span>
                          </div>
                          {evaluation.sources && evaluation.sources.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Database size={12} /> 情報源・根拠
                              </div>
                              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                                {evaluation.sources.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{cleanText}</ReactMarkdown>
                    </>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="message-wrapper ai">
              <div className="avatar"><Bot size={20} /></div>
              <div className="message-content loading">
                <Loader2 className="spinning-icon" size={18} style={{ marginRight: '8px' }} />
                <span>分析・推論中...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="input-area" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--glass-border)' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                // IME変換中のEnterは送信しない
                if (e.nativeEvent.isComposing) return;
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="プロジェクトの構想や課題を入力してください... (Shift+Enterで改行)"
            disabled={isLoading}
            style={{ height: '50px' }}
          />
          <button className="btn-send" onClick={handleSend} disabled={isLoading || !input.trim()} style={{ height: '50px', width: '50px' }}>
            <Send size={16} />
          </button>
        </div>
      </div>



      {/* 共有ナレッジ選択モーダル */}
      {showKnowledgeModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '40px'
        }}>
          <div className="modal-content" style={{
            background: '#fff', width: '100%', maxWidth: '600px', maxHeight: '80%',
            borderRadius: '16px', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden'
          }}>
            <div style={{ padding: '20px 30px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={20} className="text-accent" /> 共有ナレッジから選択
              </h2>
              <button onClick={() => setShowKnowledgeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: '#6b7280' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 30px' }}>
              {globalDocs.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>追加可能な共有ナレッジはありません。</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {globalDocs.map(doc => (
                    <li key={doc.id} style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer'
                    }} onClick={() => toggleGlobalDocSelection(doc.id)}>
                      <input 
                        type="checkbox" 
                        checked={selectedGlobalDocs.has(doc.id)} 
                        onChange={() => toggleGlobalDocSelection(doc.id)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <FileText size={16} style={{ color: '#9ca3af' }} />
                      <span style={{ fontSize: '0.95rem', color: '#374151' }}>{doc.filename}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div style={{ padding: '20px 30px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f9fafb' }}>
              <button className="btn-secondary" onClick={() => setShowKnowledgeModal(false)} disabled={isLinking}>
                キャンセル
              </button>
              <button className="btn-primary" onClick={handleLinkGlobalDocs} disabled={isLinking || selectedGlobalDocs.size === 0}>
                {isLinking ? <Loader2 size={16} className="spinning-icon" /> : 'プロジェクトに追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
