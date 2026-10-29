import React, { useState } from 'react';
import {
  Network,
  Maximize2,
  Minimize2,
  RefreshCw,
  Compass,
  Radio,
  Activity,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Database,
  Cpu,
  Server,
  Zap,
} from 'lucide-react';
import { ArchitectureGraph, ArchitectureNode, ArchitectureEdge } from '@/types/architecture';

interface ArchitectureCanvasProps {
  graph: ArchitectureGraph;
  selectedNode: ArchitectureNode | null;
  onNodeClick: (node: ArchitectureNode) => void;
  activeEdgeId?: string | null;
}

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  graph,
  selectedNode,
  onNodeClick,
  activeEdgeId,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showCoordinateGrid, setShowCoordinateGrid] = useState<boolean>(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Helper to retrieve node icon based on category
  const getNodeIcon = (category: string) => {
    switch (category) {
      case 'gateway':
        return <Server className="w-3.5 h-3.5" />;
      case 'middleware':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'database':
        return <Database className="w-3.5 h-3.5" />;
      case 'queue':
        return <Radio className="w-3.5 h-3.5" />;
      case 'cache':
        return <Zap className="w-3.5 h-3.5" />;
      default:
        return <Cpu className="w-3.5 h-3.5" />;
    }
  };

  const getNodeById = (id: string): ArchitectureNode | undefined => {
    return graph.nodes.find((n) => n.id === id);
  };

  return (
    <div className="relative flex-1 h-full flex flex-col bg-[#dfb2b2] overflow-hidden select-none">
      {/* Top Graphic Centerpiece HUD / Telemetry Strip */}
      <div className="p-3 border-b border-[#111111] flex items-center justify-between bg-[#dfb2b2]/90 backdrop-blur-sm z-10">
        <div className="flex items-center space-x-3">
          <Network className="w-4 h-4 text-[#111111]" />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[#111111] uppercase font-mono">
              ARCHITECTURE.TOPOLOGY // {graph.systemName}
            </span>
            <span className="text-[8px] text-[#111111]/70 font-mono tracking-widest">
              VECTOR RUNTIME: SVG 2D MESH // DYNAMIC FLOW ENGINE
            </span>
          </div>
        </div>

        {/* Viewport Control Tools */}
        <div className="flex items-center space-x-2 font-mono text-[9px]">
          <button
            onClick={() => setShowCoordinateGrid(!showCoordinateGrid)}
            className={`px-2 py-1 border border-[#111111] tracking-wider transition-colors ${
              showCoordinateGrid
                ? 'bg-[#111111] text-[#dfb2b2]'
                : 'bg-transparent text-[#111111] hover:bg-[#111111]/10'
            }`}
          >
            GRID: {showCoordinateGrid ? 'ACTIVE' : 'OFF'}
          </button>
          <button
            onClick={() => setZoomLevel((prev) => Math.max(75, prev - 10))}
            className="p-1 border border-[#111111] hover:bg-[#111111]/10 text-[#111111]"
            title="Zoom Out"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <span className="w-10 text-center font-bold">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
            className="p-1 border border-[#111111] hover:bg-[#111111]/10 text-[#111111]"
            title="Zoom In"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => setZoomLevel(100)}
            className="p-1 border border-[#111111] hover:bg-[#111111]/10 text-[#111111]"
            title="Reset Zoom"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Vector Rendering Canvas */}
      <div
        className={`relative flex-1 overflow-hidden transition-all duration-300 ${
          showCoordinateGrid ? 'bg-editorial-grid' : ''
        }`}
        style={{
          transform: `scale(${zoomLevel / 100})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Subtle Spatial Coordinate Rulers & Crosshairs */}
        <div className="absolute top-2 left-3 font-mono text-[8px] text-[#111111]/40 tracking-widest pointer-events-none">
          COORD.ORIGIN [00.00, 00.00]
        </div>
        <div className="absolute bottom-2 right-4 font-mono text-[8px] text-[#111111]/40 tracking-widest pointer-events-none">
          VIEWPORT BOUNDARY [1920.00, 1080.00] // SCALE: 1.0X
        </div>

        {/* SVG Directional Edge Vector Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Arrow Marker Definitions */}
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#111111" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#111111" />
            </marker>
          </defs>

          {/* Render Active & Passive Edges with Curved Trajectories */}
          {graph.edges.map((edge) => {
            const sourceNode = getNodeById(edge.source);
            const targetNode = getNodeById(edge.target);

            if (!sourceNode || !targetNode) return null;

            const x1 = `${sourceNode.x}%`;
            const y1 = `${sourceNode.y}%`;
            const x2 = `${targetNode.x}%`;
            const y2 = `${targetNode.y}%`;

            const isHighlighted =
              selectedNode?.id === edge.source ||
              selectedNode?.id === edge.target ||
              hoveredNodeId === edge.source ||
              hoveredNodeId === edge.target ||
              activeEdgeId === edge.id;

            return (
              <g key={edge.id} className="transition-opacity duration-300">
                {/* Background Shadow / Hit Area */}
                <path
                  d={`M ${x1} ${y1} Q ${(sourceNode.x + targetNode.x) / 2}% ${
                    (sourceNode.y + targetNode.y) / 2 - (sourceNode.x > targetNode.x ? 6 : -6)
                  }%, ${x2} ${y2}`}
                  fill="none"
                  stroke={isHighlighted ? '#111111' : '#111111'}
                  strokeWidth={isHighlighted ? '2.5' : '1.2'}
                  strokeOpacity={isHighlighted ? '0.9' : '0.35'}
                  markerEnd={isHighlighted ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                  className={edge.active ? 'animate-edge-flow' : ''}
                />

                {/* Subtle Flow Midpoint Label Pill */}
                {isHighlighted && (
                  <foreignObject
                    x={`calc(${(sourceNode.x + targetNode.x) / 2}% - 60px)`}
                    y={`calc(${(sourceNode.y + targetNode.y) / 2}% - 14px)`}
                    width="120"
                    height="28"
                  >
                    <div className="bg-[#111111] text-[#dfb2b2] text-[8px] font-mono font-bold tracking-widest text-center py-0.5 px-1.5 border border-[#111111] shadow-sm uppercase truncate">
                      {edge.flowLabel}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>

        {/* Structural Interactive Nodes Layer */}
        {graph.nodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const isHovered = hoveredNodeId === node.id;

          return (
            <div
              key={node.id}
              onClick={() => onNodeClick(node)}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
              className={`absolute cursor-pointer transition-all duration-300 z-10 group ${
                isSelected
                  ? 'scale-105 ring-2 ring-[#111111] ring-offset-2 ring-offset-[#dfb2b2]'
                  : 'hover:scale-102'
              }`}
            >
              {/* Node Card Shell */}
              <div
                className={`w-52 border transition-all duration-200 font-mono ${
                  isSelected
                    ? 'border-[#111111] bg-[#111111] text-[#dfb2b2] shadow-xl'
                    : isHovered
                    ? 'border-[#111111] bg-[#dfb2b2] text-[#111111] shadow-md'
                    : 'border-[#111111] bg-[#dfb2b2]/90 text-[#111111]'
                }`}
              >
                {/* Node Card Top Header */}
                <div
                  className={`flex items-center justify-between px-2.5 py-1.5 border-b text-[8px] tracking-widest uppercase ${
                    isSelected
                      ? 'border-[#dfb2b2]/30 text-[#dfb2b2]/80'
                      : 'border-[#111111] bg-[#111111]/10 text-[#111111]/80'
                  }`}
                >
                  <span className="flex items-center space-x-1">
                    {getNodeIcon(node.category)}
                    <span className="font-bold">{node.category}</span>
                  </span>
                  <span className="font-mono font-bold">{node.hexId}</span>
                </div>

                {/* Node Main Body */}
                <div className="p-2.5 space-y-1.5">
                  <div className="flex items-start justify-between">
                    <h4
                      className={`text-[11px] font-bold tracking-tight uppercase leading-snug ${
                        isSelected ? 'text-[#dfb2b2]' : 'text-[#111111]'
                      }`}
                    >
                      {node.label}
                    </h4>
                    <span
                      className={`text-[8px] px-1 py-0.2 border uppercase tracking-wider font-bold ${
                        node.status === 'HEALTHY'
                          ? 'border-emerald-700 text-emerald-800 bg-emerald-500/10'
                          : 'border-[#111111] text-[#111111]'
                      }`}
                    >
                      {node.status}
                    </span>
                  </div>

                  <p
                    className={`text-[9px] line-clamp-1 truncate font-mono ${
                      isSelected ? 'text-[#dfb2b2]/70' : 'text-[#111111]/70'
                    }`}
                  >
                    {node.technology}
                  </p>

                  {/* Micro Metrics Strip */}
                  <div
                    className={`pt-1.5 border-t grid grid-cols-2 text-[8px] tracking-wider ${
                      isSelected ? 'border-[#dfb2b2]/20 text-[#dfb2b2]/60' : 'border-[#111111]/20 text-[#111111]/70'
                    }`}
                  >
                    <span>LATENCY: {node.metrics.latency}</span>
                    <span className="text-right truncate">{node.metrics.throughput}</span>
                  </div>
                </div>

                {/* Node Bottom Action Hint */}
                <div
                  className={`px-2.5 py-1 border-t flex items-center justify-between text-[8px] tracking-widest uppercase transition-opacity ${
                    isSelected
                      ? 'border-[#dfb2b2]/30 text-[#dfb2b2]'
                      : 'border-[#111111]/30 text-[#111111]/60 group-hover:text-[#111111]'
                  }`}
                >
                  <span>INSPECT NODE</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canvas Persistent Bottom HUD */}
      <div className="p-2.5 border-t border-[#111111] bg-[#dfb2b2] flex items-center justify-between text-[9px] font-mono tracking-widest text-[#111111]/80 uppercase z-10">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#111111]" />
            <span>RENDERED NODES: {graph.nodes.length}</span>
          </span>
          <span>//</span>
          <span>CONNECTIONS: {graph.edges.length}</span>
          <span>//</span>
          <span>ACTIVE PIPELINE: {graph.edges.filter((e) => e.active).length} STREAMING</span>
        </div>

        <div className="flex items-center space-x-2">
          <Compass className="w-3 h-3 text-[#111111]" />
          <span>FOCAL TARGET: {selectedNode ? selectedNode.label.toUpperCase() : 'CANVAS ROOT'}</span>
        </div>
      </div>
    </div>
  );
};
export default ArchitectureCanvas;
