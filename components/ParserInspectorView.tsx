import React, { useState } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Terminal,
  Package,
} from 'lucide-react';
import { AnalysisResult, FileAstSummary, CodeSymbol } from '@/types/architecture';

interface ParserInspectorViewProps {
  analysis: AnalysisResult | null;
  onNavigateToSource?: (file: string, line: number) => void;
}

export const ParserInspectorView: React.FC<ParserInspectorViewProps> = ({
  analysis,
  onNavigateToSource,
}) => {
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [expandedSection, setExpandedSection] = useState<'symbols' | 'imports' | 'diagnostics' | 'frameworks'>('symbols');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');

  if (!analysis) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center font-mono space-y-3 bg-[#dfb2b2]">
        <Terminal className="w-10 h-10 text-[#111111]/40" />
        <h3 className="text-sm font-bold tracking-widest uppercase text-[#111111]">
          PARSER ENGINE STANDBY
        </h3>
        <p className="text-[11px] text-[#111111]/70 max-w-md leading-relaxed">
          No active AST analysis has been compiled. Navigate to CORE.ENGINE and click &quot;SYNTHESIZE ARCHITECTURE TOPOLOGY&quot; to inspect tokens, symbols, and verified framework versions.
        </p>
      </div>
    );
  }

  const selectedFile: FileAstSummary | undefined = analysis.fileSummaries[selectedFileIndex] || analysis.fileSummaries[0];

  const filteredSymbols: CodeSymbol[] = selectedFile
    ? selectedFile.symbols.filter((s) => symbolFilter === 'ALL' || s.kind === symbolFilter)
    : [];

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full font-mono select-none overflow-hidden bg-[#dfb2b2]">
      {/* Left Column: Discovered Files List with Framework Tags */}
      <div className="w-full md:w-80 border-r border-[#111111] flex flex-col bg-[#dfb2b2]/50">
        <div className="p-3 border-b border-[#111111] bg-[#dfb2b2] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-widest uppercase text-[#111111] flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>DISCOVERED FILES ({analysis.fileSummaries.length})</span>
          </span>
          <span className="text-[9px] px-1.5 py-0.2 border border-[#111111] bg-[#111111] text-[#dfb2b2] font-bold">
            {analysis.parserStatus}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-[#111111]/20">
          {analysis.fileSummaries.map((file, idx) => {
            const fw = analysis.documentation.frameworkVersions.find((f) => f.matchedFiles.includes(file.filePath));
            return (
              <button
                key={idx}
                onClick={() => setSelectedFileIndex(idx)}
                className={`w-full p-2.5 text-left text-[10px] transition-colors flex flex-col space-y-1 ${
                  selectedFileIndex === idx
                    ? 'bg-[#111111] text-[#dfb2b2]'
                    : 'hover:bg-[#111111]/10 text-[#111111]'
                }`}
              >
                <div className="font-bold truncate">{file.filePath}</div>
                <div className="flex items-center justify-between text-[8px] opacity-75">
                  <span>{file.language} {fw ? `// ${fw.name} ${fw.version}` : ''}</span>
                  <span>{file.lineCount} L // {file.symbols.length} sym</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Global Summary Badge */}
        <div className="p-3 border-t border-[#111111] bg-[#dfb2b2] space-y-1 text-[9px]">
          <div className="flex justify-between text-[#111111]/80">
            <span>PARSER ENGINE:</span>
            <span className="font-bold">{analysis.parserName}</span>
          </div>
          <div className="flex justify-between text-[#111111]/80">
            <span>TOTAL STATEMENTS:</span>
            <span className="font-bold">{analysis.totalStatements}</span>
          </div>
          <div className="flex justify-between text-[#111111]/80">
            <span>AST PARSE TIME:</span>
            <span className="font-bold">{analysis.timings.parsingMs}ms</span>
          </div>
        </div>
      </div>

      {/* Right Column: AST Inspection Dossier for Selected File */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#dfb2b2]">
        {selectedFile ? (
          <>
            {/* Top Bar for File Details */}
            <div className="p-3 border-b border-[#111111] flex flex-wrap items-center justify-between gap-2 bg-[#dfb2b2]">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#111111]" />
                <span className="font-bold text-[11px] uppercase tracking-wider text-[#111111]">
                  {selectedFile.filePath}
                </span>
                {onNavigateToSource && (
                  <button
                    onClick={() => onNavigateToSource(selectedFile.filePath, 1)}
                    className="text-[9px] underline hover:text-black font-bold ml-2"
                  >
                    OPEN IN EDITOR
                  </button>
                )}
              </div>
              <div className="flex items-center space-x-2 text-[9px]">
                <span className="px-2 py-0.5 border border-[#111111]">
                  LINES: {selectedFile.lineCount}
                </span>
                <span className="px-2 py-0.5 border border-[#111111]">
                  STATEMENTS: {selectedFile.statementCount}
                </span>
                <span className="px-2 py-0.5 border border-[#111111] bg-[#111111] text-[#dfb2b2]">
                  {selectedFile.language}
                </span>
              </div>
            </div>

            {/* Navigation Tabs for AST entities */}
            <div className="grid grid-cols-4 border-b border-[#111111] text-[10px] font-bold">
              <button
                onClick={() => setExpandedSection('symbols')}
                className={`py-2 px-2 text-center transition-colors border-r border-[#111111] ${
                  expandedSection === 'symbols' ? 'bg-[#111111] text-[#dfb2b2]' : 'hover:bg-[#111111]/10 text-[#111111]'
                }`}
              >
                SYMBOLS ({selectedFile.symbols.length})
              </button>
              <button
                onClick={() => setExpandedSection('imports')}
                className={`py-2 px-2 text-center transition-colors border-r border-[#111111] ${
                  expandedSection === 'imports' ? 'bg-[#111111] text-[#dfb2b2]' : 'hover:bg-[#111111]/10 text-[#111111]'
                }`}
              >
                IMPORTS ({selectedFile.imports.length})
              </button>
              <button
                onClick={() => setExpandedSection('frameworks')}
                className={`py-2 px-2 text-center transition-colors border-r border-[#111111] ${
                  expandedSection === 'frameworks' ? 'bg-[#111111] text-[#dfb2b2]' : 'hover:bg-[#111111]/10 text-[#111111]'
                }`}
              >
                FRAMEWORKS ({analysis.documentation.frameworkVersions.length})
              </button>
              <button
                onClick={() => setExpandedSection('diagnostics')}
                className={`py-2 px-2 text-center transition-colors flex items-center justify-center space-x-1 ${
                  expandedSection === 'diagnostics' ? 'bg-[#111111] text-[#dfb2b2]' : 'hover:bg-[#111111]/10 text-[#111111]'
                }`}
              >
                {analysis.diagnostics.length > 0 && <AlertTriangle className="w-3 h-3 text-amber-800" />}
                <span>DIAGNOSTICS ({analysis.diagnostics.length})</span>
              </button>
            </div>

            {/* Body Section */}
            <div className="flex-1 overflow-y-auto p-4">
              {expandedSection === 'symbols' && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-[9px]">
                    <span className="font-bold text-[#111111]/70 uppercase">FILTER:</span>
                    {['ALL', 'function', 'class', 'method', 'interface'].map((kind) => (
                      <button
                        key={kind}
                        onClick={() => setSymbolFilter(kind)}
                        className={`px-2 py-0.5 border border-[#111111] transition-colors ${
                          symbolFilter === kind ? 'bg-[#111111] text-[#dfb2b2]' : 'hover:bg-[#111111]/10 text-[#111111]'
                        }`}
                      >
                        {kind.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredSymbols.map((sym, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 border border-[#111111] bg-[#dfb2b2]/40 space-y-1 text-[10px]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#111111] truncate">{sym.name}</span>
                          <span className="text-[8px] font-mono px-1 py-0.2 border border-[#111111] bg-[#111111]/10">
                            {sym.kind}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[8px] text-[#111111]/70">
                          <span>LOCATION: L{sym.line}:C{sym.character}</span>
                          <div className="space-x-1.5">
                            <span className={sym.exported ? 'font-bold text-emerald-800' : 'text-[#111111]/50'}>
                              {sym.exported ? 'EXPORTED' : 'INTERNAL'}
                            </span>
                            {onNavigateToSource && (
                              <button
                                onClick={() => onNavigateToSource(selectedFile.filePath, sym.line)}
                                className="underline hover:text-[#111111]"
                              >
                                JUMP TO LINE
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expandedSection === 'imports' && (
                <div className="space-y-2">
                  {selectedFile.imports.map((imp, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 border border-[#111111] bg-[#dfb2b2]/40 flex flex-col md:flex-row md:items-center justify-between text-[10px] gap-2"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-[#111111]">from &apos;{imp.source}&apos;</span>
                        <div className="text-[8px] text-[#111111]/70">
                          SPECIFIERS: {imp.specifiers.join(', ') || '(Default Ingestion)'}
                        </div>
                      </div>
                      <span className="text-[8px] px-1.5 py-0.5 border border-[#111111]/40 text-[#111111]/60">
                        LINE {imp.line}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {expandedSection === 'frameworks' && (
                <div className="space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#111111]/80">
                    DETECTED PACKAGE VERSIONS (READ FROM MANIFEST)
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysis.documentation.frameworkVersions.map((fw, idx) => (
                      <div key={idx} className="p-3 border border-[#111111] bg-[#dfb2b2] space-y-1.5 text-[10px]">
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase text-[11px] text-[#111111] flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" />
                            <span>{fw.name}</span>
                          </span>
                          <span className="text-[8px] px-1.5 py-0.2 border border-[#111111] bg-[#111111] text-[#dfb2b2] font-bold">
                            {fw.version}
                          </span>
                        </div>
                        <div className="text-[8px] text-[#111111]/70">EVIDENCE SOURCE: {fw.source}</div>
                        <div className="text-[8px] text-[#111111]/60">
                          ASSOCIATED FILES: {fw.matchedFiles.slice(0, 3).join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expandedSection === 'diagnostics' && (
                <div className="space-y-2">
                  {analysis.diagnostics.length > 0 ? (
                    analysis.diagnostics.map((diag, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 border text-[10px] space-y-1 ${
                          diag.severity === 'error'
                            ? 'border-red-700 bg-red-100/50 text-red-900'
                            : 'border-amber-700 bg-amber-100/50 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="uppercase">{diag.severity}</span>
                          <span>{diag.file} : LINE {diag.line}</span>
                        </div>
                        <p>{diag.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 border border-[#111111] bg-[#dfb2b2]/40 text-center space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-800 mx-auto" />
                      <div className="font-bold text-[11px] uppercase">
                        ZERO SYNTAX OR PARSER DIAGNOSTIC ERRORS
                      </div>
                      <p className="text-[10px] text-[#111111]/70">
                        TypeScript compiler successfully parsed all AST nodes with clean token resolution.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};
export default ParserInspectorView;
