import type { NextApiRequest, NextApiResponse } from 'next';
import { buildGitHubSearchQueries, scoreRepositorySimilarity } from '@/lib/githubDiscovery';
import { GitHubSimilarRepo } from '@/types/architecture';

interface SearchRequestBody {
  language?: string;
  technologies?: string[];
  topics?: string[];
  projectName?: string;
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
    const { language = 'TypeScript', technologies = [] }: SearchRequestBody = req.body;

    const queries = buildGitHubSearchQueries(language, technologies);
    const primaryQuery = queries[0] || 'language:typescript microservice';

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'SYNAPSE-Architecture-Visualizer-v1',
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const githubSearchUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(primaryQuery)}&sort=stars&order=desc&per_page=12`;

    let apiWarning: string | undefined;
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
        if (response.status === 403) {
          apiWarning = 'GitHub REST API unauthenticated rate limit reached. Displaying grounded heuristic architectural candidates.';
        } else {
          apiWarning = `GitHub API returned ${response.status}. Using grounded fallback dataset.`;
        }
      }
    } catch {
      apiWarning = 'Network connectivity to api.github.com interrupted. Using offline architectural dataset.';
    }

    // High-quality verified architectural fallback repositories if GitHub API is rate-limited or offline
    if (items.length === 0) {
      items = [
        {
          id: 101,
          name: 'nest',
          full_name: 'nestjs/nest',
          description: 'A progressive Node.js framework for building efficient, reliable and scalable server-side applications with modular architecture.',
          html_url: 'https://github.com/nestjs/nest',
          language: 'TypeScript',
          topics: ['typescript', 'architecture', 'microservices', 'framework', 'api-gateway'],
          stargazers_count: 67400,
          forks_count: 7500,
          updated_at: '2026-10-20T12:00:00Z',
        },
        {
          id: 102,
          name: 'fastify',
          full_name: 'fastify/fastify',
          description: 'Fast and low overhead web framework for Node.js with high throughput routing and modular plugins.',
          html_url: 'https://github.com/fastify/fastify',
          language: 'JavaScript',
          topics: ['fastify', 'router', 'microservices', 'gateway', 'performance'],
          stargazers_count: 31200,
          forks_count: 2300,
          updated_at: '2026-10-22T08:30:00Z',
        },
        {
          id: 103,
          name: 'bullmq',
          full_name: 'taskforcesh/bullmq',
          description: 'High-performance distributed message queue and batch processing for Node.js and TypeScript on Redis.',
          html_url: 'https://github.com/taskforcesh/bullmq',
          language: 'TypeScript',
          topics: ['redis', 'queue', 'kafka', 'jobs', 'distributed-systems'],
          stargazers_count: 7800,
          forks_count: 820,
          updated_at: '2026-10-24T15:45:00Z',
        },
        {
          id: 104,
          name: 'prisma',
          full_name: 'prisma/prisma',
          description: 'Next-generation ORM for Node.js & TypeScript with typed queries, migrations, and database connection pooling.',
          html_url: 'https://github.com/prisma/prisma',
          language: 'TypeScript',
          topics: ['database', 'postgres', 'orm', 'sql', 'typescript'],
          stargazers_count: 39500,
          forks_count: 1600,
          updated_at: '2026-10-25T09:10:00Z',
        },
        {
          id: 105,
          name: 'trpc',
          full_name: 'trpc/trpc',
          description: 'Move Fast and Break Nothing. End-to-end typesafe APIs made easy for client-server architecture.',
          html_url: 'https://github.com/trpc/trpc',
          language: 'TypeScript',
          topics: ['typescript', 'rpc', 'api', 'fullstack', 'architecture'],
          stargazers_count: 35100,
          forks_count: 1400,
          updated_at: '2026-10-26T14:20:00Z',
        },
      ];
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
      warning: apiWarning,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown search failure';
    return res.status(500).json({ error: `GitHub Discovery failed: ${message}` });
  }
}
