import React, { useState, useEffect, useRef, useMemo } from 'react';
import { API_BASE_URL } from '../api';
import ForceGraph2D from 'react-force-graph-2d';
import { RefreshCw, Play, Loader, Map, Maximize, Minimize, Info, ChevronLeft, ChevronRight, X, Sparkles, Activity, Scale } from 'lucide-react';

interface NodeData {
  id: string;
  name: string;
  group?: string;
  layer?: string;
  x?: number;
  y?: number;
}

interface EdgeData {
  source: string | NodeData;
  target: string | NodeData;
  label: string;
  confidence?: number;
  polarity?: string;
}

interface CausalLoop {
  id: string;
  nodes: NodeData[];
  edges: EdgeData[];
}

interface LoopEvaluation {
  type: string;
  description: string;
  edges_polarity: Record<string, string>;
}

import { useCausalLoopGraph } from '../hooks/useCausalLoopGraph';

export const CausalLoopDiagram: React.FC = () => {
  const {
    fullGraph,
    loops,
    selectedNodeLoops,
    activeLoopIndex,
    setActiveLoopIndex,
    evaluationMap,
    isLoadingGraph,
    isEvaluating,
    fetchData,
    handleNodeClick,
    handleEvaluate,
    setSelectedNodeLoops
  } = useCausalLoopGraph();

  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current) {
        await containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      await document.exitFullscreen();
    }
  };

  const selectedLoop = selectedNodeLoops.length > 0 ? selectedNodeLoops[activeLoopIndex] : null;

  useEffect(() => {
    if (selectedLoop) {
      if (graphRef.current) {
        // Zoom to the selected loop nodes
        const loopNodeIds = new Set(selectedLoop.nodes.map(n => n.id));
        const renderedNodes = fullGraph.nodes.filter(n => loopNodeIds.has(n.id) && n.x !== undefined && n.y !== undefined);
        
        if (renderedNodes.length > 0) {
          setTimeout(() => {
            if (graphRef.current) {
              graphRef.current.zoomToFit(1000, 150, (node: any) => loopNodeIds.has(node.id));
            }
          }, 400);
        }
      }
    }
  }, [selectedLoop, fullGraph.nodes.length]);

  const currentEvaluation = selectedLoop ? evaluationMap[selectedLoop.id] : null;

  // グラフ描画データ
  const graphData = useMemo(() => {
    if (!fullGraph.nodes.length) return { nodes: [], links: [] };

    const gNodes = fullGraph.nodes.map(n => ({ ...n }));
    const gLinks = fullGraph.links.map(e => {
      let linkPolarity = '';
      if (currentEvaluation && selectedLoop) {
        const sourceId = typeof e.source === 'object' ? (e.source as any).id : e.source;
        const targetId = typeof e.target === 'object' ? (e.target as any).id : e.target;
        linkPolarity = currentEvaluation.edges_polarity[`${sourceId}|${targetId}`] || '';
      }
      return { ...e, polarity: linkPolarity };
    });
    return { nodes: gNodes, links: gLinks };
  }, [fullGraph, currentEvaluation, selectedLoop]);

  // ハイライト判定ロジック
  const { loopNodeIds, loopEdgeKeys } = useMemo(() => {
    if (!selectedLoop) return { loopNodeIds: new Set(), loopEdgeKeys: new Set() };
    const nIds = new Set(selectedLoop.nodes.map(n => n.id));
    const eKeys = new Set(selectedLoop.edges.map(e => `${e.source}|${e.target}`));
    return { loopNodeIds: nIds, loopEdgeKeys: eKeys };
  }, [selectedLoop]);

  // 全ループに含まれるノードを事前計算（ループ構造の識別用）
  const allLoopNodeIds = useMemo(() => {
    const nIds = new Set<string>();
    loops.forEach(l => {
      l.nodes.forEach(n => nIds.add(n.id));
    });
    return nIds;
  }, [loops]);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, width: '100%', height: '100%', minHeight: '600px', background: '#f9fafb', borderRadius: isFullscreen ? '0' : '12px', overflow: 'hidden', border: isFullscreen ? 'none' : '1px solid var(--glass-border)' }}>
      
      {/* Background Graph */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {(isLoadingGraph) ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Loader className="spinning-icon" size={40} style={{ color: '#9ca3af' }} />
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeLabel="name"
            nodeRelSize={4}
            onNodeClick={handleNodeClick}
            linkColor={(link: any) => {
              if (!link.source || !link.target) return 'rgba(0,0,0,0)';
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              const isLoopEdge = loopEdgeKeys.has(`${sourceId}|${targetId}`);
              
              if (selectedLoop) {
                if (isLoopEdge) {
                  return link.polarity === '+' ? 'rgba(59, 130, 246, 0.7)' : (link.polarity === '-' ? 'rgba(239, 68, 68, 0.7)' : 'rgba(75, 85, 99, 0.7)');
                }
                return 'rgba(209, 213, 219, 0.15)'; 
              }
              
              return 'rgba(156, 163, 175, 0.3)'; 
            }}
            linkWidth={(link: any) => {
              if (!link.source || !link.target) return 0;
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              const isLoopEdge = loopEdgeKeys.has(`${sourceId}|${targetId}`);
              
              if (selectedLoop) {
                return isLoopEdge ? 2 : 0.4;
              }
              return 0.8; 
            }}
            linkCurvature={0.15}
            linkDirectionalArrowLength={(link: any) => {
              if (!link.source || !link.target) return 0;
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              const isLoopEdge = loopEdgeKeys.has(`${sourceId}|${targetId}`);
              
              if (selectedLoop) {
                return isLoopEdge ? 3 : 0.5;
              }
              return 2; 
            }}
            linkDirectionalArrowRelPos={1}
            // 流れるアニメーション（パーティクル）の設定
            linkDirectionalParticles={(link: any) => {
              if (!link.source || !link.target) return 0;
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              const isLoopEdge = loopEdgeKeys.has(`${sourceId}|${targetId}`);
              
              if (selectedLoop) {
                return isLoopEdge ? 4 : 0; 
              }
              return Math.floor(Math.random() * 2) + 1;
            }}
            linkDirectionalParticleWidth={(link: any) => {
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              const isLoopEdge = loopEdgeKeys.has(`${sourceId}|${targetId}`);
              return isLoopEdge ? 3 : 2; 
            }}
            linkDirectionalParticleSpeed={(link: any) => {
              return (link.confidence || 0.5) * 0.003 + 0.0015;
            }}
            linkDirectionalParticleColor={(link: any) => {
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              const isLoopEdge = loopEdgeKeys.has(`${sourceId}|${targetId}`);
              if (selectedLoop) {
                if (isLoopEdge) {
                  return link.polarity === '+' ? '#60a5fa' : (link.polarity === '-' ? '#f87171' : '#9ca3af');
                }
                return 'rgba(0,0,0,0)';
              }
              return 'rgba(156, 163, 175, 0.6)';
            }}
            nodeCanvasObjectMode={() => 'replace'}
            nodeCanvasObject={(node: any, ctx, globalScale) => {
              if (node.x === undefined || node.y === undefined) return;
              const safeScale = Math.max(globalScale, 0.001);
              
              const isHighlighted = !selectedLoop || loopNodeIds.has(node.id);
              const isGlobalLoopNode = allLoopNodeIds.has(node.id); // 何らかのループに属しているか
              
              // Draw node circle
              // ループに属するノードは少し大きく、青色にする
              const nodeSize = selectedLoop ? (isHighlighted ? 4 : 2.5) : (isGlobalLoopNode ? 3.5 : 1.5);
              ctx.beginPath();
              ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI, false);
              
              let fillColor;
              if (selectedLoop) {
                fillColor = isHighlighted ? '#1d4ed8' : 'rgba(156, 163, 175, 0.2)';
              } else {
                fillColor = isGlobalLoopNode ? '#3b82f6' : '#9ca3af'; // ループ所属ノードは青、独立ノードはグレー
              }
              ctx.fillStyle = fillColor;
              ctx.fill();

              // Draw text label only if highlighted and zoomed in enough
              if (isHighlighted && safeScale >= 1.2) {
                const label = node.name || '';
                const fontSize = selectedLoop ? 12 / safeScale : 10 / safeScale;
                ctx.font = `${selectedLoop ? '600' : '400'} ${fontSize}px Inter, "Noto Sans JP", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                
                // Text background
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2); 
                ctx.fillStyle = 'rgba(249, 250, 251, 0.7)';
                ctx.fillRect(
                  node.x - bckgDimensions[0] / 2, 
                  node.y + nodeSize + 2/safeScale, 
                  bckgDimensions[0], 
                  bckgDimensions[1]
                );

                ctx.fillStyle = selectedLoop ? '#0f172a' : (isGlobalLoopNode ? '#1e3a8a' : '#475569');
                ctx.fillText(label, node.x, node.y + nodeSize + 2/safeScale + fontSize * 0.1);
              }
            }}
          />
        )}
      </div>

      {/* Top Right Controls */}
      <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px' }}>
        <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', border: '1px solid #d1d5db', color: '#374151', borderRadius: '8px' }} title="再読み込み">
          <RefreshCw size={18} />
        </button>
        <button onClick={toggleFullscreen} className="btn-secondary" style={{ padding: '8px', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)', border: '1px solid #d1d5db', color: '#374151', borderRadius: '8px' }} title="全画面表示">
          {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
        </button>
      </div>

      {/* Instructional Tooltip when nothing is selected */}
      {!selectedLoop && !isLoadingGraph && (
        <div style={{ position: 'absolute', bottom: '24px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(17, 24, 39, 0.85)', backdropFilter: 'blur(8px)', color: 'white', padding: '12px 24px', borderRadius: '30px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', pointerEvents: 'none' }}>
          <Info size={18} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>青い点のノードをクリックして、因果ループを探索してください</span>
        </div>
      )}

      {/* Floating Panel: Node & Loop Evaluation */}
      {selectedNodeLoops.length > 0 && selectedLoop && (
        <div style={{ position: 'absolute', top: '20px', left: '20px', width: '380px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(229, 231, 235, 0.6)', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100% - 40px)' }}>
          
          {/* Header */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
              <Map size={18} />
              システムの力学構造
            </h2>
            <button onClick={() => setSelectedNodeLoops([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ overflowY: 'auto', padding: '20px' }}>
            
            {/* Multiple Loops Paginator */}
            {selectedNodeLoops.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f1f5f9', padding: '8px 12px', borderRadius: '8px', marginBottom: '20px' }}>
                <button 
                  disabled={activeLoopIndex === 0} 
                  onClick={() => setActiveLoopIndex(prev => prev - 1)}
                  style={{ background: 'none', border: 'none', cursor: activeLoopIndex === 0 ? 'not-allowed' : 'pointer', color: activeLoopIndex === 0 ? '#cbd5e1' : '#334155' }}
                >
                  <ChevronLeft size={20} />
                </button>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                  関連ループ {activeLoopIndex + 1} / {selectedNodeLoops.length}
                </div>
                <button 
                  disabled={activeLoopIndex === selectedNodeLoops.length - 1} 
                  onClick={() => setActiveLoopIndex(prev => prev + 1)}
                  style={{ background: 'none', border: 'none', cursor: activeLoopIndex === selectedNodeLoops.length - 1 ? 'not-allowed' : 'pointer', color: activeLoopIndex === selectedNodeLoops.length - 1 ? '#cbd5e1' : '#334155' }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {/* Loop Path */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>連鎖パス</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                {selectedLoop.nodes.map((n, i) => (
                  <React.Fragment key={n.id}>
                    <span style={{ background: '#e2e8f0', color: '#0f172a', padding: '4px 10px', borderRadius: '16px', fontSize: '0.85rem', fontWeight: 500 }}>
                      {n.name}
                    </span>
                    {i < selectedLoop.nodes.length - 1 && <span style={{ color: '#94a3b8' }}>→</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div style={{ height: '1px', background: '#e5e7eb', margin: '20px 0' }}></div>

            {/* Evaluation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} style={{ color: '#8b5cf6' }} />
                AIによる極性判定
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => handleEvaluate(selectedLoop)} 
                  disabled={isEvaluating}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: isEvaluating ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: isEvaluating ? '#94a3b8' : 'white', border: 'none', borderRadius: '8px', padding: '6px 14px',
                    fontSize: '0.85rem', fontWeight: 600, cursor: isEvaluating ? 'not-allowed' : 'pointer',
                    boxShadow: isEvaluating ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.25)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isEvaluating ? <Loader size={14} className="spinning-icon" /> : <Play size={14} fill="currentColor" />}
                  {isEvaluating ? '判定中...' : '構造を評価する'}
                </button>
                <button 
                  onClick={fetchData} 
                  title="再読み込み"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', 
                    borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            {currentEvaluation ? (
              <div style={{ animation: 'fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div style={{ 
                  display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, 
                  padding: '6px 14px', borderRadius: '20px', marginBottom: '14px',
                  background: currentEvaluation.type === 'Reinforcing' ? '#eff6ff' : '#fdf2f8',
                  color: currentEvaluation.type === 'Reinforcing' ? '#2563eb' : '#db2777',
                  border: currentEvaluation.type === 'Reinforcing' ? '1px solid #bfdbfe' : '1px solid #fbcfe8'
                }}>
                  {currentEvaluation.type === 'Reinforcing' ? <Activity size={14} /> : <Scale size={14} />}
                  {currentEvaluation.type === 'Reinforcing' ? '自己強化ループ (R)' : 'バランス・ループ (B)'}
                </div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: '#334155', lineHeight: '1.7', letterSpacing: '0.01em' }}>
                  {currentEvaluation.description}
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6' }}>
                このループ構造が組織にどのような力学（成長、衰退、または停滞）をもたらしているかAIが判定し、グラフ上の極性を可視化します。
              </p>
            )}

            {/* Legend */}
            <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px dashed #cbd5e1', fontSize: '0.8rem', color: '#475569', display: 'flex', gap: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                <div style={{ width: '16px', height: '4px', background: '#3b82f6', borderRadius: '2px' }}></div> 
                <span style={{ color: '#2563eb' }}>(+) 自己強化</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
                <div style={{ width: '16px', height: '4px', background: '#ef4444', borderRadius: '2px' }}></div> 
                <span style={{ color: '#dc2626' }}>(-) バランス</span>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};
