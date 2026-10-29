import React, { useState, useRef, useEffect } from 'react';
import {
  Network,
  Maximize2,
  Minimize2,
  RefreshCw,
  Radio,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Database,
  Cpu,
  Server,
  Zap,
  Search,
  X,
  Layers,
  Sparkles,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronRight,
} from 'lucide-react';
import {
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureEdge,
  NodeCategory,
  HierarchyLevel,
  UmlDiagramMode,
  ArchitectureTemplate,
  ExecutionStep,
  SequenceMessage,
  ClassInfo,
} from '@/types/architecture';

interface ArchitectureCanvasProps {
  graph: ArchitectureGraph;
  allLevelNodes?: {
    system: ArchitectureNode[];
    component: ArchitectureNode[];
    file: ArchitectureNode[];
    symbol: ArchitectureNode[];
    execution: ArchitectureNode[];
  };
  allLevelEdges?: {
    system: ArchitectureEdge[];
    component: ArchitectureEdge[];
    file: ArchitectureEdge[];
    symbol: ArchitectureEdge[];
    execution: ArchitectureEdge[];
  };
  selectedNode: ArchitectureNode | null;
  onNodeClick: (node: ArchitectureNode) => void;
  onViewSource?: (filePath: string, line: number) => void;
  activeEdgeId?: string | null;
  performanceTiming?: {
    totalMs: number;
    parsingMs: number;
    graphConstructionMs: number;
  };
  executionTraces?: ExecutionStep[];
  sequenceMessages?: SequenceMessage[];
  classes?: ClassInfo[];
}

