import React, { useState } from 'react';
import {
  Network,
  Maximize2,
  Minimize2,
  RefreshCw,
  Compass,
  Radio,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Database,
  Cpu,
  Server,
  Zap,
  Filter,
  Search,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ArchitectureGraph, ArchitectureNode, NodeCategory } from '@/types/architecture';

interface ArchitectureCanvasProps {
  graph: ArchitectureGraph;
  selectedNode: ArchitectureNode | null;
  onNodeClick: (node: ArchitectureNode) => void;
  activeEdgeId?: string | null;
  performanceTiming?: {
    totalMs: number;
    parsingMs: number;
    graphConstructionMs: number;
  };
}

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  graph,
  selectedNode,
  onNodeClick,
  activeEdgeId,
  performanceTiming,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showCoordinateGrid, setShowCoordinateGrid] = useState<boolean>(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [isCardFlipped, setIsCardFlipped] = useState<boolean>(false);

  const categories: (NodeCategory | 'ALL')[] = [
    'ALL',
    'gateway',
    'middleware',
    'service',
    'database',
    'queue',
    'cache',
  ];

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

  const filteredNodes = graph.nodes.filter((node) => {
    const matchesCategory =
      selectedCategoryFilter === 'ALL' || node.category === selectedCategoryFilter;
    const matchesQuery =
      searchQuery === '' ||
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.technology.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.fileOrigin.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  // Determine connected edges for hovered or selected node
  const activeFocusNodeId = hoveredNodeId || selectedNode?.id || null;

  return (
    <div className="relative flex-1 h-full flex flex-col bg-[#dfb2b2] overflow-hidden select-none">
      {/* Top Graphic Centerpiece HUD / Controls Strip */}
      <div className="p-3 border-b border-[#111111] flex flex-wrap items-center justify-between gap-2 bg-[#dfb2b2]/90 backdrop-blur-sm z-20">
        <div className="flex items-center space-x-3">
          <Network className="w-4 h-4 text-[#111111]" />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold tracking-widest text-[#111111] uppercase font-mono">
              ARCHITECTURE.TOPOLOGY // {graph.systemName}
            </span>
            <span className="text-[8px] text-[#111111]/70 font-mono tracking-widest">
              VECTOR RUNTIME: SVG 2D MESH // {graph.nodes.length} VERIFIED NODES
            </span>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex items-center space-x-2 font-mono text-[9px]">
          <div className="relative flex items-center">
            <Search className="w-3 h-3 absolute left-1.5 text-[#111111]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="pl-6 pr-2 py-0.5 border border-[#111111] bg-transparent text-[#111111] text-[9px] w-32 focus:outline-none focus:w-44 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-1 text-[#111111]/60 hover:text-[#111111]"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1">
            <Filter className="w-3 h-3 text-[#111111]/60" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="border border-[#111111] bg-transparent px-1 py-0.5 text-[9px] font-mono"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-[#dfb2b2] text-[#111111]">
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Viewport Control Tools */}
          <button
            onClick={() => setShowCoordinateGrid(!showCoordinateGrid)}
            className={`px-2 py-1 border border-[#111111] tracking-wider transition-colors ${
              showCoordinateGrid
                ? 'bg-[#111111] text-[#dfb2b2]'
                : 'bg-transparent text-[#111111] hover:bg-[#111111]/10'
            }`}
          >
            GRID: {showCoordinateGrid ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setZoomLevel((prev) => Math.max(60, prev - 10))}
            className="p-1 border border-[#111111] hover:bg-[#111111]/10 text-[#111111]"
            title="Zoom Out"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <span className="w-9 text-center font-bold">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((prev) => Math.min(140, prev + 10))}
            className="p-1 border border-[#111111] hover:bg-[#111111]/10 text-[#111111]"
            title="Zoom In"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setZoomLevel(100);
              setSearchQuery('');
              setSelectedCategoryFilter('ALL');
            }}
            className="p-1 border border-[#111111] hover:bg-[#111111]/10 text-[#111111]"
            title="Reset Controls & Zoom"
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
          COORD.ORIGIN [00.00, 00.00] // RECTILINEAR MESH
        </div>
        <div className="absolute bottom-2 right-4 font-mono text-[8px] text-[#111111]/40 tracking-widest pointer-events-none">
          SYSTEM: {graph.systemName} {'//'} NODES: {filteredNodes.length}/{graph.nodes.length}
        </div>

        {/* SVG Directional Edge Vector Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
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
            if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) return null;

            const x1 = `${sourceNode.x}%`;
            const y1 = `${sourceNode.y}%`;
            const x2 = `${targetNode.x}%`;
            const y2 = `${targetNode.y}%`;

            const isHighlighted =
              activeFocusNodeId === edge.source ||
              activeFocusNodeId === edge.target ||
              activeEdgeId === edge.id;

            const isDimmed = activeFocusNodeId && !isHighlighted;

            return (
              <g
                key={edge.id}
                className="transition-opacity duration-200"
                style={{ opacity: isDimmed ? 0.15 : 1 }}
              >
                <path
                  d={`M ${x1} ${y1} Q ${(sourceNode.x + targetNode.x) / 2}% ${
                    (sourceNode.y + targetNode.y) / 2 - (sourceNode.x > targetNode.x ? 6 : -6)
                  }%, ${x2} ${y2}`}
                  fill="none"
                  stroke="#111111"
                  strokeWidth={isHighlighted ? '2.5' : '1.2'}
                  strokeOpacity={isHighlighted ? '0.95' : '0.4'}
                  markerEnd={isHighlighted ? 'url(#arrow-active)' : 'url(#arrow-default)'}
                  className={edge.active ? 'animate-edge-flow' : ''}
                />

                {isHighlighted && (
                  <foreignObject
                    x={`calc(${(sourceNode.x + targetNode.x) / 2}% - 65px)`}
                    y={`calc(${(sourceNode.y + targetNode.y) / 2}% - 14px)`}
                    width="130"
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
        {filteredNodes.map((node) => {
          const isSelected = selectedNode?.id === node.id;
          const isHovered = hoveredNodeId === node.id;
          const isDimmed =
            activeFocusNodeId &&
            activeFocusNodeId !== node.id &&
            !graph.edges.some(
              (e) =>
                (e.source === activeFocusNodeId && e.target === node.id) ||
                (e.target === activeFocusNodeId && e.source === node.id)
            );

          return (
            <div
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                onNodeClick(node);
              }}
              onMouseEnter={() => setHoveredNodeId(node.id)}
              onMouseLeave={() => setHoveredNodeId(null)}
              style={{
                left: `${node.x}%`,
                top: `${node.y}%`,
                transform: `translate(-50%, -50%) scale(${isSelected ? 1.08 : isHovered ? 1.05 : 1})`,
                opacity: isDimmed ? 0.35 : 1,
              }}
              className={`absolute cursor-pointer transition-all duration-200 z-10 group ${
                isSelected
                  ? 'ring-2 ring-[#111111] ring-offset-2 ring-offset-[#dfb2b2] z-30'
                  : isHovered
                  ? 'z-20 shadow-lg'
                  : ''
              }`}
            >
              {/* Node Card Shell */}
              <div
                className={`w-52 border transition-all duration-150 font-mono ${
                  isSelected
                    ? 'border-[#111111] bg-[#111111] text-[#dfb2b2] shadow-2xl'
                    : isHovered
                    ? 'border-[#111111] bg-[#dfb2b2] text-[#111111] shadow-lg'
                    : 'border-[#111111] bg-[#dfb2b2]/95 text-[#111111]'
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
                      className={`text-[11px] font-bold tracking-tight uppercase leading-snug truncate ${
                        isSelected ? 'text-[#dfb2b2]' : 'text-[#111111]'
                      }`}
                    >
                      {node.label}
                    </h4>
                    <span
                      className={`text-[8px] px-1 py-0.2 border uppercase tracking-wider font-bold shrink-0 ml-1 ${
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
                    {node.fileOrigin}
                  </p>

                  {/* Micro Metrics Strip */}
                  <div
                    className={`pt-1.5 border-t grid grid-cols-2 text-[8px] tracking-wider ${
                      isSelected
                        ? 'border-[#dfb2b2]/20 text-[#dfb2b2]/60'
                        : 'border-[#111111]/20 text-[#111111]/70'
                    }`}
                  >
                    <span>IN: {node.dependencies.upstream.length}</span>
                    <span className="text-right">OUT: {node.dependencies.downstream.length}</span>
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
                  <span>{isSelected ? 'SELECTED // EXPAND' : 'CLICK TO INSPECT'}</span>
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </div>
              </div>

              {/* Hover Tooltip Preview */}
              {isHovered && !isSelected && (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 p-2 bg-[#111111] text-[#dfb2b2] text-[8px] font-mono border border-[#111111] shadow-2xl z-40 pointer-events-none">
                  <div className="font-bold text-[9px] text-[#dfb2b2] uppercase truncate">
                    {node.label}
                  </div>
                  <div className="text-[#dfb2b2]/70 truncate">File: {node.fileOrigin}</div>
                  <div className="text-[#dfb2b2]/70">
                    Dependencies: {node.dependencies.upstream.length} upstream / {node.dependencies.downstream.length} downstream
                  </div>
                  {node.symbols && (
                    <div className="text-[#dfb2b2]/50 mt-1 border-t border-[#dfb2b2]/20 pt-1">
                      {node.symbols.length} AST Symbols extracted
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Selected Component Expand/Flip Modal Card Overlay */}
        {selectedNode && isCardFlipped && (
          <div
            onClick={() => setIsCardFlipped(false)}
            className="absolute inset-0 bg-[#111111]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#dfb2b2] border-2 border-[#111111] text-[#111111] font-mono shadow-2xl p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#111111] pb-2">
                <div className="flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-[#111111]" />
                  <span className="font-bold text-xs uppercase tracking-widest">
                    COMPONENT EXPANDED DOSSIER // {selectedNode.label}
                  </span>
                </div>
                <button
                  onClick={() => setIsCardFlipped(false)}
                  className="p-1 hover:bg-[#111111] hover:text-[#dfb2b2] border border-[#111111] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Grid Specifications */}
              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div className="p-2 border border-[#111111] bg-[#dfb2b2]/40">
                  <span className="block text-[8px] text-[#111111]/60 font-bold">CATEGORY</span>
                  <span className="font-bold uppercase">{selectedNode.category}</span>
                </div>
                <div className="p-2 border border-[#111111] bg-[#dfb2b2]/40">
                  <span className="block text-[8px] text-[#111111]/60 font-bold">HEX SIGNATURE</span>
                  <span className="font-bold">{selectedNode.hexId}</span>
                </div>
                <div className="p-2 border border-[#111111] bg-[#dfb2b2]/40 col-span-2">
                  <span className="block text-[8px] text-[#111111]/60 font-bold">SOURCE ORIGIN</span>
                  <span className="font-bold">{selectedNode.fileOrigin}</span>
                </div>
              </div>

              {/* Grounded Symbols */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider block">
                  Discovered Symbols & Routines ({selectedNode.symbols?.length || 0}):
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 text-[9px]">
                  {selectedNode.symbols && selectedNode.symbols.length > 0 ? (
                    selectedNode.symbols.map((sym, i) => (
                      <div
                        key={i}
                        className="p-1 border border-[#111111]/30 bg-[#dfb2b2]/60 flex justify-between items-center"
                      >
                        <span className="font-bold truncate">{sym.name}</span>
                        <span className="text-[8px] text-[#111111]/60">
                          {sym.kind} @ Line {sym.line}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-[9px] text-[#111111]/60 italic p-1">
                      No standalone functions/classes parsed. Operates as module endpoint.
                    </div>
                  )}
                </div>
              </div>

              {/* Plain-English Summary */}
              <div className="p-2.5 bg-[#111111] text-[#dfb2b2] text-[10px] leading-relaxed">
                <div className="text-[8px] tracking-widest text-[#dfb2b2]/60 uppercase mb-1 flex items-center gap-1 font-bold">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>GROUNDED ARCHITECTURAL SUMMARY</span>
                </div>
                <p>{selectedNode.summary}</p>
              </div>

              {/* Close Button */}
              <div className="flex justify-end pt-2 border-t border-[#111111]">
                <button
                  onClick={() => setIsCardFlipped(false)}
                  className="px-4 py-1.5 bg-[#111111] text-[#dfb2b2] text-[9px] font-bold uppercase hover:bg-transparent hover:text-[#111111] border border-[#111111] transition-colors"
                >
                  CLOSE INSPECTOR [ESC]
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Canvas Persistent Bottom HUD */}
      <div className="p-2.5 border-t border-[#111111] bg-[#dfb2b2] flex flex-wrap items-center justify-between text-[9px] font-mono tracking-widest text-[#111111]/80 uppercase z-10">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#111111]" />
            <span>NODES: {filteredNodes.length}/{graph.nodes.length}</span>
          </span>
          <span>{'//'}</span>
          <span>EDGES: {graph.edges.length}</span>
          <span>{'//'}</span>
          <span>ACTIVE PIPELINE: {graph.edges.filter((e) => e.active).length}</span>
          {performanceTiming && (
            <>
              <span>{'//'}</span>
              <span>SYNTHESIS: {performanceTiming.graphConstructionMs}ms</span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {selectedNode && (
            <button
              onClick={() => setIsCardFlipped(true)}
              className="px-2 py-0.5 border border-[#111111] bg-[#111111] text-[#dfb2b2] hover:bg-transparent hover:text-[#111111] transition-colors"
            >
              EXPAND FLIP CARD [{selectedNode.hexId}]
            </button>
          )}
          <div className="flex items-center space-x-1">
            <Compass className="w-3 h-3 text-[#111111]" />
            <span>FOCAL: {selectedNode ? selectedNode.label.toUpperCase() : 'CANVAS ROOT'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ArchitectureCanvas;
