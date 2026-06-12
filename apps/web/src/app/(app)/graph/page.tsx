'use client';

import { useState, useCallback, useMemo } from 'react'; // eslint-disable-line @typescript-eslint/no-unused-vars
import useSWR from 'swr';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeProps,
  BackgroundVariant,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api, type GraphData } from '@/lib/api';

// ── Custom node types ────────────────────────────────────────────────────────

type ArticleNodeData = {
  label: string;
  importance: 'high' | 'normal' | 'junk';
  ts?: string;
  nodeType: 'article';
};

type EntityNodeData = {
  label: string;
  entityType: string;
  nodeType: 'entity';
};

function ArticleNode({ data, selected }: NodeProps) {
  const d = data as ArticleNodeData;
  const colors = {
    high:   { bg: '#2d1515', border: '#ef4444', dot: '#ef4444' },
    normal: { bg: '#2a2510', border: '#eab308', dot: '#eab308' },
    junk:   { bg: '#18191e', border: '#4b5563', dot: '#6b7280' },
  };
  const c = colors[d.importance] ?? colors.junk;
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          background: c.bg,
          border: `1px solid ${selected ? '#3b82f6' : c.border}`,
          borderRadius: 8,
          padding: '6px 10px',
          minWidth: 120,
          maxWidth: 200,
          boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#e5e7eb', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {d.label}
          </span>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

function EntityNode({ data, selected }: NodeProps) {
  const d = data as EntityNodeData;
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    PERSON:       { bg: '#1e1530', border: '#8b5cf6', text: '#a78bfa' },
    ORGANIZATION: { bg: '#111d35', border: '#3b82f6', text: '#60a5fa' },
    LOCATION:     { bg: '#0f2418', border: '#10b981', text: '#34d399' },
    EVENT:        { bg: '#2a1a0e', border: '#f97316', text: '#fb923c' },
  };
  const c = colors[d.entityType] ?? { bg: '#1a1a1a', border: '#6b7280', text: '#9ca3af' };
  const shortKind = d.entityType === 'ORGANIZATION' ? 'ORG' : d.entityType?.slice(0, 3) ?? 'ENT';
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        style={{
          background: c.bg,
          border: `1px solid ${selected ? '#3b82f6' : c.border}`,
          borderRadius: 20,
          padding: '5px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          boxShadow: selected ? '0 0 0 2px rgba(59,130,246,0.3)' : 'none',
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 600, color: c.text, opacity: 0.7 }}>{shortKind}</span>
        <span style={{ fontSize: 11, color: c.text, fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {d.label}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

const NODE_TYPES = { articleNode: ArticleNode, entityNode: EntityNode };

// ── Layout computation ───────────────────────────────────────────────────────

function computeLayout(
  apiNodes: GraphData['nodes'],
  apiEdges: GraphData['edges'],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const entities = apiNodes.filter((n) => n.type === 'entity');
  const articles = apiNodes.filter((n) => n.type === 'article');

  const eR = Math.max(350, entities.length * 55);
  entities.forEach((e, i) => {
    const angle = (2 * Math.PI * i) / Math.max(entities.length, 1) - Math.PI / 2;
    positions.set(e.id, { x: Math.cos(angle) * eR, y: Math.sin(angle) * eR });
  });

  articles.forEach((a, i) => {
    const connected = apiEdges
      .filter((e) => e.source === a.id)
      .map((e) => positions.get(e.target))
      .filter(Boolean) as { x: number; y: number }[];

    if (connected.length > 0) {
      const cx = connected.reduce((s, p) => s + p.x, 0) / connected.length;
      const cy = connected.reduce((s, p) => s + p.y, 0) / connected.length;
      const jitter = (Math.sin(i * 7.3) * 40);
      positions.set(a.id, { x: cx * 0.42 + jitter, y: cy * 0.42 + jitter });
    } else {
      const cols = Math.max(1, Math.ceil(Math.sqrt(articles.length)));
      const row = Math.floor(i / cols) - Math.floor(articles.length / cols / 2);
      const col = (i % cols) - cols / 2;
      positions.set(a.id, { x: col * 160, y: row * 90 });
    }
  });

  return positions;
}

function toRFNodes(apiNodes: GraphData['nodes'], positions: Map<string, { x: number; y: number }>): Node[] {
  return apiNodes.map((n) => ({
    id: n.id,
    type: n.type === 'article' ? 'articleNode' : 'entityNode',
    position: positions.get(n.id) ?? { x: 0, y: 0 },
    data: {
      label: n.label,
      nodeType: n.type,
      importance: n.importance ?? 'normal',
      entityType: n.entityType ?? 'OTHER',
    },
  }));
}

function toRFEdges(apiEdges: GraphData['edges']): Edge[] {
  return apiEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: {
      stroke: e.type === 'co_mention' ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)',
      strokeWidth: e.type === 'co_mention' ? Math.min(3, (e.weight ?? 1) * 0.8) : 1,
    },
    animated: false,
  }));
}

