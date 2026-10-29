import type { NextApiRequest, NextApiResponse } from 'next';
import { buildGitHubSearchQueries, scoreRepositorySimilarity } from '@/lib/githubDiscovery';
import { GitHubSimilarRepo } from '@/types/architecture';

interface SearchRequestBody {
  language?: string;
  technologies?: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{
    results: GitHubSimilarRepo[];
    totalFound: number;
    searchDurationMs: number;
    queryUsed: string;
    warning?: string;
  } | { error: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  const startTime = performance.now();

  try {
    const body = (req.body || {}) as SearchRequestBody;
    const language = typeof body.language === 'string' ? body.language : '';
    const technologies = Array.isArray(body.technologies)
      ? body.technologies.filter((technology): technology is string => typeof technology === 'string')
      : [];

    const queries = buildGitHubSearchQueries(language, technologies);
    const primaryQuery = queries[0];
    if (!primaryQuery) {
      return res.status(400).json({ error: 'Provide a language or detected technology to search for similar repositories.' });
    }

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'SYNAPSE-Architecture-Visualizer-v1',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const githubSearchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(primaryQuery)}&sort=stars&order=desc&per_page=12`;

    let items: Array<{
      id: number;
      name: string;
      full_name: string;
      description: string | null;
      html_url: string;
      language: string | null;
      topics?: string[];
      stargazers_count: number;
      forks_count: number;
      updated_at: string;
    }> = [];

    try {
      const response = await fetch(githubSearchUrl, { headers });
      if (response.ok) {
        const data = await response.json();
        items = data.items || [];
      } else {
        return res.status(response.status === 403 ? 429 : response.status).json({
          error: `GitHub repository search failed (${response.status} ${response.statusText}).`,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Network request failed';
      return res.status(502).json({ error: `Unable to reach GitHub repository search: ${message}` });
    }

    // Rank and score candidates using multi-factor transparent formula
    const rankedResults: GitHubSimilarRepo[] = items.map((repo) => {
      const { similarityScore, scoreBreakdown, matchRationale } = scoreRepositorySimilarity(
        repo,
        language,
        technologies
      );

      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || 'No description provided by repository maintainer.',
        htmlUrl: repo.html_url,
        language: repo.language || 'Unknown',
        topics: repo.topics || [],
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
        similarityScore,
        scoreBreakdown,
        matchRationale,
      };
    });

    // Sort by calculated similarity score descending
    rankedResults.sort((a, b) => b.similarityScore - a.similarityScore);

    const searchDurationMs = Math.round((performance.now() - startTime) * 100) / 100;

    return res.status(200).json({
      results: rankedResults,
      totalFound: rankedResults.length,
      searchDurationMs,
      queryUsed: primaryQuery,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown search failure';
    return res.status(500).json({ error: `GitHub Discovery failed: ${message}` });
  }
}
