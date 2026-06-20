import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';

export interface NodeData {
  id: string;
  name: string;
  group?: string;
  layer?: string;
  x?: number;
  y?: number;
}

export interface EdgeData {
  source: string | NodeData;
  target: string | NodeData;
  label: string;
  confidence?: number;
  polarity?: string;
}

export interface CausalLoop {
  id: string;
  nodes: NodeData[];
  edges: EdgeData[];
}

export interface LoopEvaluation {
  type: string;
  description: string;
  edges_polarity: Record<string, string>;
}

export const useCausalLoopGraph = () => {
  const [fullGraph, setFullGraph] = useState<{ nodes: NodeData[], links: EdgeData[] }>({ nodes: [], links: [] });
  const [loops, setLoops] = useState<CausalLoop[]>([]);
  
  const [selectedNodeLoops, setSelectedNodeLoops] = useState<CausalLoop[]>([]);
  const [activeLoopIndex, setActiveLoopIndex] = useState(0);
  const [evaluationMap, setEvaluationMap] = useState<Record<string, LoopEvaluation>>({});
  
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoadingGraph(true);
    try {
      const graphRes = await fetch(`${API_BASE_URL}/api/knowledge/graph`);
      const graphData = await graphRes.json();
      
      const nodes = graphData.nodes || [];
      const nodeIds = new Set(nodes.map((n: any) => n.id));
      const links = (graphData.links || []).filter((e: any) => {
        const s = typeof e.source === 'object' ? e.source.id : e.source;
        const t = typeof e.target === 'object' ? e.target.id : e.target;
        return nodeIds.has(s) && nodeIds.has(t);
      });

      setFullGraph({
        nodes: nodes,
        links: links.map((e: any) => ({ ...e, source: e.source, target: e.target }))
      });
    } catch (err) {
      console.error('Failed to fetch full graph', err);
    } finally {
      setIsLoadingGraph(false);
    }

    try {
      const loopRes = await fetch(`${API_BASE_URL}/api/knowledge/causal_loops`);
      const loopData = await loopRes.json();
      setLoops(loopData.loops || []);
    } catch (err) {
      console.error('Failed to fetch loops', err);
    }
  }, []);

  const handleNodeClick = (node: NodeData) => {
    const matchingLoops = loops.filter(l => l.nodes.some(n => n.id === node.id));
    setSelectedNodeLoops(matchingLoops);
    setActiveLoopIndex(0);
  };

  const handleEvaluate = async (selectedLoop: CausalLoop | null) => {
    if (!selectedLoop) return;
    setIsEvaluating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/causal_loops/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedLoop)
      });
      const data = await res.json();
      setEvaluationMap(prev => ({ ...prev, [selectedLoop.id]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
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
  };
};
