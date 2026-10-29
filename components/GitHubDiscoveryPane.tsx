import React, { useState } from 'react';
import {
  Compass,
  Star,
  GitFork,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { GitHubSimilarRepo, AnalysisResult } from '@/types/architecture';

interface GitHubDiscoveryPaneProps {
  analysis: AnalysisResult | null;
}

export const GitHubDiscoveryPane: React.FC<GitHubDiscoveryPaneProps> = ({
  analysis,
}) => {
  const [results, setResults] = useState<GitHubSimilarRepo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [searchDuration, setSearchDuration] = useState<number>(0);
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [languageFilter, setLanguageFilter] = useState<string>('ALL');
  const [apiWarning, setApiWarning] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDiscoverSimilar = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setApiWarning(null);

    const language = analysis?.language || '';
    const technologies = analysis?.documentation.externalIntegrations || [];

    try {
      const res = await fetch('/api/github/search-similar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          technologies,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Search request failed with status ${res.status}`);
      if (!Array.isArray(data.results)) throw new Error('GitHub search returned an invalid results payload.');
      setResults(data.results);
      setSearchDuration(data.searchDurationMs);
      if (data.warning) {
        setApiWarning(data.warning);
      }
      setHasSearched(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to search GitHub';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResults = results.filter((repo) => {
    const matchesScore = repo.similarityScore >= minScoreFilter;
    const matchesLang = languageFilter === 'ALL' || repo.language.toLowerCase() === languageFilter.toLowerCase();
    return matchesScore && matchesLang;
  });

  return (
    <div className="border border-[#111111] bg-[#dfb2b2] p-4 font-mono select-none space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#111111] pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-[#111111]" />
            <h3 className="text-xs font-bold tracking-widest uppercase text-[#111111]">
              SIMILAR REPOSITORIES — GITHUB INTELLIGENCE
            </h3>
          </div>
          <p className="text-[10px] text-[#111111]/70 leading-normal">
            Repository search and ranking based on detected source language, external package imports, and live repository metadata.
          </p>
        </div>

        <button
          onClick={handleDiscoverSimilar}
          disabled={isLoading || !analysis}
          className="px-4 py-2 bg-[#111111] text-[#dfb2b2] text-[10px] font-bold tracking-widest uppercase flex items-center justify-center space-x-1.5 border border-[#111111] hover:bg-transparent hover:text-[#111111] transition-all disabled:opacity-50 shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>SEARCHING GITHUB API...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span className="editorial-letter-spacing">FIND SIMILAR REPOSITORIES</span>
            </>
          )}
        </button>
      </div>

      {apiWarning && (
        <div className="p-2 border border-amber-800 bg-amber-100/50 text-amber-900 text-[9px] flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{apiWarning}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-2 border border-red-800 bg-red-100/50 text-red-900 text-[9px]">
          {errorMsg}
        </div>
      )}

      {!analysis && (
        <p className="text-[9px] text-[#111111]/70">Analyze source before searching; no sample stack is substituted.</p>
      )}

      {hasSearched && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[9px] border-b border-[#111111]/20 pb-2">
            <div className="flex items-center space-x-3">
              <span className="text-[#111111]/70 font-bold uppercase">
                SHOWING {filteredResults.length} OF {results.length} REPOSITORIES ({searchDuration}ms)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[#111111]/60">MIN SIMILARITY:</span>
              <select
                value={minScoreFilter}
                onChange={(e) => setMinScoreFilter(Number(e.target.value))}
                className="bg-transparent border border-[#111111] px-1 py-0.5 text-[9px]"
              >
                <option value={0} className="bg-[#dfb2b2]">ALL SCORES</option>
                <option value={50} className="bg-[#dfb2b2]">&gt; 50% MATCH</option>
                <option value={70} className="bg-[#dfb2b2]">&gt; 70% MATCH</option>
              </select>

              <span className="text-[#111111]/60">LANGUAGE:</span>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="bg-transparent border border-[#111111] px-1 py-0.5 text-[9px]"
              >
                <option value="ALL" className="bg-[#dfb2b2]">ALL</option>
                <option value="TypeScript" className="bg-[#dfb2b2]">TYPESCRIPT</option>
                <option value="JavaScript" className="bg-[#dfb2b2]">JAVASCRIPT</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredResults.map((repo, idx) => (
              <div
                key={repo.id}
                className="border border-[#111111] bg-[#dfb2b2]/40 p-3 space-y-2 flex flex-col justify-between transition-colors hover:bg-[#dfb2b2]"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-bold text-[#111111]/60">#{idx + 1}</span>
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-[11px] text-[#111111] hover:underline flex items-center space-x-1"
                      >
                        <span className="truncate">{repo.fullName}</span>
                        <ExternalLink className="w-2.5 h-2.5 inline" />
                      </a>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 border border-[#111111] bg-[#111111] text-[#dfb2b2]">
                        {repo.similarityScore}% SIMILAR
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#111111]/80 line-clamp-2 leading-relaxed font-sans">
                    {repo.description}
                  </p>

                  {/* Match Rationale Pill */}
                  <div className="p-1.5 border border-[#111111]/30 bg-[#dfb2b2] text-[9px] text-[#111111]/90">
                    <span className="font-bold uppercase text-[8px] text-[#111111]/60 block">RATIONALE:</span>
                    <span>{repo.matchRationale}</span>
                  </div>
                </div>

                {/* Score Breakdown & Social Metrics */}
                <div className="pt-2 border-t border-[#111111]/20 flex flex-wrap items-center justify-between text-[8px] text-[#111111]/70 gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[#111111]">{repo.language}</span>
                    <span>{'//'}</span>
                    <span className="flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5" />
                      {repo.stars.toLocaleString()}
                    </span>
                    <span>{'//'}</span>
                    <span className="flex items-center gap-0.5">
                      <GitFork className="w-2.5 h-2.5" />
                      {repo.forks.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-[8px] text-[#111111]/50">
                    UPDATED: {new Date(repo.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredResults.length === 0 && (
            <div className="p-6 text-center text-[10px] text-[#111111]/60 italic border border-[#111111]/30">
              Zero candidate repositories matched your active filter thresholds.
            </div>
          )}
        </>
      )}

      {!hasSearched && !isLoading && (
        <div className="p-6 border border-[#111111]/30 text-center text-[10px] text-[#111111]/70 bg-[#dfb2b2]/20">
          Click &quot;FIND SIMILAR REPOSITORIES&quot; to derive search queries from the active codebase and discover relevant public open-source architectures on GitHub.
        </div>
      )}
    </div>
  );
};
export default GitHubDiscoveryPane;
