import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Layers,
  ShieldAlert,
  RotateCw,
} from 'lucide-react';
import { ArchitectureNode, ArchitectureEdge, ImpactAnalysisResult } from '@/types/architecture';
import { calculateImpactAnalysis } from '@/lib/impactAnalysis';

interface SidebarMetadataProps {
  selectedNode: ArchitectureNode | null;
  allNodes?: ArchitectureNode[];
  edges?: ArchitectureEdge[];
  onViewSource?: (filePath: string, line: number) => void;
  onSelectNodeById?: (nodeId: string) => void;
}

export const SidebarMetadata: React.FC<SidebarMetadataProps> = ({
  selectedNode,
  allNodes = [],
  edges = [],
  onViewSource,
}) => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [llmEngine, setLlmEngine] = useState<'openai' | 'local' | 'deterministic'>('deterministic');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [customExplainerNote, setCustomExplainerNote] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<string>('AST Engine');
  const [explainerError, setExplainerError] = useState<string | null>(null);

  const impactAnalysis: ImpactAnalysisResult | null = React.useMemo(() => {
    if (!selectedNode || allNodes.length === 0) return null;
    return calculateImpactAnalysis(selectedNode, allNodes, edges);
  }, [selectedNode, allNodes, edges]);

  const handleCopySpec = () => {
    if (!selectedNode) return;
    navigator.clipboard.writeText(JSON.stringify(selectedNode, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerLlmExplanation = async () => {
    if (!selectedNode) return;
    setIsGenerating(true);
    setCustomExplainerNote(null);
    setExplainerError(null);

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeLabel: selectedNode.label,
          category: selectedNode.category,
          fileOrigin: selectedNode.fileOrigin,
          symbols: selectedNode.symbols?.map((s) => s.name) || [],
          upstream: selectedNode.dependencies.upstream,
          downstream: selectedNode.dependencies.downstream,
          engine: llmEngine,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Explanation request failed (${res.status}).`);
      setCustomExplainerNote(data.explanation);
      setActiveProvider(`${data.provider} (${data.durationMs}ms)`);
    } catch (error: unknown) {
      setExplainerError(error instanceof Error ? error.message : 'Explanation request failed.');
      setActiveProvider('Unavailable');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#dfb2b2] border-l border-[#111111] font-mono select-none overflow-hidden">
      {/* Sidebar Header Bar */}
      <div className="p-2.5 border-b border-[#111111] flex items-center justify-between bg-[#dfb2b2]">
        <div className="flex items-center space-x-2">
          <FileText className="w-3.5 h-3.5 text-[#111111]" />
          <span className="text-[11px] font-bold tracking-widest text-[#111111] uppercase">
            {isFlipped ? 'CHANGEABILITY & IMPACT' : 'COMPONENT INSPECTOR'}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {selectedNode && (
            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="p-1 border border-[#111111] hover:bg-[#111111] hover:text-[#dfb2b2] text-[8px] flex items-center gap-1 transition-colors"
              title="Flip Card View"
            >
              <RotateCw className="w-2.5 h-2.5" />
              <span>FLIP</span>
            </button>
          )}
          <span className="text-[9px] font-mono px-1.5 py-0.5 border border-[#111111] bg-[#111111] text-[#dfb2b2] font-bold">
            {selectedNode ? selectedNode.hexId : '0x0000'}
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selectedNode ? (
          !isFlipped ? (
            /* FACE 1: OVERVIEW & ARCHITECTURAL DOSSIER */
            <>
              {/* Component Identity Dossier */}
              <div className="border border-[#111111] bg-[#dfb2b2]/40 p-3 space-y-2">
                <div className="flex items-center justify-between text-[9px] tracking-widest text-[#111111]/70 uppercase border-b border-[#111111]/20 pb-1">
                  <span>CATEGORY SPECIFICATION</span>
                  <span className="font-bold text-[#111111]">{selectedNode.category}</span>
                </div>

                <div>
                  <h3 className="text-sm font-bold tracking-tight uppercase text-[#111111]">{selectedNode.label}</h3>
                  <div className="flex items-center justify-between text-[9px] text-[#111111]/80 mt-1">
                    <span className="truncate">FILE: {selectedNode.fileOrigin}</span>
                    {onViewSource && (
                      <button
                        onClick={() => onViewSource(selectedNode.fileOrigin, selectedNode.sourceLine || selectedNode.symbols?.[0]?.line || 1)}
                        className="text-[8px] underline font-bold hover:text-black shrink-0 ml-1"
                      >
                        VIEW SOURCE
                      </button>
                    )}
                  </div>
                </div>

                {/* Changeability Classification Badge */}
                <div className="pt-2 border-t border-[#111111]/20">
                  <div className="flex items-center justify-between text-[8px] uppercase font-bold">
                    <span>CHANGEABILITY CLASSIFICATION:</span>
                    <span className="px-1.5 py-0.2 border border-[#111111] bg-[#111111] text-[#dfb2b2]">
                      {selectedNode.changeability.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[8px] text-[#111111]/75 mt-0.5 leading-relaxed font-sans">
                    {selectedNode.changeabilityEvidence}
                  </p>
                </div>
              </div>

              {/* Plain-English Live Explainer Block */}
              <div className="border border-[#111111] bg-[#111111] text-[#dfb2b2] p-3 space-y-2">
                <div className="flex items-center justify-between text-[8px] tracking-widest text-[#dfb2b2]/70 uppercase border-b border-[#dfb2b2]/20 pb-1">
                  <span className="flex items-center space-x-1 font-bold text-[#dfb2b2]">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>PLAIN-ENGLISH EXPLAINER</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <select
                      aria-label="Explanation provider"
                      value={llmEngine}
                      onChange={(event) => setLlmEngine(event.target.value as 'openai' | 'local' | 'deterministic')}
                      className="bg-[#111111] border border-[#dfb2b2]/40 px-1 py-0.5 text-[7px]"
                    >
                      <option value="deterministic">AST</option>
                      <option value="openai">OPENAI</option>
                      <option value="local">LOCAL</option>
                    </select>
                    <button
                      onClick={handleTriggerLlmExplanation}
                      disabled={isGenerating}
                      className="flex items-center space-x-1 hover:text-white"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${isGenerating ? 'animate-spin' : ''}`} />
                      <span className="text-[7px]">SYNTHESIZE</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10px] leading-relaxed font-sans font-normal text-[#dfb2b2]/90">
                  {customExplainerNote || selectedNode.summary}
                </p>
                {explainerError && <p className="text-[8px] text-red-300">{explainerError}</p>}

                <div className="text-[7px] font-mono text-[#dfb2b2]/50 border-t border-[#dfb2b2]/10 pt-1 flex justify-between">
                  <span>PROVIDER: {activeProvider}</span>
                  <span>STATIC ANALYSIS INPUTS</span>
                </div>
              </div>

              {/* Discovered Symbols / Methods */}
              {selectedNode.symbols && selectedNode.symbols.length > 0 && (
                <div className="border border-[#111111] bg-[#dfb2b2]/40 p-2.5 space-y-1.5 text-[9px]">
                  <div className="flex justify-between font-bold border-b border-[#111111]/20 pb-1 uppercase">
                    <span>DISCOVERED AST SYMBOLS ({selectedNode.symbols.length})</span>
                    <span>LOCATION</span>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {selectedNode.symbols.map((sym, idx) => (
                      <div
                        key={idx}
                        className="p-1 border border-[#111111]/30 bg-[#dfb2b2] flex items-center justify-between hover:bg-[#dfb2b2]/90"
                      >
                        <span className="font-bold truncate">{sym.name}</span>
                        <div className="flex items-center space-x-1 text-[8px] text-[#111111]/60">
                          <span>{sym.kind}</span>
                          <span>:</span>
                          {onViewSource ? (
                            <button
                              onClick={() => onViewSource(selectedNode.fileOrigin, sym.line)}
                              className="underline hover:text-[#111111]"
                            >
                              L{sym.line}
                            </button>
                          ) : (
                            <span>L{sym.line}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ingress Endpoints / Data Contracts */}
              {selectedNode.dataContracts.length > 0 && (
                <div className="border border-[#111111] bg-[#dfb2b2]/40 p-2.5 space-y-1.5 text-[9px]">
                  <div className="font-bold border-b border-[#111111]/20 pb-1 uppercase">
                    CONTRACT SIGNATURES &amp; INTERFACES
                  </div>
                  <div className="space-y-1">
                    {selectedNode.dataContracts.map((c, i) => (
                      <div key={i} className="p-1 border border-[#111111]/30 bg-[#dfb2b2] truncate">
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* FACE 2: REVERSE FACE / CHANGEABILITY & IMPACT ANALYSIS */
            <>
              {impactAnalysis && (
                <div className="border border-[#111111] bg-[#dfb2b2]/40 p-3 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#111111] pb-1.5">
                    <span className="font-bold text-[10px] uppercase text-[#111111] flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>IMPACT ANALYSIS (BLAST RADIUS)</span>
                    </span>
                    <span
                      className={`text-[8px] font-bold px-1.5 py-0.2 border ${
                        impactAnalysis.riskLevel === 'CRITICAL'
                          ? 'border-red-800 bg-red-800 text-[#dfb2b2]'
                          : impactAnalysis.riskLevel === 'HIGH'
                          ? 'border-amber-800 bg-amber-800 text-[#dfb2b2]'
                          : 'border-[#111111] bg-[#111111] text-[#dfb2b2]'
                      }`}
                    >
                      {impactAnalysis.riskLevel} RISK
                    </span>
                  </div>

                  <p className="text-[10px] text-[#111111]/90 font-sans leading-relaxed">
                    {impactAnalysis.rationale}
                  </p>

                  {/* Direct Dependents */}
                  <div className="space-y-1 text-[9px]">
                    <span className="font-bold uppercase text-[8px] text-[#111111]/70 block">
                      DIRECT DEPENDENTS (CALLERS &amp; IMPORTERS):
                    </span>
                    {impactAnalysis.directDependents.length > 0 ? (
                      <div className="space-y-1">
                        {impactAnalysis.directDependents.map((dep, i) => (
                          <div key={i} className="p-1 border border-[#111111]/30 bg-[#dfb2b2] font-bold truncate">
                            {dep}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[8px] italic text-[#111111]/50 p-1">
                        Zero direct callers detected. Top-level leaf or ingress.
                      </div>
                    )}
                  </div>

                  {/* Indirect Transitive Dependents */}
                  <div className="space-y-1 text-[9px]">
                    <span className="font-bold uppercase text-[8px] text-[#111111]/70 block">
                      TRANSITIVE DOWNSTREAM IMPACT:
                    </span>
                    {impactAnalysis.indirectDependents.length > 0 ? (
                      <div className="space-y-1">
                        {impactAnalysis.indirectDependents.map((dep, i) => (
                          <div key={i} className="p-1 border border-[#111111]/20 bg-[#dfb2b2]/70 truncate">
                            {dep}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[8px] italic text-[#111111]/50 p-1">
                        No transitive indirect dependencies affected.
                      </div>
                    )}
                  </div>

                  {/* Affected API Endpoints */}
                  {impactAnalysis.affectedEndpoints.length > 0 && (
                    <div className="space-y-1 text-[9px] pt-1 border-t border-[#111111]/20">
                      <span className="font-bold uppercase text-[8px] text-red-900 block">
                        AFFECTED PUBLIC API ENDPOINTS:
                      </span>
                      {impactAnalysis.affectedEndpoints.map((ep, i) => (
                        <div key={i} className="p-1 border border-red-700 bg-red-50 text-red-900 font-bold truncate">
                          {ep}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Layers className="w-8 h-8 text-[#111111]/40" />
            <h4 className="text-[11px] font-bold tracking-widest uppercase text-[#111111]">
              AWAITING COMPONENT SELECTION
            </h4>
            <p className="text-[9px] text-[#111111]/70 leading-relaxed font-sans max-w-[240px]">
              Click any architecture node or UML element to inspect symbols, changeability, and calculate its change-impact blast radius.
            </p>
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="p-2.5 border-t border-[#111111] bg-[#dfb2b2] flex items-center space-x-2 text-[9px]">
        {selectedNode && (
          <button
            onClick={() => setIsFlipped(!isFlipped)}
            className="flex-1 py-1.5 px-2 border border-[#111111] bg-[#111111] text-[#dfb2b2] font-bold uppercase hover:bg-transparent hover:text-[#111111] transition-colors"
          >
            {isFlipped ? 'SHOW OVERVIEW' : 'SHOW IMPACT'}
          </button>
        )}
        <button
          onClick={handleCopySpec}
          disabled={!selectedNode}
          className="flex-1 py-1.5 px-2 border border-[#111111] font-bold uppercase flex items-center justify-center space-x-1 hover:bg-[#111111] hover:text-[#dfb2b2] transition-colors disabled:opacity-40"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'COPIED' : 'COPY SPEC'}</span>
        </button>
      </div>
    </div>
  );
};
export default SidebarMetadata;
