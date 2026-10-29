import type { NextApiRequest, NextApiResponse } from 'next';
import type { GitCommitInfo } from '@/types/architecture';

interface GitHubRawCommit {
  sha: string;
  commit: {
    author: {
      name?: string;
      email?: string;
      date?: string;
    } | null;
    message: string;
  };
}

function parseGitHubRepository(value: string): { owner: string; repo: string } | null {
  const match = value.trim().replace(/\.git\/?$/, '').match(/^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/);
  return match ? { owner: match[1], repo: match[2] } : null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ commits: GitCommitInfo[]; source: string } | { error: string }>
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const githubUrl = req.method === 'POST' ? req.body?.githubUrl : req.query.githubUrl;
  if (typeof githubUrl !== 'string') {
    return res.status(400).json({ error: 'A GitHub repository URL is required for commit history.' });
  }

  const repository = parseGitHubRepository(githubUrl);
  if (!repository) {
    return res.status(400).json({ error: 'Invalid GitHub repository URL.' });
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'SYNAPSE-Architecture-Visualizer',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${repository.owner}/${repository.repo}/commits?per_page=10`,
      { headers }
    );
    if (!response.ok) {
      return res.status(response.status === 403 ? 429 : response.status).json({
        error: `GitHub commit history request failed (${response.status} ${response.statusText}).`,
      });
    }

    const rawCommits = await response.json() as GitHubRawCommit[];
    const commits: GitCommitInfo[] = rawCommits.map((commit) => ({
      hash: commit.sha,
      shortHash: commit.sha.slice(0, 7),
      author: commit.commit.author?.name || 'Unknown author',
      authorEmail: commit.commit.author?.email,
      date: commit.commit.author?.date,
      message: commit.commit.message,
      changedFiles: [],
    }));

    return res.status(200).json({
      commits,
      source: `GitHub REST API (${repository.owner}/${repository.repo})`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown GitHub request failure';
    return res.status(502).json({ error: `Unable to retrieve GitHub commit history: ${message}` });
  }
}
