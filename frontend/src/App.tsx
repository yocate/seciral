import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { BrainCircuit, LayoutDashboard, MessageSquareText, Database, FileText } from 'lucide-react';
import { KnowledgeIngestion } from './components/KnowledgeIngestion';
import { KnowledgeBase } from './components/KnowledgeBase';
import { DiagnosticSession } from './components/DiagnosticSession';
import { Dashboard } from './components/Dashboard';

const Navigation = () => {
  const location = useLocation();
  return (
    <nav style={{ display: 'flex', gap: '20px' }}>
      <Link 
        to="/" 
        style={{ 
          color: location.pathname === '/' ? 'var(--text-primary)' : 'var(--text-secondary)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: location.pathname === '/' ? 600 : 400
        }}
      >
        <Database size={18} />
        ナレッジ取込
      </Link>
      <Link 
        to="/knowledge" 
        style={{ 
          color: location.pathname === '/knowledge' ? 'var(--text-primary)' : 'var(--text-secondary)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: location.pathname === '/knowledge' ? 600 : 400
        }}
      >
        <FileText size={18} />
        ナレッジ管理
      </Link>
      <Link 
        to="/diagnostic" 
        style={{ 
          color: location.pathname === '/diagnostic' ? 'var(--text-primary)' : 'var(--text-secondary)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: location.pathname === '/diagnostic' ? 600 : 400
        }}
      >
        <MessageSquareText size={18} />
        初期診断
      </Link>
      <Link 
        to="/dashboard" 
        style={{ 
          color: location.pathname === '/dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: location.pathname === '/dashboard' ? 600 : 400
        }}
      >
        <LayoutDashboard size={18} />
        ダッシュボード
      </Link>
    </nav>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <header className="app-header">
        <div className="logo">
          <BrainCircuit size={28} color="#60a5fa" />
          SIP
        </div>
        <Navigation />
      </header>
      
      <main className="main-content">
        <Routes>
          <Route path="/" element={<KnowledgeIngestion />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/diagnostic" element={<DiagnosticSession />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </Router>
  );
};

export default App;