export const ArchitectureCanvas: React.FC<ArchitectureCanvasProps> = ({
  graph,
  allLevelNodes,
  allLevelEdges,
  selectedNode,
  onNodeClick,
  onViewSource,
  activeEdgeId,
  performanceTiming,
  executionTraces = [],
  sequenceMessages = [],
  classes = [],
}) => {
  // Navigation & Hierarchy State
  const [activeLevel, setActiveLevel] = useState<HierarchyLevel>('COMPONENT');
  const [activeUmlMode, setActiveUmlMode] = useState<UmlDiagramMode>('COMPONENT_DIAGRAM');
  const [activeTemplate, setActiveTemplate] = useState<ArchitectureTemplate>('MICROSERVICES');

  // Canvas Viewport & Pan/Zoom State
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showCoordinateGrid, setShowCoordinateGrid] = useState<boolean>(true);
  const [showMinimap, setShowMinimap] = useState<boolean>(true);

  // Search & Filter State
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<NodeCategory | 'ALL'>('ALL');
  const [focusDependenciesMode, setFocusDependenciesMode] = useState<'ALL' | 'UPSTREAM' | 'DOWNSTREAM'>('ALL');

  // Live Data-Flow Simulation State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [simulationSpeedMs] = useState<number>(1500);

  const canvasRef = useRef<HTMLDivElement>(null);

  // Determine current active node set based on level or UML mode
  const currentNodes: ArchitectureNode[] = React.useMemo(() => {
    let nodes: ArchitectureNode[];
    if (activeUmlMode === 'CLASS_DIAGRAM') {
      nodes = (allLevelNodes?.file || graph.nodes).filter((n) => n.category === 'module' || n.symbols?.some((s) => s.kind === 'class' || s.kind === 'interface'));
    } else if (activeUmlMode === 'FILE_DEPENDENCY') {
      nodes = allLevelNodes?.file || [];
    } else if (activeUmlMode === 'CALL_GRAPH' || activeUmlMode === 'DATA_FLOW') {
      nodes = allLevelNodes?.symbol || [];
    } else {
      nodes = activeLevel === 'SYSTEM'
      ? allLevelNodes?.system || []
      : activeLevel === 'FILE'
      ? allLevelNodes?.file || []
      : activeLevel === 'SYMBOL'
      ? allLevelNodes?.symbol || []
      : activeLevel === 'EXECUTION'
      ? allLevelNodes?.execution || []
      : allLevelNodes?.component || graph.nodes;
    }

    if (activeLevel === 'COMPONENT' && selectedNode?.level === 'SYSTEM') {
      return nodes.filter((node) => node.parentSubsystemId === selectedNode.id);
    }
    if (activeLevel === 'FILE' && selectedNode?.level === 'COMPONENT') {
      return nodes.filter((node) => node.parentNodeId === selectedNode.id);
    }
    if (activeLevel === 'SYMBOL' && selectedNode?.level === 'FILE') {
      return nodes.filter((node) => node.parentNodeId === selectedNode.id);
    }
    return nodes;
  }, [activeLevel, activeUmlMode, allLevelNodes, graph.nodes, selectedNode]);

  const currentEdges = React.useMemo(() => {
    if (activeUmlMode === 'FILE_DEPENDENCY') return allLevelEdges?.file || [];
    if (activeUmlMode === 'CALL_GRAPH' || activeUmlMode === 'DATA_FLOW') return allLevelEdges?.symbol || [];
    if (activeLevel === 'SYSTEM') return allLevelEdges?.system || [];
    if (activeLevel === 'FILE') return allLevelEdges?.file || [];
    if (activeLevel === 'SYMBOL') return allLevelEdges?.symbol || [];
    if (activeLevel === 'EXECUTION') return allLevelEdges?.execution || [];
    return allLevelEdges?.component || graph.edges;
  }, [activeLevel, activeUmlMode, allLevelEdges, graph.edges]);

  // Layout template rearrangement
  const displayNodes: ArchitectureNode[] = React.useMemo(() => {
    if (activeLevel === 'SYMBOL' && selectedNode?.level === 'FILE') {
      const columns = Math.max(1, Math.min(3, currentNodes.length));
      const rows = Math.ceil(currentNodes.length / columns);
      return currentNodes.map((node, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = columns === 1 ? 50 : 15 + column * (70 / (columns - 1));
        const y = rows === 1 ? 50 : 20 + row * (60 / (rows - 1));
        return { ...node, x, y };
      });
    }
    if (activeTemplate === 'LAYERED') {
      return currentNodes.map((node, i) => {
        let y = 50;
        if (node.category === 'gateway') y = 18;
        else if (node.category === 'middleware') y = 35;
        else if (node.category === 'service' || node.category === 'module') y = 52;
        else if (node.category === 'database' || node.category === 'cache' || node.category === 'queue') y = 80;
        const x = Math.round(18 + ((i * 22) % 64));
        return { ...node, x, y };
      });
    }
    if (activeTemplate === 'EVENT_DRIVEN') {
      return currentNodes.map((node, i) => {
        let x = 50;
        let y = 50;
        if (node.category === 'queue') {
          x = 50;
          y = 50;
        } else {
          const angle = (i / (currentNodes.length - 1 || 1)) * 2 * Math.PI;
          x = Math.round(50 + 35 * Math.cos(angle));
          y = Math.round(50 + 32 * Math.sin(angle));
        }
        return { ...node, x, y };
      });
    }
    return currentNodes;
  }, [currentNodes, activeTemplate, activeLevel, selectedNode?.level]);

  // Node filtering
  const dependencyNodeIds = new Set(
    focusDependenciesMode === 'UPSTREAM'
      ? currentEdges.filter((edge) => edge.source === selectedNode?.id).map((edge) => edge.target)
      : focusDependenciesMode === 'DOWNSTREAM'
      ? currentEdges.filter((edge) => edge.target === selectedNode?.id).map((edge) => edge.source)
      : []
  );
  const filteredNodes = displayNodes.filter((node) => {
    const matchesCategory = selectedCategoryFilter === 'ALL' || node.category === selectedCategoryFilter;
    const matchesDependencies = focusDependenciesMode === 'ALL' || !selectedNode ||
      node.id === selectedNode.id || dependencyNodeIds.has(node.id);
    const matchesQuery =
      searchQuery === '' ||
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.technology.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.fileOrigin.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery && matchesDependencies;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));

  // Simulation timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating && executionTraces.length > 0) {
      timer = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= executionTraces.length - 1) {
            return 0; // loop
          }
          return prev + 1;
        });
      }, simulationSpeedMs);
    }
    return () => clearInterval(timer);
  }, [isSimulating, executionTraces.length, simulationSpeedMs]);

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && e.target === e.currentTarget) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Connected edges for active node
  const activeFocusNodeId = hoveredNodeId || selectedNode?.id || null;
  const currentStep = executionTraces[currentStepIndex];

  const getNodeIcon = (category: string) => {
    switch (category) {
      case 'gateway': return <Server className="w-3.5 h-3.5" />;
      case 'middleware': return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'database': return <Database className="w-3.5 h-3.5" />;
      case 'queue': return <Radio className="w-3.5 h-3.5" />;
      case 'cache': return <Zap className="w-3.5 h-3.5" />;
      case 'subsystem': return <Layers className="w-3.5 h-3.5" />;
      default: return <Cpu className="w-3.5 h-3.5" />;
    }
  };

  const getNodeById = (id: string): ArchitectureNode | undefined => {
    return displayNodes.find((n) => n.id === id);
  };

  const navigateToLevel = (level: HierarchyLevel) => {
    setActiveLevel(level);
    if (level === 'SYSTEM') setActiveUmlMode('SYSTEM_TOPOLOGY');
    else if (level === 'COMPONENT') setActiveUmlMode('COMPONENT_DIAGRAM');
    else if (level === 'FILE') setActiveUmlMode('FILE_DEPENDENCY');
    else if (level === 'SYMBOL') setActiveUmlMode('CALL_GRAPH');
    else setActiveUmlMode('DATA_FLOW');
  };

  return (
    <div className="relative flex-1 h-full flex flex-col bg-[#dfb2b2] overflow-hidden select-none font-mono">
      {/* Top Controls Strip: Breadcrumbs, Level Selector, UML Mode & Template */}
      <div className="p-2.5 border-b border-[#111111] bg-[#dfb2b2]/95 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2 z-20">
        {/* Breadcrumb Navigation Trail */}
        <div className="flex items-center space-x-1.5 text-[9px] tracking-wider uppercase font-bold text-[#111111]">
          <Network className="w-3.5 h-3.5" />
          <button onClick={() => navigateToLevel('SYSTEM')} className="hover:underline">SYSTEM</button>
          <ChevronRight className="w-2.5 h-2.5 text-[#111111]/60" />
          <button onClick={() => navigateToLevel('COMPONENT')} className="hover:underline">COMPONENTS</button>
          {(selectedNode?.level === 'FILE' || selectedNode?.level === 'SYMBOL') && (
            <>
              <ChevronRight className="w-2.5 h-2.5 text-[#111111]/60" />
              <button onClick={() => navigateToLevel('FILE')} className="hover:underline">FILES</button>
            </>
          )}
          {selectedNode?.level === 'SYMBOL' && (
            <>
              <ChevronRight className="w-2.5 h-2.5 text-[#111111]/60" />
              <button onClick={() => navigateToLevel('SYMBOL')} className="hover:underline">SYMBOLS</button>
            </>
          )}
          {selectedNode && (
            <>
              <ChevronRight className="w-2.5 h-2.5 text-[#111111]/60" />
              <span className="bg-[#111111] text-[#dfb2b2] px-1 py-0.2">{selectedNode.label}</span>
            </>
          )}
        </div>

        {/* Level & UML Mode Pickers */}
        <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
          {/* Level Tabs */}
          <div className="flex border border-[#111111]">
            {(['SYSTEM', 'COMPONENT', 'FILE', 'SYMBOL', 'EXECUTION'] as HierarchyLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => {
                  navigateToLevel(lvl);
                  if (lvl === 'EXECUTION') setIsSimulating(true);
                }}
                className={`px-2 py-0.5 transition-colors ${
                  activeLevel === lvl
                    ? 'bg-[#111111] text-[#dfb2b2] font-bold'
                    : 'bg-transparent text-[#111111] hover:bg-[#111111]/10'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* UML Mode Selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[8px] text-[#111111]/60 font-bold">UML:</span>
            <select
              value={activeUmlMode}
              onChange={(e) => {
                const mode = e.target.value as UmlDiagramMode;
                setActiveUmlMode(mode);
                if (mode === 'SYSTEM_TOPOLOGY') setActiveLevel('SYSTEM');
                else if (mode === 'COMPONENT_DIAGRAM') setActiveLevel('COMPONENT');
                else if (mode === 'FILE_DEPENDENCY') setActiveLevel('FILE');
                else if (mode === 'CALL_GRAPH' || mode === 'DATA_FLOW') setActiveLevel('SYMBOL');
              }}
              className="border border-[#111111] bg-transparent px-1 py-0.5 text-[9px] font-mono focus:outline-none"
            >
              <option value="SYSTEM_TOPOLOGY" className="bg-[#dfb2b2]">1. SYSTEM TOPOLOGY</option>
              <option value="COMPONENT_DIAGRAM" className="bg-[#dfb2b2]">2. COMPONENT DIAGRAM</option>
              <option value="FILE_DEPENDENCY" className="bg-[#dfb2b2]">3. FILE DEPENDENCY MAP</option>
              <option value="CALL_GRAPH" className="bg-[#dfb2b2]">4. FUNCTION CALL GRAPH</option>
              <option value="DATA_FLOW" className="bg-[#dfb2b2]">5. DATA-FLOW GRAPH</option>
              <option value="SEQUENCE_DIAGRAM" className="bg-[#dfb2b2]">6. SEQUENCE DIAGRAM</option>
              <option value="CLASS_DIAGRAM" className="bg-[#dfb2b2]">7. CLASS DIAGRAM</option>
            </select>
          </div>

          {/* Architecture Template Selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[8px] text-[#111111]/60 font-bold">LAYOUT:</span>
            <select
              value={activeTemplate}
              onChange={(e) => setActiveTemplate(e.target.value as ArchitectureTemplate)}
              className="border border-[#111111] bg-transparent px-1 py-0.5 text-[9px] font-mono focus:outline-none"
            >
              <option value="MICROSERVICES" className="bg-[#dfb2b2]">MICROSERVICES</option>
              <option value="LAYERED" className="bg-[#dfb2b2]">LAYERED TIER</option>
              <option value="EVENT_DRIVEN" className="bg-[#dfb2b2]">EVENT MESH</option>
              <option value="CLEAN_ARCH" className="bg-[#dfb2b2]">HEXAGONAL / CLEAN</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sub-header Filter Bar */}
      <div className="p-2 border-b border-[#111111] bg-[#dfb2b2]/90 flex flex-wrap items-center justify-between text-[9px] gap-2 z-10">
        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-3 h-3 absolute left-1.5 text-[#111111]/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes, symbols, files..."
            className="pl-5 pr-2 py-0.5 border border-[#111111] bg-transparent text-[#111111] text-[9px] w-40 focus:outline-none focus:w-56 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-1 text-[#111111]/60">
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        <select
          aria-label="Filter by node category"
          value={selectedCategoryFilter}
          onChange={(event) => setSelectedCategoryFilter(event.target.value as NodeCategory | 'ALL')}
          className="border border-[#111111] bg-transparent px-1 py-0.5 text-[9px]"
        >
          <option value="ALL" className="bg-[#dfb2b2]">ALL CATEGORIES</option>
          {(['gateway', 'middleware', 'service', 'database', 'queue', 'cache', 'module', 'client', 'subsystem', 'file', 'symbol'] as NodeCategory[]).map((category) => (
            <option key={category} value={category} className="bg-[#dfb2b2]">{category.toUpperCase()}</option>
          ))}
        </select>

        <select
          aria-label="Focus dependency neighborhood"
          value={focusDependenciesMode}
          onChange={(event) => setFocusDependenciesMode(event.target.value as 'ALL' | 'UPSTREAM' | 'DOWNSTREAM')}
          className="border border-[#111111] bg-transparent px-1 py-0.5 text-[9px]"
        >
          <option value="ALL" className="bg-[#dfb2b2]">ALL RELATIONSHIPS</option>
          <option value="UPSTREAM" className="bg-[#dfb2b2]">DEPENDENCIES</option>
          <option value="DOWNSTREAM" className="bg-[#dfb2b2]">DEPENDENTS</option>
        </select>

        {/* Simulink Canvas Controls: Zoom, Pan, Fit, Minimap */}
        <div className="flex items-center space-x-2">
          {/* Data-flow simulation toggle button */}
          <button
            onClick={() => {
              const nextSimulating = !isSimulating;
              setIsSimulating(nextSimulating);
              if (nextSimulating) {
                setActiveLevel('SYMBOL');
                setActiveUmlMode('DATA_FLOW');
              }
            }}
            disabled={executionTraces.length === 0}
            className={`px-2 py-0.5 border border-[#111111] flex items-center space-x-1 transition-colors disabled:opacity-40 ${
              isSimulating ? 'bg-emerald-800 text-[#dfb2b2] font-bold' : 'hover:bg-[#111111]/10'
            }`}
          >
            {isSimulating ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
            <span>{isSimulating ? 'PAUSE FLOW' : executionTraces.length ? 'SIMULATE FLOW' : 'NO CALLS DETECTED'}</span>
          </button>

          <button
            onClick={() => setShowCoordinateGrid(!showCoordinateGrid)}
            className={`px-1.5 py-0.5 border border-[#111111] ${showCoordinateGrid ? 'bg-[#111111] text-[#dfb2b2]' : ''}`}
          >
            GRID
          </button>
          <button
            onClick={() => setShowMinimap(!showMinimap)}
            className={`px-1.5 py-0.5 border border-[#111111] ${showMinimap ? 'bg-[#111111] text-[#dfb2b2]' : ''}`}
          >
            RADAR
          </button>

          <button
            onClick={() => setZoomLevel((prev) => Math.max(40, prev - 10))}
            className="p-1 border border-[#111111] hover:bg-[#111111]/10"
            title="Zoom Out"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <span className="w-8 text-center font-bold">{zoomLevel}%</span>
          <button
            onClick={() => setZoomLevel((prev) => Math.min(160, prev + 10))}
            className="p-1 border border-[#111111] hover:bg-[#111111]/10"
            title="Zoom In"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setZoomLevel(100);
              setPanOffset({ x: 0, y: 0 });
              setSearchQuery('');
            }}
            className="p-1 border border-[#111111] hover:bg-[#111111]/10"
            title="Reset view"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Main Drag/Pan Canvas Viewport */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing ${
          showCoordinateGrid ? 'bg-editorial-grid' : ''
        }`}
      >
        {/* Transformable Canvas Container */}
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel / 100})`,
            transformOrigin: '50% 50%',
            transition: isDragging ? 'none' : 'transform 120ms ease-out',
            width: '100%',
            height: '100%',
          }}
          className="absolute inset-0"
        >
          {/* Spatial Rulers */}
          <div className="absolute top-2 left-3 font-mono text-[8px] text-[#111111]/40 tracking-widest pointer-events-none">
            [X:{panOffset.x.toFixed(0)}, Y:{panOffset.y.toFixed(0)}] // {activeUmlMode}
          </div>

          {/* MODE A: UML SEQUENCE DIAGRAM VIEW */}
          {activeUmlMode === 'SEQUENCE_DIAGRAM' ? (
            <div className="absolute inset-0 p-8 flex flex-col space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-wider border-b border-[#111111] pb-2">
                STATIC CALL SEQUENCE: {sequenceMessages.length} DETECTED CALLS
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 pt-2">
                {sequenceMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2 border border-[#111111] bg-[#dfb2b2] flex items-center justify-between text-[10px]"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-[9px] px-1.5 py-0.2 bg-[#111111] text-[#dfb2b2]">
                        STEP {msg.stepNumber}
                      </span>
                      <span className="font-bold text-[#111111]">{msg.fromLabel}</span>
                      <span className="text-[#111111]/60">--[{msg.label}]--&gt;</span>
                      <span className="font-bold text-[#111111]">{msg.toLabel}</span>
                    </div>
                    <span className="text-[9px] text-[#111111]/70 truncate max-w-xs">{msg.signature}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : activeUmlMode === 'CLASS_DIAGRAM' ? (
            /* MODE B: UML CLASS DIAGRAM VIEW */
            <div className="absolute inset-0 p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
              {classes.map((cls, i) => (
                <div key={i} className="border-2 border-[#111111] bg-[#dfb2b2] shadow-md font-mono text-[9px]">
                  <div className="p-2 bg-[#111111] text-[#dfb2b2] font-bold text-center border-b border-[#111111] uppercase">
                    &lt;&lt;{cls.isInterface ? 'interface' : 'class'}&gt;&gt; {cls.name}
                  </div>
                  {/* Properties */}
                  <div className="p-2 border-b border-[#111111]/30 space-y-0.5">
                    {cls.properties.map((p, pi) => (
                      <div key={pi} className="text-[#111111]/80">
                        {p.visibility === 'public' ? '+' : '-'} {p.name}: {p.type}
                      </div>
                    ))}
                    {cls.properties.length === 0 && <span className="text-[#111111]/40 italic">(no fields)</span>}
                  </div>
                  {/* Methods */}
                  <div className="p-2 space-y-0.5">
                    {cls.methods.map((m, mi) => (
                      <div key={mi} className="text-[#111111]">
                        + {m.name}({m.parameters.join(', ')}): {m.returnType}
                      </div>
                    ))}
                    {cls.methods.length === 0 && <span className="text-[#111111]/40 italic">(no methods)</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* MODE C: STANDARD SIMULINK / TOPOLOGY VECTOR CANVAS */
            <>
              {/* SVG Edge Trajectory Vectors Layer */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <marker id="arrow-def" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#111111" />
                  </marker>
                  <marker id="arrow-act" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M 0 1 L 9 5 L 0 9 z" fill="#111111" />
                  </marker>
                </defs>

                {currentEdges.map((edge) => {
                  const sourceNode = getNodeById(edge.source);
                  const targetNode = getNodeById(edge.target);
                  if (!sourceNode || !targetNode) return null;
                  if (!filteredNodeIds.has(edge.source) || !filteredNodeIds.has(edge.target)) return null;

                  const middleX = (sourceNode.x + targetNode.x) / 2;
                  const middleY = (sourceNode.y + targetNode.y) / 2;

                  const isHighlighted = activeFocusNodeId === edge.source || activeFocusNodeId === edge.target || activeEdgeId === edge.id;
                  const isDimmed = activeFocusNodeId && !isHighlighted;

                  return (
                    <g key={edge.id} style={{ opacity: isDimmed ? 0.2 : 1 }}>
                      <path
                        d={`M ${sourceNode.x} ${sourceNode.y} Q ${middleX} ${middleY - 6}, ${targetNode.x} ${targetNode.y}`}
                        fill="none"
                        stroke="#111111"
                        strokeWidth={isHighlighted ? '2.5' : '1.2'}
                        strokeOpacity={isHighlighted ? '0.95' : '0.4'}
                        strokeDasharray={edge.isInferred ? '4 3' : undefined}
                        markerEnd={isHighlighted ? 'url(#arrow-act)' : 'url(#arrow-def)'}
                        className={isSimulating && currentStep?.nodeId === edge.source ? 'animate-edge-flow' : ''}
                      />
                      {isHighlighted && (
                        <text
                          x={middleX}
                          y={middleY - 3}
                          textAnchor="middle"
                          fill="#111111"
                          fontSize="2.2"
                          fontFamily="monospace"
                          fontWeight="bold"
                          stroke="#dfb2b2"
                          strokeWidth="0.35"
                          paintOrder="stroke"
                        >
                          {edge.flowLabel}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Interactive Nodes Layer */}
              {filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isHovered = hoveredNodeId === node.id;
                const isSimulationActive = isSimulating && currentStep?.nodeId === node.id;
                const isDimmed = activeFocusNodeId && activeFocusNodeId !== node.id && !currentEdges.some(
                  (e) => (e.source === activeFocusNodeId && e.target === node.id) || (e.target === activeFocusNodeId && e.source === node.id)
                );

                return (
                  <div
                    key={node.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNodeClick(node);
                      if (node.level === 'SYSTEM') navigateToLevel('COMPONENT');
                      else if (node.level === 'COMPONENT') navigateToLevel('FILE');
                      else if (node.level === 'FILE') navigateToLevel('SYMBOL');
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                      transform: `translate(-50%, -50%) scale(${isSelected || isSimulationActive ? 1.08 : isHovered ? 1.05 : 1})`,
                      opacity: isDimmed ? 0.3 : 1,
                    }}
                    className={`absolute cursor-pointer transition-all duration-180 z-10 ${
                      isSelected ? 'ring-2 ring-[#111111] ring-offset-2 ring-offset-[#dfb2b2] z-30' : isSimulationActive ? 'ring-2 ring-emerald-700 z-30' : isHovered ? 'z-20' : ''
                    }`}
                  >
                    <div
                      className={`w-52 border font-mono transition-all duration-150 ${
                        isSelected
                          ? 'border-[#111111] bg-[#111111] text-[#dfb2b2] shadow-2xl'
                          : isSimulationActive
                          ? 'border-emerald-800 bg-emerald-900 text-[#dfb2b2] shadow-2xl'
                          : isHovered
                          ? 'border-[#111111] bg-[#dfb2b2] text-[#111111] shadow-lg'
                          : 'border-[#111111] bg-[#dfb2b2]/95 text-[#111111]'
                      }`}
                    >
                      {/* Node Header */}
                      <div className="flex items-center justify-between px-2 py-1 border-b border-[#111111] text-[8px] tracking-widest uppercase">
                        <span className="flex items-center space-x-1 font-bold">
                          {getNodeIcon(node.category)}
                          <span>{node.category}</span>
                          {node.inferred && <span className="text-[7px]">INFERRED</span>}
                        </span>
                        <span>{node.hexId}</span>
                      </div>

                      {/* Node Body */}
                      <div className="p-2 space-y-1">
                        <h4 className="text-[11px] font-bold tracking-tight uppercase truncate">{node.label}</h4>
                        <div className="text-[8px] truncate opacity-75">{node.fileOrigin}</div>
                        {onViewSource && (
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              onViewSource(node.fileOrigin, node.sourceLine || node.symbols?.[0]?.line || 1);
                            }}
                            className="text-[8px] underline font-bold"
                          >
                            OPEN SOURCE
                          </button>
                        )}
                        <div className="pt-1 border-t border-[#111111]/20 flex justify-between text-[8px]">
                          <span>IN: {node.dependencies.upstream.length}</span>
                          <span className="font-bold text-right">{node.changeability.replace('_', ' ')}</span>
                          <span>OUT: {node.dependencies.downstream.length}</span>
                        </div>
                      </div>

                      {/* Node Footer Hint */}
                      <div className="px-2 py-0.5 border-t border-[#111111]/30 flex items-center justify-between text-[8px] uppercase">
                        <span>{isSelected ? 'SELECTED // EXPAND' : 'CLICK TO INSPECT'}</span>
                        <ArrowUpRight className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Simulink Minimap Radar in Corner */}
        {showMinimap && (
          <div className="absolute bottom-3 right-3 w-40 h-28 border border-[#111111] bg-[#dfb2b2]/90 backdrop-blur-xs p-1 pointer-events-none z-20 hidden sm:block">
            <div className="text-[7px] font-bold uppercase tracking-widest text-[#111111]/60 mb-0.5">RADAR MAP</div>
            <div className="relative w-full h-full bg-[#111111]/5 border border-[#111111]/20">
              {filteredNodes.map((n) => (
                <div
                  key={n.id}
                  style={{ left: `${n.x}%`, top: `${n.y}%` }}
                  className={`absolute w-1.5 h-1.5 -translate-x-1/2 -translate-y-1/2 ${
                    selectedNode?.id === n.id ? 'bg-red-700' : 'bg-[#111111]'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Live Simulation Control Overlay Bar */}
        {isSimulating && currentStep && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-11/12 max-w-xl bg-[#111111] text-[#dfb2b2] p-2.5 border-2 border-[#111111] shadow-2xl z-30 font-mono text-[9px] space-y-1.5 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#dfb2b2]/20 pb-1 font-bold">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>STATIC CALL WALKTHROUGH // STEP {currentStep.stepNumber} OF {executionTraces.length}</span>
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
                  className="p-1 hover:bg-[#dfb2b2] hover:text-[#111111]"
                  title="Previous Step"
                >
                  <SkipBack className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  className="p-1 hover:bg-[#dfb2b2] hover:text-[#111111]"
                >
                  {isSimulating ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => setCurrentStepIndex((prev) => Math.min(executionTraces.length - 1, prev + 1))}
                  className="p-1 hover:bg-[#dfb2b2] hover:text-[#111111]"
                  title="Next Step"
                >
                  <SkipForward className="w-3 h-3" />
                </button>
                <button onClick={() => setIsSimulating(false)} className="p-1 hover:bg-red-800">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="flex justify-between items-start pt-0.5">
              <div>
                <span className="font-bold text-[10px] text-emerald-300 block">
                  [{currentStep.nodeLabel}] {currentStep.symbolName}
                </span>
                <span className="text-[8px] opacity-75">{currentStep.operationDescription}</span>
              </div>
              <span className="px-1.5 py-0.2 border border-[#dfb2b2]/40 text-[8px] uppercase">
                {currentStep.confidence}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Persistent Bottom Status Footer */}
      <div className="p-2 border-t border-[#111111] bg-[#dfb2b2] flex flex-wrap items-center justify-between text-[9px] tracking-widest text-[#111111]/80 uppercase z-10 gap-2">
        <div className="flex items-center space-x-3">
          <Activity className="w-3 h-3 text-[#111111]" />
          <span>NODES: {filteredNodes.length}/{displayNodes.length}</span>
          <span>{'//'}</span>
          <span>LEVEL: {activeLevel}</span>
          <span>{'//'}</span>
          <span>UML: {activeUmlMode}</span>
          {performanceTiming && (
            <>
              <span>{'//'}</span>
              <span>TIME: {performanceTiming.graphConstructionMs}ms</span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span>FOCAL: {selectedNode ? selectedNode.label.toUpperCase() : 'CANVAS ROOT'}</span>
        </div>
      </div>
    </div>
  );
};
export default ArchitectureCanvas;
