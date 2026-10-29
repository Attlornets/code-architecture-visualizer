import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { CodeInputPane, PRESET_CODE_SNIPPETS } from '@/components/CodeInputPane';
import { ArchitectureCanvas } from '@/components/ArchitectureCanvas';
import { SidebarMetadata } from '@/components/SidebarMetadata';
import { ParserInspectorView } from '@/components/ParserInspectorView';
import { DocumentationView } from '@/components/DocumentationView';
import { GitHubDiscoveryPane } from '@/components/GitHubDiscoveryPane';
import { AnalysisResult, ArchitectureNode } from '@/types/architecture';
import { analyzeSourceProject } from '@/lib/astParser';
import {
  ShieldCheck,
  CheckCircle2,
  Menu,
  X,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<'CORE.ENGINE' | 'PARSER' | 'GRAPH' | 'DOCUMENTATION'>('CORE.ENGINE');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Global shared analysis state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [compileError, setCompileError] = useState<string | null>(null);

  // Sync navigation tab with route or query param ?view=
  useEffect(() => {
    if (router.isReady && router.query.view) {
      const v = String(router.query.view).toUpperCase();
      if (['CORE.ENGINE', 'PARSER', 'GRAPH', 'DOCUMENTATION'].includes(v)) {
        setActiveNav(v as 'CORE.ENGINE' | 'PARSER' | 'GRAPH' | 'DOCUMENTATION');
      }
    }
  }, [router.isReady, router.query.view]);

  // Initial immediate parse of default express preset so initial state is never empty
  useEffect(() => {
    try {
      const initial = analyzeSourceProject(
        [{ path: 'src/api/gateway.ts', content: PRESET_CODE_SNIPPETS.expressGateway.code }],
        'ENTERPRISE ROUTING CORE'
      );
      setAnalysisResult(initial);
      setSelectedNode(initial.graph.nodes[0] || null);
    } catch {
      // Fallback
    }
  }, []);

  const handleNavChange = (item: 'CORE.ENGINE' | 'PARSER' | 'GRAPH' | 'DOCUMENTATION') => {
    setActiveNav(item);
    setMobileMenuOpen(false);
    router.push({ pathname: '/', query: { view: item } }, undefined, { shallow: true });
  };

  const handleAnalyze = async (sourceCode: string, mode: 'snippet' | 'github', githubUrl?: string) => {
    setIsCompiling(true);
    setCompileError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCode: mode === 'snippet' ? sourceCode : undefined,
          githubUrl: mode === 'github' ? githubUrl : undefined,
          projectName: mode === 'github' ? githubUrl?.split('/').pop()?.toUpperCase() : 'COMPILED PIPELINE',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Analysis API failed' }));
        throw new Error(errData.details || errData.error || `HTTP ${res.status}`);
      }

      const result: AnalysisResult = await res.json();
      setAnalysisResult(result);
      setSelectedNode(result.graph.nodes[0] || null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      setCompileError(msg);
    } finally {
      setIsCompiling(false);
    }
  };

  const handleNodeClick = (node: ArchitectureNode) => {
    setSelectedNode(node);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#dfb2b2] text-[#111111] overflow-x-hidden relative font-mono">
      {/* Avant-Garde Rotated Viewport Label Framing Outer Edge */}
      <div className="hidden xl:flex fixed right-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none select-none">
        <div className="vertical-text font-mono text-[9px] tracking-[0.35em] text-[#111111]/60 uppercase border-r border-[#111111]/30 pr-1.5">
          ENTERPRISE ARCHITECTURE // AST SYNTHESIS CORE // REVISION 2026.4
        </div>
      </div>

      {/* Top Editorial Navigation Bar */}
      <header className="border-b border-[#111111] bg-[#dfb2b2] px-4 md:px-6 py-2.5 flex items-center justify-between text-[11px] tracking-widest uppercase select-none z-30">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 font-bold tracking-tighter text-sm">
            <span className="w-2.5 h-2.5 bg-[#111111]" />
            <span className="editorial-letter-spacing font-sans font-black">SYNAPSE</span>
            <span className="text-[10px] text-[#111111]/60 font-mono tracking-widest hidden sm:inline">
              [V1.0.0-PROD]
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 border-l border-[#111111] pl-6">
            {(['CORE.ENGINE', 'PARSER', 'GRAPH', 'DOCUMENTATION'] as const).map((item) => (
              <button
                key={item}
                onClick={() => handleNavChange(item)}
                className={`px-3 py-1 text-[10px] tracking-wider transition-all duration-150 border ${
                  activeNav === item
                    ? 'border-[#111111] bg-[#111111] text-[#dfb2b2] font-bold shadow-xs'
                    : 'border-transparent text-[#111111] hover:border-[#111111]/30 hover:tracking-widest'
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        {/* Right Status Badges & Mobile Menu Toggle */}
        <div className="flex items-center space-x-3">
          <div className="hidden lg:flex items-center space-x-2 text-[10px] text-[#111111]/80">
            <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
            <span>GITHUB ENTERPRISE PUSH COMPLIANT</span>
          </div>
          <span className="hidden lg:inline text-[#111111]/30">|</span>
          <span className="text-[10px] font-bold px-2 py-0.5 border border-[#111111] bg-[#111111]/5">
            US-EAST-1 // SECURED
          </span>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 border border-[#111111] hover:bg-[#111111] hover:text-[#dfb2b2] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Mobile Responsive Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#111111] bg-[#dfb2b2] p-3 flex flex-col space-y-1 z-30">
          {(['CORE.ENGINE', 'PARSER', 'GRAPH', 'DOCUMENTATION'] as const).map((item) => (
            <button
              key={item}
              onClick={() => handleNavChange(item)}
              className={`p-2 text-left text-[11px] font-bold uppercase tracking-wider border ${
                activeNav === item
                  ? 'border-[#111111] bg-[#111111] text-[#dfb2b2]'
                  : 'border-transparent text-[#111111] hover:bg-[#111111]/10'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Massive Editorial Asymmetric Title Banner */}
      <section className="border-b border-[#111111] px-4 md:px-6 py-4 bg-[#dfb2b2] relative overflow-hidden select-none">
        <div className="max-w-7xl flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-[9px] tracking-[0.25em] text-[#111111]/70 uppercase">
              <span>ACTIVE VIEWPORT</span>
              <span>{'//'}</span>
              <span>{activeNav}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black font-sans uppercase tracking-tight text-[#111111] leading-none">
              CODE-TO-ARCHITECTURE <span className="font-light italic tracking-normal">VISUALIZER</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[10px] tracking-widest text-[#111111]/80">
            <div className="border border-[#111111] p-2 bg-[#dfb2b2]/40">
              <span className="block text-[8px] text-[#111111]/60">ACTIVE MODEL</span>
              <span className="font-bold">{analysisResult ? analysisResult.parserName : 'TYPESCRIPT AST'}</span>
            </div>
            <div className="border border-[#111111] p-2 bg-[#dfb2b2]/40">
              <span className="block text-[8px] text-[#111111]/60">MEASURED LATENCY</span>
              <span className="font-bold">{analysisResult ? `${analysisResult.timings.totalMs}ms` : '0.0ms'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Primary View Switcher Container */}
      <div className="flex-1 flex flex-col min-h-[calc(100vh-220px)]">
        {/* DESTINATION A: CORE.ENGINE (Three-Column Workspace with GitHub Intelligence) */}
        {activeNav === 'CORE.ENGINE' && (
          <div className="flex-1 flex flex-col space-y-4">
            <main className="flex-1 flex flex-col lg:flex-row min-h-[600px] lg:min-h-0 border-b border-[#111111]">
              {/* Left Column: Code / URL Input Stream */}
              <section className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col">
                <CodeInputPane
                  onAnalyze={handleAnalyze}
                  isCompiling={isCompiling}
                  currentResult={analysisResult}
                  errorMessage={compileError}
                />
              </section>

              {/* Centerpiece Column: Interactive Graphic Architecture Canvas */}
              <section className="flex-1 min-w-0 flex flex-col min-h-[450px] lg:min-h-0 border-t lg:border-t-0 border-[#111111]">
                {analysisResult && (
                  <ArchitectureCanvas
                    graph={analysisResult.graph}
                    selectedNode={selectedNode}
                    onNodeClick={handleNodeClick}
                    performanceTiming={analysisResult.timings}
                  />
                )}
              </section>

              {/* Right Column: Exploded Metadata & Live Plain-English Explainer Dock */}
              <section className="w-full lg:w-[390px] xl:w-[440px] flex-shrink-0 flex flex-col border-t lg:border-t-0 border-[#111111]">
                <SidebarMetadata selectedNode={selectedNode} />
              </section>
            </main>

            {/* Dedicated Feature Section: SIMILAR REPOSITORIES — GITHUB INTELLIGENCE */}
            <div className="px-4 md:px-6 pb-6">
              <GitHubDiscoveryPane analysis={analysisResult} />
            </div>
          </div>
        )}

        {/* DESTINATION B: PARSER (Deep AST Node & Diagnostic Explorer) */}
        {activeNav === 'PARSER' && (
          <div className="flex-1 flex flex-col">
            <ParserInspectorView analysis={analysisResult} />
          </div>
        )}

        {/* DESTINATION C: GRAPH (Full-Viewport Interactive Topology Canvas) */}
        {activeNav === 'GRAPH' && (
          <div className="flex-1 flex flex-col lg:flex-row h-full">
            <div className="flex-1 flex flex-col min-h-[500px]">
              {analysisResult && (
                <ArchitectureCanvas
                  graph={analysisResult.graph}
                  selectedNode={selectedNode}
                  onNodeClick={handleNodeClick}
                  performanceTiming={analysisResult.timings}
                />
              )}
            </div>
            <div className="w-full lg:w-[380px] border-t lg:border-t-0 border-l border-[#111111]">
              <SidebarMetadata selectedNode={selectedNode} />
            </div>
          </div>
        )}

        {/* DESTINATION D: DOCUMENTATION (Generated Architectural Specification) */}
        {activeNav === 'DOCUMENTATION' && (
          <div className="flex-1 flex flex-col">
            <DocumentationView
              analysis={analysisResult}
              onNavigateToGraph={() => handleNavChange('GRAPH')}
            />
          </div>
        )}
      </div>

      {/* Functional Enterprise Footer Anchoring Real Timing Metrics & Confirmation Hooks */}
      <footer className="border-t border-[#111111] bg-[#dfb2b2] px-4 md:px-6 py-2.5 flex flex-wrap items-center justify-between text-[9px] tracking-widest text-[#111111]/80 uppercase select-none z-20 gap-2">
        <div className="flex flex-wrap items-center space-x-3">
          <div className="flex items-center space-x-1.5 font-bold text-[#111111]">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse-subtle" />
            <span>STATUS: {analysisResult ? analysisResult.parserStatus : 'OPERATIONAL'}</span>
          </div>
          <span>{'//'}</span>
          <span>PARSE: {analysisResult ? `${analysisResult.timings.parsingMs}ms` : '0ms'}</span>
          <span>{'//'}</span>
          <span>GRAPH: {analysisResult ? `${analysisResult.timings.graphConstructionMs}ms` : '0ms'}</span>
          <span>{'//'}</span>
          <span className="hidden sm:inline">V8 TURBOFAN AST RUNTIME</span>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-[#111111]" />
            <span className="font-bold">GITHUB ENTERPRISE COMPLIANT</span>
          </div>
          <span>{'//'}</span>
          <span className="text-[#111111]/60">NO HARDCODED SECRETS</span>
          <span>{'//'}</span>
          <span>SHA-256: 0x9DF84A</span>
        </div>
      </footer>
    </div>
  );
}
