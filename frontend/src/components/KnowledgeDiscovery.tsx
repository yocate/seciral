import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../api';
import { Lightbulb, Network, Sparkles, AlertTriangle, CheckCircle, BrainCircuit } from 'lucide-react';
import { CausalLoopDiagram } from './CausalLoopDiagram';
import './KnowledgeBase.css';

interface Archetype {
  name: string;
  description: string;
  nodes_involved: string[];
}

interface Insights {
  archetypes: Archetype[];
  meta_narrative: string;
  new_insights: string[];
}

export const KnowledgeDiscovery: React.FC = () => {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchLatestInsights();
  }, []);

  const fetchLatestInsights = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/abstract`);
      const data = await response.json();
      if (data && data.archetypes && data.archetypes.length > 0) {
        setInsights(data);
      }
    } catch (err) {
      console.error('Failed to fetch latest insights:', err);
    }
  };

  const handleExtractInsights = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/knowledge/abstract`, {
        method: 'POST',
      });
      const data = await response.json();
      setInsights(data);
    } catch (err) {
      console.error(err);
      alert('知見の抽出に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'insights' | 'loops'>('insights');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lightbulb className="text-accent" size={28} />
            知見の表出化（SECI Discovery）
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem', maxWidth: '800px', lineHeight: '1.6' }}>
            組織内に蓄積されたナレッジグラフ全体をAIが俯瞰し、局所的な事象の背後にある「抽象的な構造（システムアーキタイプ）」や「メタ知見」を抽出します。
            形式知を結合し、あなたの新たな暗黙知（深い気づき）へと昇華させます。
          </p>
        </div>
        {activeTab === 'insights' && (
          <button 
            className="btn-primary" 
            onClick={handleExtractInsights}
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1rem', background: '#111827', color: 'white', border: 'none', borderRadius: '6px' }}
          >
            {isLoading ? <Sparkles size={20} className="spinning-icon" /> : <BrainCircuit size={20} />}
            グラフ全体から知見を抽出
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', gap: '20px' }}>
        <button
          onClick={() => setActiveTab('insights')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'insights' ? '2px solid #111827' : '2px solid transparent',
            color: activeTab === 'insights' ? '#111827' : 'var(--text-secondary)',
            fontWeight: activeTab === 'insights' ? 'bold' : 'normal'
          }}
        >
          メタ知見抽出
        </button>
        <button
          onClick={() => setActiveTab('loops')}
          style={{
            background: 'none',
            border: 'none',
            padding: '10px 20px',
            fontSize: '1rem',
            cursor: 'pointer',
            borderBottom: activeTab === 'loops' ? '2px solid #111827' : '2px solid transparent',
            color: activeTab === 'loops' ? '#111827' : 'var(--text-secondary)',
            fontWeight: activeTab === 'loops' ? 'bold' : 'normal',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Network size={16} /> 因果ループ図 (CLD)
        </button>
      </div>

      {activeTab === 'insights' ? (
        <>
          {/* SECI Cycle Diagram */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid var(--glass-border)', padding: '0 10px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>1. 共同化 (Socialization)</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>暗黙知をAI対話で引き出す</p>
            </div>
            <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid var(--glass-border)', padding: '0 10px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>2. 表出化 (Externalization)</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>ナレッジとして抽出・蓄積</p>
            </div>
            <div style={{ textAlign: 'center', flex: 1, borderRight: '1px solid var(--glass-border)', padding: '0 10px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>3. 結合化 (Combination)</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>組織グラフとして体系化</p>
            </div>
            <div style={{ textAlign: 'center', flex: 1, padding: '0 10px', background: '#f3f4f6', borderRadius: '8px', paddingBottom: '10px', paddingTop: '10px' }}>
              <h4 style={{ margin: '0 0 8px 0', color: '#111827' }}>4. 内面化 (Internalization)</h4>
              <p style={{ fontSize: '0.8rem', color: '#111827', margin: 0, fontWeight: 'bold' }}>今ここで深い気づきを得ています</p>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                <Sparkles size={48} className="spinning-icon" style={{ marginBottom: '16px', color: '#111827' }} />
                <h3 style={{ margin: '0 0 8px 0' }}>組織の深層構造を分析中...</h3>
                <p>巨大なグラフ全体を俯瞰し、システムアーキタイプ（失敗の型）を探索しています。</p>
              </div>
            )}

            {!isLoading && insights && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Meta Narrative Card */}
                <div className="glass-panel" style={{ background: '#fcfcfc', borderLeft: '4px solid #374151' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0, color: '#111827' }}>
                    <Network size={20} />
                    組織の「根深い構造」ナラティブ
                  </h3>
                  <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: 'var(--text-primary)', margin: 0 }}>
                    {insights.meta_narrative}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  {/* Archetypes */}
                  {insights.archetypes && insights.archetypes.length > 0 && (
                    <div className="glass-panel">
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                        <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                        発見されたシステムアーキタイプ
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {insights.archetypes.map((arch, i) => (
                          <div key={i} style={{ padding: '16px', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px' }}>
                            <h4 style={{ margin: '0 0 8px 0', color: '#b45309', fontSize: '1.05rem' }}>{arch.name}</h4>
                            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#92400e', lineHeight: '1.5' }}>{arch.description}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {arch.nodes_involved.map((n, j) => (
                                <span key={j} style={{ background: '#fef3c7', padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', color: '#b45309', border: '1px solid #fde68a' }}>
                                  {n}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Insights */}
                  {insights.new_insights && insights.new_insights.length > 0 && (
                    <div className="glass-panel">
                      <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: 0 }}>
                        <CheckCircle size={20} style={{ color: '#10b981' }} />
                        新しい発見と示唆（内面化へのヒント）
                      </h3>
                      <ul style={{ padding: '0 0 0 20px', margin: 0, color: 'var(--text-primary)', lineHeight: '1.7' }}>
                        {insights.new_insights.map((insight, i) => (
                          <li key={i} style={{ marginBottom: '12px' }}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

              </div>
            )}

            {!isLoading && !insights && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
                <BrainCircuit size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                <p>右上のボタンを押して、グラフから抽象的な知見を抽出してください。</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CausalLoopDiagram />
        </div>
      )}
    </div>
  );
};
