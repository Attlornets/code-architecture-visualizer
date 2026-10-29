import React, { useState } from 'react';
import {
  BookOpen,
  FileCheck,
  Activity,
  GitCommit,
  Copy,
  Check,
  Wrench,
} from 'lucide-react';
import { AnalysisResult } from '@/types/architecture';

interface DocumentationViewProps {
  analysis: AnalysisResult | null;
  onNavigateToGraph?: () => void;
  onNavigateToSource?: (filePath: string, line: number) => void;
}

export const DocumentationView: React.FC<DocumentationViewProps> = ({
  analysis,
  onNavigateToGraph,
  onNavigateToSource,
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!analysis) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono space-y-3 bg-[#dfb2b2]">
        <BookOpen className="w-10 h-10 text-[#111111]/40" />
        <h3 className="text-sm font-bold tracking-widest uppercase text-[#111111]">
          DOCUMENTATION ENGINE STANDBY
        </h3>
        <p className="text-[11px] text-[#111111]/70 max-w-md leading-relaxed">
          No active codebase has been analyzed yet. Run an analysis on CORE.ENGINE to generate grounded architectural specifications, component registries, git history, and clone/run instructions.
        </p>
      </div>
    );
  }

  const { documentation, graph, fileSummaries, timings } = analysis;
  const { setupInstructions, gitHistory, frameworkVersions } = documentation;

  const handleCopyText = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const fullSetupGuide = `=== SYNAPSE REPOSITORY SETUP & RUN GUIDE ===
Prerequisites:
${setupInstructions.prerequisites.map((p) => `- ${p}`).join('\n')}

Clone & Install:
${setupInstructions.cloneCommand}
${setupInstructions.directoryCommand}
${setupInstructions.installCommand}

Environment Configuration:
${setupInstructions.envSetupCommand}

Run Commands:
Development: ${setupInstructions.devStartCommand}
Build:       ${setupInstructions.buildCommand}
Test:        ${setupInstructions.testCommand}
Lint:        ${setupInstructions.lintCommand}
`;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#dfb2b2] font-mono select-none space-y-6">
      {/* SECTION A: PROJECT OVERVIEW */}
      <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between text-[9px] text-[#111111]/70 tracking-widest uppercase border-b border-[#111111]/20 pb-2">
          <span>SECTION A // ENGINEERING HANDOFF CENTER</span>
          <span>SYSTEM: {graph.systemName}</span>
        </div>

        <h2 className="text-xl md:text-2xl font-black font-sans uppercase tracking-tight text-[#111111]">
          {graph.systemName} {'//'} {documentation.detectedStyle}
        </h2>

        <p className="text-[11px] leading-relaxed text-[#111111]/90 font-sans">
          {documentation.overview}
        </p>

        {/* Subsystems & Entry Points Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-[9px]">
          <div className="p-2 border border-[#111111] bg-[#dfb2b2]">
            <span className="block text-[8px] text-[#111111]/60">PARSED FILES</span>
            <span className="font-bold">{fileSummaries.length} files</span>
          </div>
          <div className="p-2 border border-[#111111] bg-[#dfb2b2]">
            <span className="block text-[8px] text-[#111111]/60">SOURCE CODE</span>
            <span className="font-bold">{graph.rawSourceLines} lines</span>
          </div>
          <div className="p-2 border border-[#111111] bg-[#dfb2b2]">
            <span className="block text-[8px] text-[#111111]/60">ENTRY POINTS</span>
            <span className="font-bold">{documentation.entryPoints.length} detected</span>
          </div>
          <div className="p-2 border border-[#111111] bg-[#dfb2b2]">
            <span className="block text-[8px] text-[#111111]/60">ANALYSIS DURATION</span>
            <span className="font-bold">{timings.totalMs} ms</span>
          </div>
        </div>
      </div>

      {/* SECTION B: ARCHITECTURE & DATA FLOW */}
      <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase border-b border-[#111111] pb-2 text-[#111111]">
          <span className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            <span>SECTION B // ARCHITECTURE &amp; DATA-FLOW PATHWAYS</span>
          </span>
          {onNavigateToGraph && (
            <button onClick={onNavigateToGraph} className="underline text-[9px] hover:text-black">
              EXPLORE IN GRAPH CANVAS &rarr;
            </button>
          )}
        </div>

        <div className="space-y-2">
          {documentation.dataFlow.map((flow, idx) => (
            <div key={idx} className="p-2.5 border border-[#111111] bg-[#dfb2b2] flex items-center justify-between text-[10px]">
              <span className="font-bold text-[#111111]">{flow}</span>
              <span className="text-[8px] text-emerald-800 font-bold border border-emerald-800 px-1">
                STATIC ANALYSIS
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION C: FILE AND MODULE REFERENCE */}
      <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-3">
        <div className="text-[10px] font-bold tracking-widest uppercase border-b border-[#111111] pb-2 text-[#111111]">
          <span>SECTION C // FILE &amp; MODULE REFERENCE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documentation.modules.map((mod, idx) => (
            <div key={idx} className="p-3 border border-[#111111] bg-[#dfb2b2] space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between">
                <h4 className="font-bold uppercase text-[11px] text-[#111111]">{mod.name}</h4>
                {onNavigateToSource && (
                  <button
                    onClick={() => onNavigateToSource(mod.files[0] || 'src/', 1)}
                    className="text-[8px] underline font-bold hover:text-black"
                  >
                    OPEN FILE
                  </button>
                )}
              </div>
              <p className="text-[9px] text-[#111111]/80 leading-relaxed font-sans">{mod.description}</p>
              <div className="pt-1 text-[8px] text-[#111111]/60 flex items-center gap-1">
                <FileCheck className="w-2.5 h-2.5" />
                <span>Files: {mod.files.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION D: GIT HISTORY & COMMIT ANALYSIS */}
      <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-3">
        <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase border-b border-[#111111] pb-2 text-[#111111]">
          <span className="flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5" />
            <span>SECTION D // GIT REPOSITORY COMMIT INTELLIGENCE ({gitHistory.length} COMMITS)</span>
          </span>
        </div>

        {documentation.gitHistorySource && (
          <p className="text-[8px] text-[#111111]/70">SOURCE: {documentation.gitHistorySource}</p>
        )}
        {documentation.gitHistoryError && (
          <p className="text-[9px] text-red-900">{documentation.gitHistoryError}</p>
        )}
        {gitHistory.length === 0 && !documentation.gitHistoryError && (
          <p className="text-[9px] text-[#111111]/70">Commit history is only available for analyses started from a GitHub repository URL.</p>
        )}

        <div className="space-y-3">
          {gitHistory.map((commit, idx) => (
            <div key={idx} className="p-3 border border-[#111111] bg-[#dfb2b2] space-y-1.5 text-[10px]">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold px-1.5 py-0.2 bg-[#111111] text-[#dfb2b2] text-[9px]">
                    {commit.shortHash}
                  </span>
                  <span className="font-bold text-[#111111]">{commit.message}</span>
                </div>
                <span className="text-[8px] text-[#111111]/60">{commit.author} {'//'} {commit.date || 'Date unavailable'}</span>
              </div>

              {commit.aiSummary && (
                <div className="p-2 border border-[#111111]/30 bg-[#111111]/5 text-[9px] space-y-0.5 font-sans">
                  <span className="font-bold uppercase text-[7px] text-[#111111]/60 block font-mono">
                    ARCHITECTURAL DIFF IMPACT (EVIDENCE GROUNDED):
                  </span>
                  <p className="text-[#111111]/90">{commit.aiSummary}</p>
                </div>
              )}

              <div className="text-[8px] text-[#111111]/60">
                Changed files: {commit.changedFiles.length ? commit.changedFiles.join(', ') : 'Not included in the repository commit summary.'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION E: DEPENDENCIES & ENVIRONMENT */}
      <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-3">
        <div className="text-[10px] font-bold tracking-widest uppercase border-b border-[#111111] pb-2 text-[#111111]">
          <span>SECTION E // DEPENDENCIES &amp; RUNTIME ENVIRONMENT</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {frameworkVersions.map((fw, idx) => (
            <div key={idx} className="p-2.5 border border-[#111111] bg-[#dfb2b2] space-y-1 text-[9px]">
              <div className="flex justify-between font-bold">
                <span>{fw.name}</span>
                <span className="px-1 py-0.2 bg-[#111111] text-[#dfb2b2]">{fw.version}</span>
              </div>
              <div className="text-[8px] text-[#111111]/60">Manifest Source: {fw.source}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION F: PRACTICAL CLONE & RUN INSTRUCTIONS */}
      <div className="border border-[#111111] bg-[#dfb2b2]/40 p-4 space-y-4">
        <div className="flex items-center justify-between text-[10px] font-bold tracking-widest uppercase border-b border-[#111111] pb-2 text-[#111111]">
          <span className="flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            <span>SECTION F // CLONE &amp; RUN PRODUCTION WORKBOOK</span>
          </span>
          <button
            onClick={() => handleCopyText(fullSetupGuide, 'full_guide')}
            className="px-2 py-1 border border-[#111111] bg-[#111111] text-[#dfb2b2] text-[8px] font-bold hover:bg-transparent hover:text-[#111111] transition-colors flex items-center gap-1"
          >
            {copiedSection === 'full_guide' ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
            <span>COPY SETUP INSTRUCTIONS</span>
          </button>
        </div>

        {/* Step-by-Step Copyable Commands */}
        <div className="space-y-3 text-[10px]">
          <div className="space-y-1">
            <span className="font-bold text-[9px] uppercase text-[#111111]/70">1. Clone Repository:</span>
            <div className="p-2 border border-[#111111] bg-[#111111] text-[#dfb2b2] flex items-center justify-between">
              <code>{setupInstructions.cloneCommand}</code>
              <button
                onClick={() => handleCopyText(setupInstructions.cloneCommand, 'clone')}
                className="hover:text-white p-1"
              >
                {copiedSection === 'clone' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-[9px] uppercase text-[#111111]/70">2. Install Dependencies:</span>
            <div className="p-2 border border-[#111111] bg-[#111111] text-[#dfb2b2] flex items-center justify-between">
              <code>{setupInstructions.directoryCommand} &amp;&amp; {setupInstructions.installCommand}</code>
              <button
                onClick={() => handleCopyText(`${setupInstructions.directoryCommand} && ${setupInstructions.installCommand}`, 'install')}
                className="hover:text-white p-1"
              >
                {copiedSection === 'install' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-[9px] uppercase text-[#111111]/70">3. Run Development Server:</span>
            <div className="p-2 border border-[#111111] bg-[#111111] text-[#dfb2b2] flex items-center justify-between">
              <code>{setupInstructions.devStartCommand}</code>
              <button
                onClick={() => handleCopyText(setupInstructions.devStartCommand, 'dev')}
                className="hover:text-white p-1"
              >
                {copiedSection === 'dev' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-[9px] uppercase text-[#111111]/70">4. Run Tests &amp; Production Build:</span>
            <div className="p-2 border border-[#111111] bg-[#111111] text-[#dfb2b2] flex items-center justify-between">
              <code>{setupInstructions.testCommand} &amp;&amp; {setupInstructions.buildCommand}</code>
              <button
                onClick={() => handleCopyText(`${setupInstructions.testCommand} && ${setupInstructions.buildCommand}`, 'test')}
                className="hover:text-white p-1"
              >
                {copiedSection === 'test' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="pt-2 border-t border-[#111111]/20 space-y-2">
          <span className="text-[9px] font-bold uppercase text-[#111111]/80 block">
            COMMON STARTUP &amp; OPERATION TROUBLESHOOTING:
          </span>
          <div className="space-y-2">
            {setupInstructions.commonTroubleshooting.map((t, idx) => (
              <div key={idx} className="p-2 border border-[#111111]/30 bg-[#dfb2b2] text-[9px] space-y-0.5">
                <span className="font-bold text-red-950 block">ISSUE: {t.issue}</span>
                <span className="text-[#111111]/85 block font-sans">RESOLUTION: {t.resolution}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
export default DocumentationView;
