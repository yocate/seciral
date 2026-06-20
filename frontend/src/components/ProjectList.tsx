import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import { useNavigate } from 'react-router-dom';
import { Folder, Plus, ArrowRight } from 'lucide-react';
import './KnowledgeIngestion.css'; // Reusing some glass-panel styles

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectDesc, setEditProjectDesc] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, description: newProjectDesc })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setIsCreating(false);
        setNewProjectName('');
        setNewProjectDesc('');
        fetchProjects();
      }
    } catch (e) {
      console.error('Failed to create project', e);
    }
  };

  const handleUpdateProject = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!editProjectName.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editProjectName, description: editProjectDesc })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setEditingProjectId(null);
        fetchProjects();
      }
    } catch (e) {
      console.error('Failed to update project', e);
    }
  };

  const startEditing = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation(); // 遷移を防ぐ
    setEditingProjectId(project.id);
    setEditProjectName(project.name);
    setEditProjectDesc(project.description || '');
  };

  return (
    <div className="ingestion-container animate-fade-in">
      <div className="ingestion-header">
        <h2>ワークスペース (プロジェクト)</h2>
        <p>戦略や計画の検討単位となるプロジェクトを管理します。各プロジェクトでの会話は独立しています。</p>
      </div>

      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>プロジェクト一覧</h3>
          <button className="btn-primary" onClick={() => setIsCreating(!isCreating)} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> 新規作成
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreateProject} style={{ marginTop: '16px', padding: '20px', background: '#f9fafb', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
            <div style={{ marginBottom: '12px' }}>
              <input 
                type="text" 
                placeholder="プロジェクト名 (例: 次期Webサービス戦略)" 
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="input-field"
              />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <input 
                type="text" 
                placeholder="説明 (オプション)" 
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
                className="input-field"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsCreating(false)}>キャンセル</button>
              <button type="submit" className="btn-primary">作成</button>
            </div>
          </form>
        )}

        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {projects.length === 0 && !isCreating ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>プロジェクトがありません。「新規作成」から最初のプロジェクトを作成してください。</p>
          ) : (
            projects.map(p => (
              <div key={p.id} style={{ display: 'flex', flexDirection: 'column', padding: '20px', background: '#f9fafb', border: '1px solid var(--glass-border)', borderRadius: '8px', transition: 'all 0.2s' }}
                   onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
                   onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}>
                
                {editingProjectId === p.id ? (
                  <form onSubmit={(e) => handleUpdateProject(e, p.id)} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input 
                      type="text" 
                      value={editProjectName}
                      onChange={(e) => setEditProjectName(e.target.value)}
                      className="input-field"
                      style={{ background: '#fff' }}
                    />
                    <input 
                      type="text" 
                      value={editProjectDesc}
                      onChange={(e) => setEditProjectDesc(e.target.value)}
                      className="input-field"
                      placeholder="説明 (オプション)"
                      style={{ background: '#fff' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="button" className="btn-secondary" onClick={() => setEditingProjectId(null)}>キャンセル</button>
                      <button type="submit" className="btn-primary">保存</button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/projects/${p.id}/session`)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <Folder size={24} color="var(--accent-color)" />
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>{p.name}</h4>
                        {p.description && <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{p.description}</p>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={(e) => startEditing(e, p)}
                      >
                        編集
                      </button>
                      <ArrowRight size={20} color="var(--accent-color)" />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
