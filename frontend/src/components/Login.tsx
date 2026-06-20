import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, UserCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../api';
import './KnowledgeIngestion.css';

export const Login: React.FC = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [dept, setDept] = useState('営業部');
  const [career, setCareer] = useState('');
  const [characteristics, setCharacteristics] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('メールアドレスとパスワードは必須です');
      return;
    }
    
    if (!isLoginMode && !displayName.trim()) {
      setError('表示名は必須です');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';
      const body = isLoginMode 
        ? { email: email.trim(), password }
        : { email: email.trim(), password, display_name: displayName.trim(), department: dept, career: career.trim(), characteristics: characteristics.trim() };
        
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const data = await res.json();
      
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.detail || '認証に失敗しました');
      }
      
      login(data.token, data.user);
      navigate('/projects');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      background: '#fcfcfc',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
        boxShadow: 'none',
        border: '1px solid var(--glass-border)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <UserCircle size={64} color="var(--accent-color)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>SIPへようこそ</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            {isLoginMode ? 'アカウント情報を入力してログインしてください' : '新しいアカウントを作成し、プロフィールを設定してください'}
          </p>
        </div>
        
        <div style={{ display: 'flex', width: '100%', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
          <button 
            onClick={() => { setIsLoginMode(true); setError(''); }}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: isLoginMode ? '#fff' : 'transparent', color: isLoginMode ? 'var(--accent)' : '#64748b', fontWeight: isLoginMode ? 600 : 400, boxShadow: isLoginMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            ログイン
          </button>
          <button 
            onClick={() => { setIsLoginMode(false); setError(''); }}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: !isLoginMode ? '#fff' : 'transparent', color: !isLoginMode ? 'var(--accent)' : '#64748b', fontWeight: !isLoginMode ? 600 : 400, boxShadow: !isLoginMode ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            新規登録
          </button>
        </div>

        {error && (
          <div style={{ width: '100%', padding: '12px', background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', borderRadius: '6px', fontSize: '0.9rem', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>メールアドレス (ユーザーID) <span style={{ color: '#ef4444' }}>*</span></label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="例: yamada@example.com" 
              className="input-field"
              required
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>パスワード <span style={{ color: '#ef4444' }}>*</span></label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••" 
              className="input-field"
              required
            />
          </div>
          
          {!isLoginMode && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>表示名 (プロフィール名) <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)} 
                  placeholder="例: 山田太郎" 
                  className="input-field"
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>所属部門 <span style={{ color: '#ef4444' }}>*</span></label>
                <select 
                  value={dept} 
                  onChange={e => setDept(e.target.value)} 
                  className="input-field"
                >
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
                <input 
                  type="text" 
                  value={career} 
                  onChange={e => setCareer(e.target.value)} 
                  placeholder="例: SaaS営業10年、インフラエンジニア など" 
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155' }}>思考特性・スタンス</label>
                <input 
                  type="text" 
                  value={characteristics} 
                  onChange={e => setCharacteristics(e.target.value)} 
                  placeholder="例: リスク回避型、顧客体験重視、短期売上重視 など" 
                  className="input-field"
                />
              </div>
            </>
          )}
          
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!email.trim() || !password.trim() || isLoading} 
            style={{ marginTop: '16px', padding: '14px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {isLoading ? <Loader2 size={20} className="spinning-icon" /> : (isLoginMode ? <LogIn size={20} /> : <UserPlus size={20} />)}
            {isLoginMode ? 'ログイン' : 'アカウント作成'}
          </button>
        </form>
      </div>
    </div>
  );
};
