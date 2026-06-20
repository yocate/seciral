import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../api';
import { Database, Folder, Network, Layers, RefreshCw, Maximize2, Minimize2, Sparkles } from 'lucide-react';
import ForceGraph2D from 'react-force-graph-2d';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [isGenerating, setIsGenerating] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });
  const [ranking, setRanking] = useState<any[]>([]);
  const [frameworks, setFrameworks] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_documents: 0, total_projects: 0, total_nodes: 0, total_edges: 0 });
  const [highlightThreshold, setHighlightThreshold] = useState(5);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [visibleLayer, setVisibleLayer] = useState<'all' | 'specific' | 'abstract'>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGraph();
    fetchRanking();
    fetchStats();
    fetchFrameworks();
  }, []);

  useEffect(() => {
    localStorage.setItem('sip_highlight_threshold', String(highlightThreshold));
  }, [highlightThreshold]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDimensions({
            width: rect.width,
            height: isFullscreen ? window.innerHeight : rect.height
          });
        }
      }
    };

    updateDimensions();
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions({
            width: entry.contentRect.width,
            height: isFullscreen ? window.innerHeight : 400
          });
        }
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [isFullscreen]);


  const calculateDegree = (graph: any) => {
    if (!graph || !graph.nodes) return graph;
    const degreeMap: Record<string, number> = {};
    graph.links.forEach((link: any) => {
      const source = typeof link.source === 'object' ? link.source.id : link.source;
      const target = typeof link.target === 'object' ? link.target.id : link.target;
      degreeMap[source] = (degreeMap[source] || 0) + 1;
      degreeMap[target] = (degreeMap[target] || 0) + 1;
    });
    const nodes = graph.nodes.map((n: any) => ({
      ...n,
      val: degreeMap[n.id] || 0
    }));
    return { ...graph, nodes };
  };

  const fetchGraph = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/graph`);
      const data = await res.json();
      if (data && data.nodes) {
        setGraphData(calculateDegree(data));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRanking = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/documents/ranking?limit=5`);
      const data = await res.json();
      if (data.status === 'success') {
        setRanking(data.ranking);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
      const data = await res.json();
      if (data.status === 'success') {
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFrameworks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/dashboard/frameworks`);
      const data = await res.json();
      if (data.status === 'success') {
        setFrameworks(data.frameworks);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateGraph = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/graph/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'global' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setGraphData(calculateDegree(data.graph));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };


  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(graphData.nodes.map((n: any) => n.department || 'General'))).filter(Boolean);
  }, [graphData]);

  const filteredGraphData = useMemo(() => {
    let nodes = graphData.nodes;
    if (selectedDepartment !== 'all') {
      nodes = nodes.filter((n: any) => n.department === selectedDepartment);
    }
    const nodeIds = new Set(nodes.map((n: any) => n.id));
    const filteredLinks = graphData.links.filter((l: any) => {
        const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
        const targetId = typeof l.target === 'object' ? l.target.id : l.target;
        return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
    return { nodes, links: filteredLinks };
  }, [graphData, selectedDepartment]);

  const renderNode = (node: any, ctx: any, globalScale: any) => {
    const nodeLayer = node.layer || 'specific';
    const isVisibleLayer = visibleLayer === 'all' || nodeLayer === visibleLayer;
    const opacity = isVisibleLayer ? 1.0 : 0.15;
    
    ctx.globalAlpha = opacity;
    const label = node.name;
    const degree = node.val || 1;
    const baseFontSize = Math.min(9 + (degree - 1) * 0.4, 15);
    const fontSize = baseFontSize / globalScale;
    
    const isBold = node.group === 'strategy' || degree >= highlightThreshold;
    ctx.font = `${isBold ? 'bold ' : ''}${fontSize}px Inter, sans-serif`;
    
    const textWidth = ctx.measureText(label).width;
    const bckgDimensions = [textWidth, fontSize].map((n: number) => n + fontSize * 0.4);
    
    const isAbstract = node.layer === 'abstract';
    
    if (isAbstract) {
      ctx.shadowColor = 'rgba(139, 92, 246, 0.6)';
      ctx.shadowBlur = 10;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = degree >= highlightThreshold ? 'rgba(255, 255, 255, 0.95)' : (isAbstract ? 'rgba(245, 243, 255, 0.95)' : 'rgba(255, 255, 255, 0.9)');
    ctx.beginPath();
    const padding = degree >= highlightThreshold ? 3 : (isAbstract ? 2 : 0);
    ctx.roundRect(
      node.x - bckgDimensions[0] / 2 - padding, 
      node.y - bckgDimensions[1] / 2 - padding, 
      bckgDimensions[0] + padding * 2, 
      bckgDimensions[1] + padding * 2, 
      isAbstract ? 8 : (4 + padding)
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    
    if (degree >= highlightThreshold) {
      ctx.strokeStyle = node.group === 'strategy' ? 'rgba(245, 158, 11, 0.7)' : node.group === 'kpi' ? 'rgba(16, 185, 129, 0.7)' : 'rgba(59, 130, 246, 0.7)';
      ctx.lineWidth = 2.0 / globalScale;
      ctx.stroke();
    }
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isAbstract ? '#6d28d9' : (node.group === 'strategy' ? '#b45309' : node.group === 'kpi' ? '#047857' : '#1d4ed8');
    ctx.fillText(label, node.x, node.y);
    
    ctx.globalAlpha = 1.0; // Restore alpha
    
    node.__bckgDimensions = [bckgDimensions[0] + padding * 2, bckgDimensions[1] + padding * 2];
  };

  const paintNodePointer = (node: any, color: any, ctx: any) => {
    ctx.fillStyle = color;
    const bckgDimensions = node.__bckgDimensions;
    bckgDimensions && ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <div className="dashboard-header">
        <h2>戦略ダッシュボード</h2>
        <p>抽出された戦略変数と因果ループの状況</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Database size={24} /></div>
          <div className="stat-info">
            <h3>蓄積ナレッジ数</h3>
            <p className="stat-value">{stats.total_documents}</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Folder size={24} /></div>
          <div className="stat-info">
            <h3>検討プロジェクト</h3>
            <p className="stat-value">{stats.total_projects}</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Layers size={24} /></div>
          <div className="stat-info">
            <h3>抽出された戦略変数</h3>
            <p className="stat-value">{stats.total_nodes}</p>
          </div>
        </div>
        <div className="stat-card glass-panel">
          <div className="stat-icon"><Network size={24} /></div>
          <div className="stat-info">
            <h3>発見された因果関係</h3>
            <p className="stat-value">{stats.total_edges}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="glass-panel map-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: 0 }}>因果ループマップ・ナレッジグラフ</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>部門視点:</label>
                <select 
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  style={{ fontSize: '12px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="all">すべて</option>
                  {uniqueDepartments.map(dept => (
                    <option key={dept as string} value={dept as string}>{dept as string}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>表示レイヤー:</label>
                <select 
                  value={visibleLayer}
                  onChange={(e) => setVisibleLayer(e.target.value as any)}
                  style={{ fontSize: '12px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="all">すべて</option>
                  <option value="specific">具体のみ</option>
                  <option value="abstract">抽象概念のみ</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>強調閾値: {highlightThreshold}</label>
                <input 
                  type="range" 
                  min="2" 
                  max="30" 
                  value={highlightThreshold} 
                  onChange={(e) => setHighlightThreshold(Number(e.target.value))}
                  style={{ cursor: 'pointer', width: '80px' }}
                />
              </div>
              <button 
                className="btn-primary" 
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={handleGenerateGraph}
                disabled={isGenerating}
              >
                <RefreshCw size={14} className={isGenerating ? "spinning-icon" : ""} />
                {isGenerating ? "再構築中..." : "抽出を更新"}
              </button>
              <button 
                onClick={() => setIsFullscreen(true)}
                style={{ padding: '6px', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#475569' }}
                title="全画面表示"
              >
                <Maximize2 size={16} />
              </button>
            </div>
          </div>
          
          {isFullscreen ? createPortal(
            <div 
              className="graph-container fullscreen-graph" 
              ref={containerRef} 
              style={{ 
                background: '#f9fafb', 
                overflow: 'hidden',
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 99999,
                margin: 0,
                padding: 0,
                boxSizing: 'border-box'
              }}
            >
              <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 999999, display: 'flex', gap: '16px', background: 'rgba(255, 255, 255, 0.7)', padding: '12px 16px', borderRadius: '12px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255, 255, 255, 0.4)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>部門視点:</label>
                  <select 
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none' }}
                  >
                    <option value="all">すべて</option>
                    {uniqueDepartments.map(dept => (
                      <option key={dept as string} value={dept as string}>{dept as string}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>表示レイヤー:</label>
                  <select 
                    value={visibleLayer}
                    onChange={(e) => setVisibleLayer(e.target.value as any)}
                    style={{ fontSize: '13px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none' }}
                  >
                    <option value="all">すべて</option>
                    <option value="specific">具体のみ</option>
                    <option value="abstract">抽象概念のみ</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>強調閾値: {highlightThreshold}</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="15" 
                    value={highlightThreshold} 
                    onChange={(e) => setHighlightThreshold(Number(e.target.value))}
                    style={{ width: '80px', accentColor: '#3b82f6' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid #cbd5e1' }}>
                  <label style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }} title="ナレッジが生成された時間でフィルタリングします">時間軸 (Temporal):</label>
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    defaultValue="30"
                    title="※TKGの時系列シミュレーション機能（UI準備）"
                    style={{ width: '80px', accentColor: '#8b5cf6' }}
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>ALL</span>
                </div>
              </div>
              <button 
                onClick={() => setIsFullscreen(false)}
                style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 999999, padding: '10px', background: 'rgba(255, 255, 255, 0.4)', color: '#64748b', border: '1px solid rgba(255,255,255,0.6)', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', transition: 'all 0.2s' }}
                title="全画面を閉じる"
              >
                <Minimize2 size={24} />
              </button>
              {filteredGraphData.nodes.length > 0 ? (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={filteredGraphData}
                  nodeLabel={(node: any) => `
                    <div style="background: rgba(255, 255, 255, 0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; max-width: 250px; font-family: sans-serif; color: #333;">
                      <div style="font-weight: 600; margin-bottom: 4px; font-size: 0.95rem;">${node.name}</div>
                      ${node.description ? `<div style="font-size: 0.8rem; line-height: 1.4; white-space: normal; margin-bottom: 6px;">${node.description}</div>` : ''}
                      ${node.author ? `<div style="font-size: 0.75rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                        <div>👤 ${node.author} ${node.department && node.department !== 'General' ? `<span style="opacity: 0.8;">(${node.department})</span>` : ''}</div>
                        ${node.strategic_persona ? `<div style="color: #1d4ed8; font-weight: 600;">💡 思考特性: ${node.strategic_persona}</div>` : ''}
                      </div>` : ''}
                    </div>
                  `}
                  linkLabel={(link: any) => `
                    <div style="background: rgba(255, 255, 255, 0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; max-width: 250px; font-family: sans-serif; color: #333;">
                      <div style="font-weight: 600; color: #3b82f6; margin-bottom: 4px; font-size: 0.9rem;">関係性: ${link.label || '関連'}</div>
                      ${link.reason ? `<div style="font-size: 0.8rem; line-height: 1.4; white-space: normal; margin-bottom: 6px;">${link.reason}</div>` : ''}
                      ${link.author ? `<div style="font-size: 0.75rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                        <div>👤 ${link.author} ${link.department && link.department !== 'General' ? `<span style="opacity: 0.8;">(${link.department})</span>` : ''}</div>
                        ${link.strategic_persona ? `<div style="color: #1d4ed8; font-weight: 600;">💡 思考特性: ${link.strategic_persona}</div>` : ''}
                      </div>` : ''}
                      ${link.confidence !== undefined ? `<div style="font-size: 0.75rem; color: ${link.confidence >= 4 ? '#10b981' : link.confidence <= 2 ? '#ef4444' : '#f59e0b'}; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px; font-weight: 600;">確信度: ${link.confidence} / 5</div>` : ''}
                    </div>
                  `}
                  nodeColor={(node: any) => {
                    const alpha = visibleLayer === 'all' || (node.layer || 'specific') === visibleLayer ? 1.0 : 0.15;
                    return node.layer === 'abstract' ? `rgba(139, 92, 246, ${alpha})` : (node.group === 'strategy' ? `rgba(245, 158, 11, ${alpha})` : node.group === 'kpi' ? `rgba(16, 185, 129, ${alpha})` : `rgba(59, 130, 246, ${alpha})`);
                  }}
                  linkColor={(link: any) => {
                    const sLayer = (link.source.layer || 'specific');
                    const tLayer = (link.target.layer || 'specific');
                    const isVisible = visibleLayer === 'all' || (sLayer === visibleLayer && tLayer === visibleLayer);
                    const alpha = isVisible ? 1.0 : 0.1;
                    if (link.label === '抽象化') return `rgba(196, 181, 253, ${alpha})`;
                    if (link.confidence && link.confidence <= 2) return `rgba(239, 68, 68, ${alpha * 0.5})`;
                    return `rgba(203, 213, 225, ${alpha})`;
                  }}
                  linkLineDash={(link: any) => link.label === '抽象化' ? [2, 2] : (link.confidence && link.confidence <= 2 ? [4, 4] : null)}
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleSpeed={0.005}
                  linkDirectionalParticleWidth={2}
                  linkDirectionalParticleColor={() => '#3b82f6'}
                  width={dimensions.width}
                  height={dimensions.height}
                  backgroundColor="#f9fafb"
                  nodeCanvasObject={renderNode}
                  nodePointerAreaPaint={paintNodePointer}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  グラフデータがありません。
                </div>
              )}
            </div>,
            document.body
          ) : (
            <>
            <div 
              className="graph-container" 
              ref={containerRef} 
              style={{ 
                flex: 1, 
                minHeight: 0, 
                minWidth: 0,
                background: '#f9fafb', 
                borderRadius: '8px', 
                border: '1px solid var(--glass-border)', 
                overflow: 'hidden',
                position: 'relative',
                width: '100%',
                height: '100%',
                zIndex: 1,
                margin: 0,
                padding: 0,
                boxSizing: 'border-box'
              }}
            >
              {filteredGraphData.nodes.length > 0 ? (
                <ForceGraph2D
                  ref={graphRef}
                  graphData={filteredGraphData}
                  nodeLabel={(node: any) => `
                    <div style="background: rgba(255, 255, 255, 0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid ${node.layer === 'abstract' ? '#c4b5fd' : '#e2e8f0'}; max-width: 250px; font-family: sans-serif; color: #333;">
                      <div style="font-weight: 600; margin-bottom: 4px; font-size: 0.95rem;">${node.layer === 'abstract' ? '✨ ' : ''}${node.name}</div>
                      ${node.description ? `<div style="font-size: 0.8rem; line-height: 1.4; white-space: normal; margin-bottom: 6px;">${node.description}</div>` : ''}
                      ${node.author ? `<div style="font-size: 0.75rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                        <div>👤 ${node.author} ${node.department && node.department !== 'General' ? `<span style="opacity: 0.8;">(${node.department})</span>` : ''}</div>
                        ${node.strategic_persona ? `<div style="color: #1d4ed8; font-weight: 600;">💡 思考特性: ${node.strategic_persona}</div>` : ''}
                      </div>` : ''}
                    </div>
                  `}
                  linkLabel={(link: any) => `
                    <div style="background: rgba(255, 255, 255, 0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0; max-width: 250px; font-family: sans-serif; color: #333;">
                      <div style="font-weight: 600; color: #3b82f6; margin-bottom: 4px; font-size: 0.9rem;">関係性: ${link.label || '関連'}</div>
                      ${link.reason ? `<div style="font-size: 0.8rem; line-height: 1.4; white-space: normal; margin-bottom: 6px;">${link.reason}</div>` : ''}
                      ${link.author ? `<div style="font-size: 0.75rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                        <div>👤 ${link.author} ${link.department && link.department !== 'General' ? `<span style="opacity: 0.8;">(${link.department})</span>` : ''}</div>
                        ${link.strategic_persona ? `<div style="color: #1d4ed8; font-weight: 600;">💡 思考特性: ${link.strategic_persona}</div>` : ''}
                      </div>` : ''}
                      ${link.confidence !== undefined ? `<div style="font-size: 0.75rem; color: ${link.confidence >= 4 ? '#10b981' : link.confidence <= 2 ? '#ef4444' : '#f59e0b'}; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px; font-weight: 600;">確信度: ${link.confidence} / 5</div>` : ''}
                    </div>
                  `}
                  nodeColor={(node: any) => {
                    const alpha = visibleLayer === 'all' || (node.layer || 'specific') === visibleLayer ? 1.0 : 0.15;
                    return node.layer === 'abstract' ? `rgba(139, 92, 246, ${alpha})` : (node.group === 'strategy' ? `rgba(245, 158, 11, ${alpha})` : node.group === 'kpi' ? `rgba(16, 185, 129, ${alpha})` : `rgba(59, 130, 246, ${alpha})`);
                  }}
                  linkColor={(link: any) => {
                    const sLayer = (link.source.layer || 'specific');
                    const tLayer = (link.target.layer || 'specific');
                    const isVisible = visibleLayer === 'all' || (sLayer === visibleLayer && tLayer === visibleLayer);
                    const alpha = isVisible ? 1.0 : 0.1;
                    if (link.label === '抽象化') return `rgba(196, 181, 253, ${alpha})`;
                    if (link.confidence && link.confidence <= 2) return `rgba(239, 68, 68, ${alpha * 0.5})`;
                    return `rgba(203, 213, 225, ${alpha})`;
                  }}
                  linkLineDash={(link: any) => link.label === '抽象化' ? [2, 2] : (link.confidence && link.confidence <= 2 ? [4, 4] : null)}
                  linkDirectionalArrowLength={3.5}
                  linkDirectionalArrowRelPos={1}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleSpeed={0.005}
                  linkDirectionalParticleWidth={2}
                  linkDirectionalParticleColor={() => '#3b82f6'}
                  width={dimensions.width}
                  height={dimensions.height}
                  backgroundColor="#f9fafb"
                  nodeCanvasObject={renderNode}
                  nodePointerAreaPaint={paintNodePointer}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  グラフデータがありません。
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--glass-border)', padding: '16px' }}>
              <div style={{ padding: '0 0 12px 0', borderBottom: '1px solid #e2e8f0', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#1e293b' }}>🎯 戦略のキードライバー（影響度の高い変数）</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>ナレッジグラフ内で最も多くの因果関係（エッジ）を持つ、波及効果の高い重要変数のトップ10</p>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    if (!filteredGraphData.nodes || filteredGraphData.nodes.length === 0) return <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>データがありません</p>;
                    const sortedNodes = [...(filteredGraphData.nodes as any[])].sort((a, b) => (b.val || 0) - (a.val || 0)).slice(0, 10);
                    return sortedNodes.map((node: any, idx: number) => (
                      <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 16px' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: idx < 3 ? '#eab308' : '#94a3b8', width: '24px', textAlign: 'center' }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {node.layer === 'abstract' && <Sparkles size={14} color="#8b5cf6" />}
                            {node.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '8px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', background: node.layer === 'abstract' ? '#ede9fe' : '#f1f5f9', color: node.layer === 'abstract' ? '#6d28d9' : 'inherit', fontWeight: 500 }}>
                              {node.layer === 'abstract' ? '抽象概念' : (node.group === 'strategy' ? '戦略' : node.group === 'kpi' ? 'KPI' : node.group === 'challenge' ? '課題' : node.group === 'resource' ? 'リソース' : '環境')}
                            </span>
                            {node.author && <span>👤 {node.author}</span>}
                          </div>
                        </div>
                        <div style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          🔗 {node.val || 0} 接続
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
            </>
          )}
        </div>
        <div className="glass-panel list-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <h3>🏆 ナレッジ参照ランキング</h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>AIによる戦略立案・壁打ちで多く活用された重要資料のトップ5</p>
            <ul className="trace-list" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ranking.length > 0 ? (
                ranking.map((doc, idx) => (
                  <li key={doc.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: idx < 3 ? '#eab308' : '#94a3b8', width: '24px', textAlign: 'center' }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: '#334155', marginBottom: '4px', fontSize: '0.95rem' }}>{doc.filename}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {doc.summary || '要約なし'}
                      </div>
                    </div>
                    <div style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {doc.reference_count || 0} 回
                    </div>
                  </li>
                ))
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '20px 0' }}>まだナレッジが参照されていません</p>
              )}
            </ul>
          </div>
          
          <div>
            <h3>🧩 活用されたフレームワーク</h3>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '16px' }}>対話や資料内でAIが検知・活用した標準フレームワーク</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {frameworks.length > 0 ? (
                frameworks.map((fw) => (
                  <div key={fw.id} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }} title={fw.description}>
                    <span style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>{fw.name}</span>
                    <span style={{ background: '#fff', color: '#64748b', borderRadius: '10px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid #e2e8f0' }}>{fw.reference_count}</span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', width: '100%', textAlign: 'center', padding: '10px 0' }}>まだフレームワークが検知されていません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
