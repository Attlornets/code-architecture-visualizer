import React, { useState, useEffect, useRef } from 'react';
import {
  Code2,
  GitBranch,
  Terminal,
  Cpu,
  Sparkles,
  ArrowRight,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FolderTree,
} from 'lucide-react';
import { AnalysisResult } from '@/types/architecture';
import { SourceInputFile, DEMO_MULTI_FILE_SUITE } from '@/lib/astParser';

interface CodeInputPaneProps {
  onAnalyze: (sourceCode: string, mode: 'snippet' | 'github', githubUrl?: string, customFiles?: SourceInputFile[]) => Promise<void>;
  isCompiling: boolean;
  currentResult: AnalysisResult | null;
  errorMessage?: string | null;
  focusedSourceLocation?: { filePath: string; line: number } | null;
}

export const CodeInputPane: React.FC<CodeInputPaneProps> = ({
  onAnalyze,
  isCompiling,
  currentResult,
  errorMessage,
  focusedSourceLocation,
}) => {
  const [mode, setMode] = useState<'multi_file' | 'snippet' | 'github'>('snippet');
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [projectFiles, setProjectFiles] = useState<SourceInputFile[]>([]);
  const [isDemoFixture, setIsDemoFixture] = useState<boolean>(false);
  const [singleSnippet, setSingleSnippet] = useState<string>('');
  const [githubUrl, setGithubUrl] = useState<string>('');
  const sourceEditorRef = useRef<HTMLTextAreaElement>(null);
  const activeFile = projectFiles[activeFileIndex] || projectFiles[0];
  const activeContent = mode === 'snippet' ? singleSnippet : activeFile?.content || '';
  const lines = activeContent.split('\n');

  // Handle bidirectional navigation from graph to source viewer
  useEffect(() => {
    if (currentResult?.rawFiles) {
      setProjectFiles(currentResult.rawFiles);
      setActiveFileIndex(0);
    }
  }, [currentResult?.rawFiles]);

  useEffect(() => {
    if (focusedSourceLocation) {
      const idx = projectFiles.findIndex((f) => f.path === focusedSourceLocation.filePath);
      if (idx !== -1) {
        setActiveFileIndex(idx);
        setMode('multi_file');
      }
    }
  }, [focusedSourceLocation, projectFiles]);

  useEffect(() => {
    if (!focusedSourceLocation || mode === 'github' || activeFile?.path !== focusedSourceLocation.filePath) return;
    const editor = sourceEditorRef.current;
    if (!editor) return;

    const sourceLines = activeContent.split('\n');
    const line = Math.max(1, Math.min(focusedSourceLocation.line, sourceLines.length));
    const lineStart = sourceLines.slice(0, line - 1).reduce((offset, sourceLine) => offset + sourceLine.length + 1, 0);
    const lineHeight = Number.parseFloat(window.getComputedStyle(editor).lineHeight);
    editor.scrollTop = Number.isFinite(lineHeight) ? (line - 1) * lineHeight : 0;
    editor.setSelectionRange(lineStart, lineStart);
  }, [focusedSourceLocation, activeFile?.path, activeContent, mode]);

  const handleContentChange = (newText: string) => {
    setIsDemoFixture(false);
    if (mode === 'snippet') {
      setSingleSnippet(newText);
    } else {
      const updated = [...projectFiles];
      updated[activeFileIndex] = { ...updated[activeFileIndex], content: newText };
      setProjectFiles(updated);
    }
  };

  const handleTriggerAnalysis = async () => {
    if (mode === 'github') {
      await onAnalyze('', 'github', githubUrl);
    } else if (mode === 'multi_file') {
      await onAnalyze('', 'snippet', undefined, projectFiles);
    } else {
      await onAnalyze(singleSnippet, 'snippet');
    }
  };

  const handleReset = () => {
    setProjectFiles([]);
    setIsDemoFixture(false);
    setSingleSnippet('');
    setActiveFileIndex(0);
    setGithubUrl('');
  };

  const handleLoadDemo = () => {
    setProjectFiles(DEMO_MULTI_FILE_SUITE);
    setIsDemoFixture(true);
    setActiveFileIndex(1);
    setMode('multi_file');
  };

  return (
    <div className="flex flex-col h-full bg-[#dfb2b2] border-r border-[#111111] font-mono select-none">
      {/* Top Header Bar */}
      <div className="p-2.5 border-b border-[#111111] flex items-center justify-between bg-[#dfb2b2]">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-[#111111]" />
          <span className="text-[11px] font-bold tracking-widest text-[#111111] uppercase">
            SOURCE.EXPLORER // IDE
          </span>
          {isDemoFixture && (
            <span className="border border-amber-900 px-1 text-[7px] font-bold text-amber-900">DEMO FIXTURE</span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="p-1 hover:bg-[#111111]/10 text-[#111111] border border-[#111111]/30 transition-colors"
            title="Clear source input"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <span className="w-2 h-2 rounded-full bg-[#111111] animate-pulse-subtle" />
          <span className="text-[8px] tracking-wider text-[#111111]/80">
            {isCompiling ? 'PARSING...' : 'READY'}
          </span>
        </div>
      </div>

      <div className="px-2.5 py-1.5 border-b border-[#111111] flex items-center justify-between gap-2 text-[8px] uppercase">
        <span className="font-bold text-amber-900">No analysis runs until you submit source.</span>
        <button onClick={handleLoadDemo} className="underline font-bold shrink-0" title="Load clearly labeled demo source">
          LOAD DEMO FIXTURE
        </button>
      </div>

      {/* Mode Selector Tabs */}
      <div className="grid grid-cols-3 border-b border-[#111111] text-[9px] tracking-wider font-bold">
        <button
          onClick={() => setMode('multi_file')}
          className={`py-1.5 px-2 flex items-center justify-center space-x-1 border-r border-[#111111] transition-colors ${
            mode === 'multi_file' ? 'bg-[#111111] text-[#dfb2b2]' : 'hover:bg-[#111111]/10 text-[#111111]'
          }`}
        >
          <FolderTree className="w-3 h-3" />
          <span>MULTI-FILE</span>
        </button>
        <button
          onClick={() => setMode('snippet')}
          className={`py-1.5 px-2 flex items-center justify-center space-x-1 border-r border-[#111111] transition-colors ${
            mode === 'snippet' ? 'bg-[#111111] text-[#dfb2b2]' : 'hover:bg-[#111111]/10 text-[#111111]'
          }`}
        >
          <Code2 className="w-3 h-3" />
          <span>RAW SNIPPET</span>
        </button>
        <button
          onClick={() => setMode('github')}
          className={`py-1.5 px-2 flex items-center justify-center space-x-1 transition-colors ${
            mode === 'github' ? 'bg-[#111111] text-[#dfb2b2]' : 'hover:bg-[#111111]/10 text-[#111111]'
          }`}
        >
          <GitBranch className="w-3 h-3" />
          <span>GITHUB REPO</span>
        </button>
      </div>

      {/* Multi-File Project File Tabs */}
      {mode === 'multi_file' && (
        <div className="border-b border-[#111111] bg-[#dfb2b2]/80 flex overflow-x-auto text-[8px] divide-x divide-[#111111]/30">
          {projectFiles.map((f, idx) => {
            const fileName = f.path.split('/').pop() || f.path;
            const isSelected = activeFileIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveFileIndex(idx)}
                className={`py-1 px-2.5 whitespace-nowrap transition-colors flex items-center space-x-1 font-bold ${
                  isSelected ? 'bg-[#111111] text-[#dfb2b2]' : 'hover:bg-[#111111]/10 text-[#111111]'
                }`}
              >
                <span>{fileName}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Dynamic Editor Body */}
      <div className="flex-1 flex flex-col p-2.5 overflow-hidden relative">
        {errorMessage && (
          <div className="mb-2 p-1.5 border border-red-700 bg-red-100/60 text-red-900 text-[8px] flex items-center space-x-1.5">
            <AlertTriangle className="w-3 h-3 text-red-700 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {mode !== 'github' ? (
          <div className="flex-1 flex flex-col border border-[#111111] bg-[#dfb2b2]/50 relative overflow-hidden">
            {/* Editor Sub-header info */}
            <div className="flex items-center justify-between px-2.5 py-1 border-b border-[#111111] bg-[#111111]/5 text-[8px] text-[#111111]/70 tracking-widest">
              <span className="flex items-center gap-1 font-bold">
                <FileCode2 className="w-2.5 h-2.5" />
                <span>{mode === 'multi_file' ? activeFile?.path : 'src/snippet.ts'}</span>
              </span>
              <span>SYNTAX: TYPESCRIPT // AST</span>
            </div>

            {/* Line numbers + Textarea */}
            <div className="flex-1 flex overflow-hidden font-mono text-[10px] leading-relaxed">
              <div className="py-2 px-1.5 bg-[#111111]/10 text-right text-[9px] text-[#111111]/50 border-r border-[#111111] select-none font-mono">
                {Array.from({ length: lines.length }, (_, i) => {
                  const lineNum = i + 1;
                  const isHighlighted = focusedSourceLocation?.line === lineNum;
                  return (
                    <div
                      key={i}
                      className={isHighlighted ? 'bg-red-700 text-[#dfb2b2] font-bold px-0.5' : ''}
                    >
                      {String(lineNum).padStart(2, '0')}
                    </div>
                  );
                })}
              </div>
              <textarea
                ref={sourceEditorRef}
                value={activeContent}
                onChange={(e) => handleContentChange(e.target.value)}
                spellCheck={false}
                className="flex-1 p-2 bg-transparent text-[#111111] focus:outline-none resize-none font-mono text-[10px] leading-relaxed selection:bg-[#111111] selection:text-[#dfb2b2] overflow-y-auto"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center space-y-3 p-3 border border-[#111111] bg-[#dfb2b2]/40">
            <div className="space-y-1">
              <label className="text-[9px] font-bold tracking-widest text-[#111111] uppercase block">
                Target Enterprise Repository URL:
              </label>
              <p className="text-[9px] text-[#111111]/70 leading-normal">
                Direct AST resolver inspects remote branches, parses `package.json`, dependency lockfiles, and routing decorators safely without code execution.
              </p>
            </div>

            <input
              type="text"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="w-full py-2 px-2.5 border border-[#111111] bg-transparent text-[10px] text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] font-mono tracking-tight"
            />

            <div className="border-t border-[#111111]/30 pt-2 space-y-1.5">
              <span className="text-[8px] uppercase tracking-widest text-[#111111]/60 block font-bold">
                Select Public Repository:
              </span>
              <div className="flex flex-wrap gap-1 text-[8px]">
                <button
                  onClick={() => setGithubUrl('https://github.com/nestjs/nest')}
                  className="px-2 py-0.5 border border-[#111111] hover:bg-[#111111] hover:text-[#dfb2b2]"
                >
                  nestjs/nest
                </button>
                <button
                  onClick={() => setGithubUrl('https://github.com/fastify/fastify')}
                  className="px-2 py-0.5 border border-[#111111] hover:bg-[#111111] hover:text-[#dfb2b2]"
                >
                  fastify/fastify
                </button>
                <button
                  onClick={() => setGithubUrl('https://github.com/trpc/trpc')}
                  className="px-2 py-0.5 border border-[#111111] hover:bg-[#111111] hover:text-[#dfb2b2]"
                >
                  trpc/trpc
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Diagnostics & AST Telemetry */}
        <div className="mt-2.5 pt-2 border-t border-[#111111] grid grid-cols-3 gap-2 text-[8px] text-[#111111]/80 tracking-widest uppercase">
          <div>
            <span className="block text-[7px] text-[#111111]/60">FILES LOADED</span>
            <span className="font-bold text-[#111111]">
              {mode === 'multi_file'
                ? projectFiles.length
                : mode === 'github'
                ? currentResult?.filesParsed || 0
                : singleSnippet.trim() ? 1 : 0}
            </span>
          </div>
          <div>
            <span className="block text-[7px] text-[#111111]/60">LINES TOTAL</span>
            <span className="font-bold text-[#111111]">
              {mode === 'multi_file'
                ? projectFiles.reduce((acc, f) => acc + f.content.split('\n').length, 0)
                : mode === 'github'
                ? currentResult?.totalLines || 0
                : singleSnippet.trim() ? lines.length : 0}
            </span>
          </div>
          <div>
            <span className="block text-[7px] text-[#111111]/60">ACTIVE BUFFER CHARS</span>
            <span className="font-bold text-[#111111]">{activeContent.length}</span>
          </div>
        </div>

        {/* Compilation Action Button */}
        <button
          onClick={handleTriggerAnalysis}
          disabled={isCompiling}
          className="mt-2.5 w-full py-2.5 px-3 bg-[#111111] text-[#dfb2b2] text-[10px] font-bold tracking-widest uppercase flex items-center justify-center space-x-1.5 border border-[#111111] hover:bg-transparent hover:text-[#111111] transition-all duration-150 active:scale-[0.99] disabled:opacity-50"
        >
          {isCompiling ? (
            <>
              <Cpu className="w-3.5 h-3.5 animate-spin" />
              <span>COMPILING MULTI-LEVEL AST...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span className="editorial-letter-spacing">SYNTHESIZE ARCHITECTURE TOPOLOGY</span>
              <ArrowRight className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* Pane Bottom Status Strip */}
      <div className="p-2 border-t border-[#111111] bg-[#dfb2b2] flex items-center justify-between text-[8px] tracking-widest text-[#111111]/70 uppercase">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5 text-[#111111]" />
          <span>SOURCE BUFFER READY</span>
        </span>
        <span>STATUS: {currentResult ? currentResult.parserStatus : 'READY'}</span>
      </div>
    </div>
  );
};
export default CodeInputPane;