// ── Inner graph (needs ReactFlowProvider) ────────────────────────────────────

function GraphCanvas({ graphData }: { graphData: GraphData }) {
  const positions = useMemo(
    () => computeLayout(graphData.nodes, graphData.edges),
    [graphData],
  );
  const [nodes, , onNodesChange] = useNodesState(toRFNodes(graphData.nodes, positions));
  const [edges, , onEdgesChange] = useEdgesState(toRFEdges(graphData.edges));

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={NODE_TYPES}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.1}
      maxZoom={3}
      style={{ background: '#0d0f14' }}
    >
      <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.04)" gap={24} size={1} />
      <Controls
        style={{
          background: '#1a1f2e',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
        }}
      />
      <MiniMap
        style={{ background: '#151820', border: '1px solid rgba(255,255,255,0.06)' }}
        nodeColor={(n) => {
          const d = n.data as { nodeType?: string; importance?: string; entityType?: string };
          if (d.nodeType === 'entity') {
            if (d.entityType === 'PERSON') {return '#8b5cf6';}
            if (d.entityType === 'ORGANIZATION') {return '#3b82f6';}
            if (d.entityType === 'LOCATION') {return '#10b981';}
            return '#6b7280';
          }
          if (d.importance === 'high') {return '#ef4444';}
          if (d.importance === 'normal') {return '#eab308';}
          return '#4b5563';
        }}
      />
    </ReactFlow>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

type NodeTypes = 'all' | 'articles' | 'entities';

export default function GraphPage() {
  const [period, setPeriod] = useState('7d');
  const [nodeTypes, setNodeTypes] = useState<NodeTypes>('all');

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data, isLoading, error } = useSWR<GraphData>(
    `graph-${period}-${nodeTypes}`,
    () => api.graph.get({ period, nodeTypes }),
    { revalidateOnFocus: false },
  );

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-4 px-5 py-3 border-b border-white/5 bg-[#0f1117]">
        <h1 className="text-[14px] font-semibold text-white mr-2">Knowledge Graph</h1>

        {/* Period */}
        <div className="flex gap-0.5 bg-white/5 p-0.5 rounded-md">
          {(['7d', '30d', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                period === p ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {p === 'all' ? 'All' : p}
            </button>
          ))}
        </div>

        {/* Node type */}
        <div className="flex gap-0.5 bg-white/5 p-0.5 rounded-md">
          {([['all', 'All'], ['articles', 'Articles'], ['entities', 'Entities']] as [NodeTypes, string][]).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setNodeTypes(v)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                nodeTypes === v ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Stats */}
        {data && (
          <span className="text-[11px] text-gray-600 ml-auto">
            {data.nodes.length} nodes · {data.edges.length} edges
            {data.trimmed && ` (trimmed from ${data.totalNodes})`}
          </span>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3">
          {[
            { color: '#ef4444', label: 'High' },
            { color: '#eab308', label: 'Normal' },
            { color: '#8b5cf6', label: 'Person' },
            { color: '#3b82f6', label: 'Org' },
            { color: '#10b981', label: 'Location' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="text-[10px] text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graph canvas */}
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0f14] z-10">
            <div className="text-[13px] text-gray-500">Loading graph…</div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0d0f14] z-10">
            <p className="text-red-400 text-sm">Failed to load graph</p>
          </div>
        )}

        {!isLoading && data && data.nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0f14] z-10">
            <p className="text-gray-500 text-sm">No data for this period</p>
            <p className="text-gray-700 text-xs mt-1">Add feeds and let articles be classified</p>
          </div>
        )}

        {data && data.nodes.length > 0 && (
          <ReactFlowProvider>
            <GraphCanvas graphData={data} />
          </ReactFlowProvider>
        )}
      </div>
    </div>
  );
}
