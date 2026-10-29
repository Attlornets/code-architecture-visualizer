import React, { useState } from 'react';
import {
  FileText,
  Cpu,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Share2,
  ExternalLink,
  GitCommit,
  Terminal,
  Activity,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { ArchitectureNode } from '@/types/architecture';

interface SidebarMetadataProps {
  selectedNode: ArchitectureNode | null;
  onSelectNodeById?: (nodeId: string) => void;
}

export const SidebarMetadata: React.FC<SidebarMetadataProps> = ({
  selectedNode,
  onSelectNodeById,
}) => {
  const [llmEngine, setLlmEngine] = useState<'openai' | 'local'>('openai');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [customExplainerNote, setCustomExplainerNote] = useState<string | null>(null);

  const handleCopySpec = () => {
    if (!selectedNode) return;
    navigator.clipboard.writeText(JSON.stringify(selectedNode, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerLlmExplanation = () => {
    if (!selectedNode) return;
    setIsGenerating(true);
    setCustomExplainerNote(null);

    setTimeout(() => {
      setIsGenerating(false);
      setCustomExplainerNote(
        `[Synthesized by ${llmEngine.toUpperCase()}]: The ${selectedNode.label} acts as an architectural control plane. ` +
          `It binds '${selectedNode.fileOrigin}' to execute transactional contracts under ${selectedNode.metrics.securityZone}. ` +
          `Downstream throughput holds steady at ${selectedNode.metrics.throughput} with deterministic sub-millisecond p99 latency guarantees.`
      );
    }, 900);
  };

  return (
    <div className="flex flex-col h-full bg-[#dfb2b2] border-l border-[#111111] font-mono select-none overflow-hidden">
      {/* Sidebar Header Bar */}
      <div className="p-3 border-b border-[#111111] flex items-center justify-between bg-[#dfb2b2]">
        <div className="flex items-center space-x-2">
          <FileText className="w-3.5 h-3.5 text-[#111111]" />
          <span className="text-[11px] font-bold tracking-widest text-[#111111] uppercase">
            EXPLODED.METADATA // EXPLAINER
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[9px] font-mono px-1.5 py-0.5 border border-[#111111] bg-[#111111] text-[#dfb2b2] font-bold">
            {selectedNode ? selectedNode.hexId : '0x0000'}
          </span>
        </div>
      </div>

      {/* LLM Engine Provider Selector */}
      <div className="border-b border-[#111111] p-2 flex items-center justify-between bg-[#dfb2b2]">
        <div className="flex items-center space-x-1.5 text-[9px] text-[#111111]/80">
          <Cpu className="w-3 h-3 text-[#111111]" />
          <span className="font-bold">LLM ENGINE:</span>
        </div>
        <div className="flex space-x-1 text-[9px]">
          <button
            onClick={() => setLlmEngine('openai')}
            className={`px-2 py-0.5 border border-[#111111] tracking-wider transition-colors ${
              llmEngine === 'openai'
                ? 'bg-[#111111] text-[#dfb2b2] font-bold'
                : 'bg-transparent text-[#111111] hover:bg-[#111111]/10'
            }`}
          >
            GPT-4o (OPENAI)
          </button>
          <button
            onClick={() => setLlmEngine('local')}
            className={`px-2 py-0.5 border border-[#111111] tracking-wider transition-colors ${
              llmEngine === 'local'
                ? 'bg-[#111111] text-[#dfb2b2] font-bold'
                : 'bg-transparent text-[#111111] hover:bg-[#111111]/10'
            }`}
          >
            LOCAL (LLAMA 3)
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {selectedNode ? (
          <>
            {/* Structural Node Identity Dossier */}
            <div className="border border-[#111111] bg-[#dfb2b2]/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-[9px] tracking-widest text-[#111111]/70 uppercase border-b border-[#111111]/20 pb-1.5">
                <span>COMPONENT SPECIFICATION</span>
                <span className="font-bold text-[#111111]">{selectedNode.category}</span>
              </div>

              <div>
                <h3 className="text-sm font-bold tracking-tight uppercase text-[#111111]">
                  {selectedNode.label}
                </h3>
                <span className="text-[10px] text-[#111111]/80 font-mono block mt-0.5">
                  FILE: {selectedNode.fileOrigin}
                </span>
              </div>

              {/* Hex Signature & Status Matrix */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#111111]/20 text-[9px]">
                <div className="p-1.5 border border-[#111111]/30 bg-[#dfb2b2]">
                  <span className="block text-[8px] text-[#111111]/60">STATUS SIGNATURE</span>
                  <span className="font-bold text-[#111111]">{selectedNode.status}</span>
                </div>
                <div className="p-1.5 border border-[#111111]/30 bg-[#dfb2b2]">
                  <span className="block text-[8px] text-[#111111]/60">SECURITY PERIMETER</span>
                  <span className="font-bold text-[#111111] truncate">
                    {selectedNode.metrics.securityZone}
                  </span>
                </div>
              </div>
            </div>

            {/* Plain-English Live Explainer Block */}
            <div className="border border-[#111111] bg-[#111111] text-[#dfb2b2] p-3 space-y-2.5">
              <div className="flex items-center justify-between text-[9px] tracking-widest text-[#dfb2b2]/70 uppercase border-b border-[#dfb2b2]/20 pb-1.5">
                <span className="flex items-center space-x-1.5 font-bold text-[#dfb2b2]">
                  <Sparkles className="w-3 h-3" />
                  <span>PLAIN-ENGLISH EXPLAINER</span>
                </span>
                <button
                  onClick={handleTriggerLlmExplanation}
                  disabled={isGenerating}
                  className="flex items-center space-x-1 hover:text-white transition-colors"
                  title="Regenerate Explanation"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span className="text-[8px]">RE-SYNTHESIZE</span>
                </button>
              </div>

              <div className="text-[11px] leading-relaxed font-sans font-normal text-[#dfb2b2]/90">
                {isGenerating ? (
                  <div className="flex items-center space-x-2 py-3 text-[10px] font-mono text-[#dfb2b2]/60">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>SYNTHESIZING CONTEXTUAL EXPLANATION VIA {llmEngine.toUpperCase()}...</span>
                  </div>
                ) : customExplainerNote ? (
                  <p className="animate-fadeIn">{customExplainerNote}</p>
                ) : (
                  <p>{selectedNode.summary}</p>
                )}
              </div>
            </div>

            {/* AST Function Execution Trace Stack */}
            <div className="border border-[#111111] bg-[#dfb2b2]/40 p-3 space-y-2">
              <div className="flex items-center justify-between text-[9px] tracking-widest text-[#111111]/70 uppercase border-b border-[#111111]/20 pb-1.5">
                <span className="flex items-center space-x-1.5 font-bold text-[#111111]">
                  <GitCommit className="w-3 h-3" />
                  <span>AST FUNCTION CALL STACK</span>
                </span>
                <span className="text-[8px]">{selectedNode.callChain.length} TRACE HOOKS</span>
              </div>

              <div className="space-y-1 pt-1 font-mono text-[10px]">
                {selectedNode.callChain.map((fn, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 bg-[#dfb2b2] border border-[#111111]/30 text-[#111111] flex items-start space-x-2"
                  >
                    <span className="text-[#111111]/50 text-[9px]">{idx + 1}.</span>
                    <span className="truncate">{fn}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Topological Upstream & Downstream Routing */}
            <div className="border border-[#111111] bg-[#dfb2b2]/40 p-3 space-y-2">
              <div className="text-[9px] tracking-widest text-[#111111]/70 uppercase border-b border-[#111111]/20 pb-1.5">
                <span className="font-bold text-[#111111]">TOPOLOGICAL CONNECTIVITY</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px]">
                <div>
                  <span className="text-[8px] uppercase tracking-wider text-[#111111]/60 flex items-center gap-1 mb-1 font-bold">
                    <ArrowDownRight className="w-2.5 h-2.5" /> UPSTREAM
                  </span>
                  <div className="space-y-1">
                    {selectedNode.dependencies.upstream.length > 0 ? (
                      selectedNode.dependencies.upstream.map((up, i) => (
                        <div
                          key={i}
                          className="p-1 border border-[#111111]/30 bg-[#dfb2b2] truncate text-[#111111]"
                        >
                          {up}
                        </div>
                      ))
                    ) : (
                      <span className="text-[8px] text-[#111111]/50">ROOT INGRESS</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[8px] uppercase tracking-wider text-[#111111]/60 flex items-center gap-1 mb-1 font-bold">
                    <ArrowUpRight className="w-2.5 h-2.5" /> DOWNSTREAM
                  </span>
                  <div className="space-y-1">
                    {selectedNode.dependencies.downstream.length > 0 ? (
                      selectedNode.dependencies.downstream.map((down, i) => (
                        <div
                          key={i}
                          className="p-1 border border-[#111111]/30 bg-[#dfb2b2] truncate text-[#111111]"
                        >
                          {down}
                        </div>
                      ))
                    ) : (
                      <span className="text-[8px] text-[#111111]/50">TERMINAL SINK</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Data Contracts & Protocol Signatures */}
            <div className="border border-[#111111] bg-[#dfb2b2]/40 p-3 space-y-2">
              <div className="text-[9px] tracking-widest text-[#111111]/70 uppercase border-b border-[#111111]/20 pb-1.5">
                <span className="font-bold text-[#111111]">DATA CONTRACT ENFORCEMENT</span>
              </div>
              <ul className="space-y-1 text-[9px] text-[#111111]/90">
                {selectedNode.dataContracts.map((contract, i) => (
                  <li key={i} className="flex items-center space-x-1.5">
                    <span className="w-1 h-1 rounded-full bg-[#111111]" />
                    <span className="font-mono">{contract}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <Layers className="w-8 h-8 text-[#111111]/40" />
            <h4 className="text-[12px] font-bold tracking-widest uppercase text-[#111111]">
              AWAITING VECTOR SELECTION
            </h4>
            <p className="text-[10px] text-[#111111]/70 leading-relaxed font-sans max-w-[260px]">
              Select any microservice, database, or middleware vector node on the architecture canvas to unpack its AST signature, trace function executions, and view plain-English architectural summaries.
            </p>
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="p-3 border-t border-[#111111] bg-[#dfb2b2] flex items-center justify-between">
        <button
          onClick={handleCopySpec}
          disabled={!selectedNode}
          className="flex-1 py-2 px-3 border border-[#111111] text-[10px] font-bold tracking-widest uppercase flex items-center justify-center space-x-1.5 hover:bg-[#111111] hover:text-[#dfb2b2] transition-colors disabled:opacity-40"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span>COPIED SPECIFICATION</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>EXPORT SPEC JSON</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default SidebarMetadata;
