import React from 'react';
import {
  BookOpen,
  Layers,
  FileCheck,
  ShieldAlert,
  Activity,
  ArrowRight,
} from 'lucide-react';
import { AnalysisResult } from '@/types/architecture';

interface DocumentationViewProps {
  analysis: AnalysisResult | null;
  onNavigateToGraph?: () => void;
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({
  analysis,
}) => {
  if (!analysis) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono space-y-3 bg-[#dfb2b2]">
        <BookOpen className="w-10 h-10 text-[#111111]/40" />
        <h3 className="text-sm font-bold tracking-widest uppercase text-[#111111]">
          DOCUMENTATION ENGINE STANDBY
        </h3>
        <p className="text-[11px] text-[#111111]/70 max-w-md leading-relaxed">
          No active codebase has been analyzed yet. Run an analysis on CORE.ENGINE to generate grounded architectural specifications, component registries, and dependency maps.
        </p>
      </div>
    );
  }

  const { documentation, graph, fileSummaries, timings } = analysis;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#dfb2b2] font-mono select-none space-y-6">
      {/* Top Architectural Header Banner */}
      <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between text-[9px] text-[#111111]/70 tracking-widest uppercase border-b border-[#111111]/20 pb-2">
          <span>GENERATED ARCHITECTURAL SPECIFICATION</span>
          <span>SYSTEM: {graph.systemName}</span>
        </div>

        <h2 className="text-xl md:text-2xl font-black font-sans uppercase tracking-tight text-[#111111]">
          {graph.systemName} {'//'} {documentation.detectedStyle}
        </h2>

        <p className="text-[11px] leading-relaxed text-[#111111]/90 font-sans">
          {documentation.overview}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[9px]">
          <div className="p-2 border border-[#111111] bg-[#dfb2b2]">
            <span className="block text-[8px] text-[#111111]/60">PARSED FILES</span>
            <span className="font-bold">{fileSummaries.length} files</span>
          </div>
          <div className="p-2 border border-[#111111] bg-[#dfb2b2]">
            <span className="block text-[8px] text-[#111111]/60">SOURCE CODE</span>
            <span className="font-bold">{graph.rawSourceLines} lines</span>
          </div>
          <div className="p-2 border border-[#111111] bg-[#dfb2b2]">
            <span className="block text-[8px] text-[#111111]/60">COMPONENTS</span>
            <span className="font-bold">{graph.nodes.length} nodes</span>
          </div>
          <div className="p-2 border border-[#111111] bg-[#dfb2b2]">
            <span className="block text-[8px] text-[#111111]/60">ANALYSIS TIME</span>
            <span className="font-bold">{timings.totalMs} ms</span>
          </div>
        </div>
      </div>

      {/* Grid: Component Registry & Dependency Topology */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module & Component Registry */}
        <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase border-b border-[#111111] pb-2 text-[#111111]">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>COMPONENT REGISTRY ({documentation.modules.length})</span>
            </span>
          </div>

          <div className="space-y-3">
            {documentation.modules.map((mod, idx) => (
              <div key={idx} className="p-3 border border-[#111111] bg-[#dfb2b2] space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold uppercase text-[11px] text-[#111111]">{mod.name}</h4>
                  <span className="text-[8px] px-1 py-0.2 border border-[#111111] bg-[#111111]/10">
                    {mod.role}
                  </span>
                </div>
                <p className="text-[10px] text-[#111111]/80 leading-relaxed font-sans">{mod.description}</p>
                <div className="pt-1 text-[8px] text-[#111111]/60 flex items-center gap-1">
                  <FileCheck className="w-2.5 h-2.5" />
                  <span>Files: {mod.files.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data & Execution Flows */}
        <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase border-b border-[#111111] pb-2 text-[#111111]">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>DATA FLOW &amp; INTERCONNECTS ({documentation.dependencies.length})</span>
            </span>
          </div>

          <div className="space-y-2">
            {documentation.dependencies.length > 0 ? (
              documentation.dependencies.map((dep, idx) => (
                <div key={idx} className="p-2 border border-[#111111] bg-[#dfb2b2] flex items-center justify-between text-[10px]">
                  <div className="flex items-center space-x-2 font-bold">
                    <span>{dep.from}</span>
                    <ArrowRight className="w-3 h-3 text-[#111111]/60" />
                    <span>{dep.to}</span>
                  </div>
                  <span className="text-[8px] text-[#111111]/60 uppercase">{dep.nature}</span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-[10px] text-[#111111]/60 italic">
                Isolated component. No external edge interconnections detected in this snippet.
              </div>
            )}
          </div>

          {/* External Integrations */}
          <div className="pt-3 border-t border-[#111111]/30 space-y-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#111111]/70 block">
              EXTERNAL INTEGRATIONS &amp; THIRD-PARTY CLIENTS:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {documentation.externalIntegrations.map((pkg, idx) => (
                <span key={idx} className="px-2 py-0.5 border border-[#111111] bg-[#dfb2b2] text-[9px] font-mono">
                  {pkg}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grounded Key Symbols & Entry Points */}
      <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-3">
        <div className="text-[10px] font-bold tracking-widest uppercase border-b border-[#111111] pb-2 text-[#111111]">
          <span>VERIFIED CODE SYMBOLS &amp; ENTRY POINTS</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {documentation.keySymbols.map((sym, idx) => (
            <div key={idx} className="p-2 border border-[#111111] bg-[#dfb2b2] space-y-1 text-[9px]">
              <div className="flex justify-between font-bold">
                <span className="truncate">{sym.name}</span>
                <span className="text-[8px] uppercase">{sym.type}</span>
              </div>
              <div className="text-[8px] text-[#111111]/60">{sym.location}</div>
              <div className="text-[8px] text-[#111111]/80 italic truncate">{sym.purpose}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risks and Architectural Recommendations */}
      <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-3">
        <div className="text-[10px] font-bold tracking-widest uppercase border-b border-[#111111] pb-2 text-[#111111]">
          <span>ARCHITECTURAL AUDIT &amp; SECURITY POSTURE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documentation.risksAndRecommendations.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 border text-[10px] space-y-1 ${
                item.type === 'risk'
                  ? 'border-amber-700 bg-amber-50 text-amber-950'
                  : 'border-[#111111] bg-[#dfb2b2] text-[#111111]'
              }`}
            >
              <div className="flex items-center space-x-1.5 font-bold uppercase text-[10px]">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{item.title}</span>
              </div>
              <p className="text-[10px] leading-relaxed font-sans">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default DocumentationView;
