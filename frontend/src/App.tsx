import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, Folder, BrainCircuit, UserCircle, LogOut } from 'lucide-react';
import { KnowledgeBase } from './components/KnowledgeBase';
import { DiagnosticSession } from './components/DiagnosticSession';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { KnowledgeDiscovery } from './components/KnowledgeDiscovery';
import { Login } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { API_BASE_URL } from './api';
import './App.css';

const Navigation = () => {
  const location = useLocation();
  return (
    <nav style={{ display: 'flex', gap: '20px' }}>
      <Link 
        to="/projects" 
        className={`nav-item ${location.pathname.startsWith('/projects') ? 'active' : ''}`}
        title="個人の暗黙知をAIとの対話で引き出す"
      >
        <UserCircle size={18} />
        1. 共同化（AI壁打ち）
      </Link>
      <Link 
        to="/knowledge" 
        className={`nav-item ${location.pathname === '/knowledge' ? 'active' : ''}`}
        title="対話や資料を形式知（ナレッジ）として抽出・蓄積する"
      >
        <FileText size={18} />
        2. 表出化（ナレッジ管理）
      </Link>
      <Link 
        to="/dashboard" 
        className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
        title="個別の形式知を結びつけ、全社の組織グラフとして体系化する"
      >
        <LayoutDashboard size={18} />
        3. 結合化（組織グラフ）
      </Link>
      <Link 
        to="/discovery" 
        className={`nav-item ${location.pathname === '/discovery' ? 'active' : ''}`}
        title="体系化された知見から深い気づきを得て、個人の新たな知恵にする"
      >
        <BrainCircuit size={18} />
        4. 内面化（深い気づき）
      </Link>
    </nav>
  );
};

const ProfileEditModal = ({ onClose }: { onClose: () => void }) => {
  const { user, updateUser, logout } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [dept, setDept] = useState(user?.department || '営業部');
  const [career, setCareer] = useState(user?.career || '');
  const [characteristics, setCharacteristics] = useState(user?.characteristics || '');
  const [mbtiType, setMbtiType] = useState(user?.mbti_type || 'INTJ');
  const [strategicPersona, setStrategicPersona] = useState(user?.strategic_persona || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          display_name: displayName.trim(),
          department: dept,
          career: career.trim(),
          characteristics: characteristics.trim(),
          mbti_type: mbtiType
        })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        updateUser(data.user);
        onClose();
      } else {
        alert("プロフィール更新に失敗しました。");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePersona = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile/${user.id}/persona/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mbti_type: mbtiType })
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setStrategicPersona(data.strategic_persona);
        updateUser(data.user);
      } else {
        alert("ペルソナ生成に失敗しました。");
      }
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowY: 'auto', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#1e293b' }}>
            <UserCircle size={24} className="text-accent" />
            プロフィール設定
          </h2>
          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }} title="ログアウト">
            <LogOut size={14} /> ログアウト
          </button>
        </div>
        
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          表示名: <strong>{user?.display_name}</strong> <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '8px' }}>({user?.email})</span>
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>表示名 (プロフィール名)</label>
          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>所属部門</label>
          <select value={dept} onChange={e => setDept(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
            <option value="営業部">営業部</option>
            <option value="開発部">開発部</option>
            <option value="経営企画部">経営企画部</option>
            <option value="マーケティング部">マーケティング部</option>
            <option value="カスタマーサクセス部">カスタマーサクセス部</option>
            <option value="その他">その他</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>キャリア・専門領域</label>
          <input type="text" value={career} onChange={e => setCareer(e.target.value)} placeholder="例: SaaS営業10年、インフラエンジニア など" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>思考特性・スタンス</label>
          <input type="text" value={characteristics} onChange={e => setCharacteristics(e.target.value)} placeholder="例: リスク回避型、顧客体験重視、短期売上重視 など" style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        </div>

        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a' }}>16パーソナリティ分析</h3>
            <button className="btn-secondary" onClick={handleGeneratePersona} disabled={isGenerating || isSaving} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              {isGenerating ? '分析中...' : 'AI診断'}
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>ご自身のタイプを選択してください</label>
            <select value={mbtiType} onChange={e => setMbtiType(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
              <option value="INTJ">建築家 (INTJ)</option>
              <option value="INTP">論理学者 (INTP)</option>
              <option value="ENTJ">指揮官 (ENTJ)</option>
              <option value="ENTP">討論者 (ENTP)</option>
              <option value="INFJ">提唱者 (INFJ)</option>
              <option value="INFP">仲介者 (INFP)</option>
              <option value="ENFJ">主人公 (ENFJ)</option>
              <option value="ENFP">運動家 (ENFP)</option>
              <option value="ISTJ">管理者 (ISTJ)</option>
              <option value="ISFJ">擁護者 (ISFJ)</option>
              <option value="ESTJ">幹部 (ESTJ)</option>
              <option value="ESFJ">領事官 (ESFJ)</option>
              <option value="ISTP">巨匠 (ISTP)</option>
              <option value="ISFP">冒険家 (ISFP)</option>
              <option value="ESTP">起業家 (ESTP)</option>
              <option value="ESFP">エンターテイナー (ESFP)</option>
            </select>
          </div>
          
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>※ご自身のMBTIタイプを選択して「AI診断」ボタンを押すと、AIが特性や戦略上の盲点を分析します。</p>

          {strategicPersona && (
            <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '6px', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.9rem', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>診断結果:</div>
              {strategicPersona}
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button className="btn-secondary" onClick={onClose} style={{ padding: '10px 16px' }} disabled={isSaving}>キャンセル</button>
          <button className="btn-primary" onClick={handleSave} disabled={isSaving} style={{ padding: '10px 16px' }}>{isSaving ? '保存中...' : '保存する'}</button>
        </div>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {showProfileModal && <ProfileEditModal onClose={() => setShowProfileModal(false)} />}
      <header className="app-header">
        <div className="logo">
          <BrainCircuit size={28} color="#60a5fa" />
          SIP
        </div>
        <Navigation />
        <div 
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', transition: 'background 0.2s' }} 
          onClick={() => setShowProfileModal(true)}
          title="プロフィール設定"
          className="profile-btn"
        >
          <UserCircle size={20} color="var(--accent-color)" />
          <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>{user?.display_name || '未設定'}</span>
        </div>
      </header>
      
      <main className="app-content">
        <Outlet />
      </main>
    </>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<DiagnosticSession />} />
        <Route path="/projects/:id/session" element={<DiagnosticSession />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/knowledge" element={<KnowledgeBase />} />
        <Route path="/discovery" element={<KnowledgeDiscovery />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
