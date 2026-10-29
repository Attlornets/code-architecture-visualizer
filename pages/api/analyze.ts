import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeSourceProject, SourceInputFile } from '@/lib/astParser';
import { AnalysisResult } from '@/types/architecture';

interface AnalyzeRequestBody {
  sourceCode?: string;
  files?: SourceInputFile[];
  githubUrl?: string;
  projectName?: string;
}

interface GitHubRepository {
  default_branch: string;
}

interface GitHubTreeItem {
  path: string;
  type: string;
  size?: number;
}

const MAX_GITHUB_FILES = 50;
const MAX_FILE_BYTES = 500_000;
const MAX_TOTAL_BYTES = 5_000_000;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function parseGitHubRepositoryUrl(value: string): { owner: string; repo: string } | null {
  const match = value.trim().replace(/\.git\/?$/, '').match(/^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/);
  return match ? { owner: match[1], repo: match[2] } : null;
}

function isSourcePath(path: string): boolean {
  const isPackageManifest = path.split('/').pop() === 'package.json';
  return (
    /(^|\/)(node_modules|vendor|dist|build|coverage)(\/|$)/i.test(path) === false &&
    (/\.(?:ts|tsx|js|jsx|mjs|cjs|mts|cts)$/i.test(path) || isPackageManifest) &&
    !/\.(?:test|spec)\.[^.]+$/i.test(path) &&
    !/\.min\.(?:js|mjs|cjs)$/i.test(path)
  );
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'SYNAPSE-Architecture-Visualizer',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

function githubErrorStatus(status: number): number {
  return status === 403 ? 429 : status;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AnalysisResult | { error: string; details?: string }>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const body = (req.body || {}) as AnalyzeRequestBody;
    let inputFiles: SourceInputFile[] = [];
    let effectiveProjectName = typeof body.projectName === 'string' ? body.projectName.trim() : '';

    if (Array.isArray(body.files) && body.files.length > 0) {
      if (body.files.some((file) => !file || typeof file.path !== 'string' || typeof file.content !== 'string')) {
        return res.status(400).json({ error: 'Each file must include a string path and string content.' });
      }
      inputFiles = body.files;
    } else if (typeof body.sourceCode === 'string' && body.sourceCode.trim()) {
      inputFiles = [{ path: 'src/snippet.ts', content: body.sourceCode }];
    } else if (typeof body.githubUrl === 'string') {
      const repository = parseGitHubRepositoryUrl(body.githubUrl);
      if (!repository) {
        return res.status(400).json({ error: 'Invalid GitHub repository URL. Use https://github.com/owner/repository.' });
      }

      const apiBase = `https://api.github.com/repos/${repository.owner}/${repository.repo}`;
      const repoResponse = await fetch(apiBase, { headers: githubHeaders() });
      if (!repoResponse.ok) {
        return res.status(githubErrorStatus(repoResponse.status)).json({
          error: `GitHub repository request failed (${repoResponse.status} ${repoResponse.statusText}). Private repositories require GITHUB_TOKEN.`,
        });
      }
      const repositoryInfo = await repoResponse.json() as GitHubRepository;
      if (!repositoryInfo.default_branch) {
        return res.status(502).json({ error: 'GitHub response did not include a default branch.' });
      }

      const encodedBranch = encodeURIComponent(repositoryInfo.default_branch);
      const treeResponse = await fetch(`${apiBase}/git/trees/${encodedBranch}?recursive=1`, { headers: githubHeaders() });
      if (!treeResponse.ok) {
        return res.status(githubErrorStatus(treeResponse.status)).json({
          error: `GitHub source tree request failed (${treeResponse.status} ${treeResponse.statusText}).`,
        });
      }

      const treeData = await treeResponse.json() as { tree?: GitHubTreeItem[]; truncated?: boolean };
      if (treeData.truncated) {
        return res.status(422).json({ error: 'GitHub returned a truncated repository tree; a complete analysis cannot be produced.' });
      }
      const targetFiles = (treeData.tree || []).filter((item) => item.type === 'blob' && isSourcePath(item.path));
      if (targetFiles.length === 0) {
        return res.status(422).json({ error: 'No supported source files were discovered in the GitHub repository.' });
      }
      if (targetFiles.length > MAX_GITHUB_FILES) {
        return res.status(413).json({
          error: `The repository contains ${targetFiles.length} supported files; analysis is limited to ${MAX_GITHUB_FILES} files to avoid incomplete results.`,
        });
      }
      if (targetFiles.some((file) => (file.size || 0) > MAX_FILE_BYTES) ||
        targetFiles.reduce((total, file) => total + (file.size || 0), 0) > MAX_TOTAL_BYTES) {
        return res.status(413).json({ error: 'The discovered source files exceed the GitHub analysis size limit.' });
      }

      const responses = await Promise.all(targetFiles.map(async (file) => {
        const encodedPath = file.path.split('/').map(encodeURIComponent).join('/');
        const rawUrl = `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/${encodedBranch}/${encodedPath}`;
        const response = await fetch(rawUrl);
        if (!response.ok) {
          throw new Error(`Unable to retrieve ${file.path} (${response.status} ${response.statusText}).`);
        }
        const content = await response.text();
        if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) {
          throw new Error(`${file.path} exceeds the per-file analysis size limit.`);
        }
        return { path: file.path, content };
      }));

      if (responses.reduce((total, file) => total + Buffer.byteLength(file.content, 'utf8'), 0) > MAX_TOTAL_BYTES) {
        return res.status(413).json({ error: 'Downloaded source files exceed the total analysis size limit.' });
      }
      inputFiles = responses;
      effectiveProjectName = repository.repo;
    }

    if (inputFiles.length === 0) {
      return res.status(400).json({ error: 'Provide non-empty sourceCode, files, or a GitHub repository URL.' });
    }
    if (inputFiles.some((file) => !file.content.trim())) {
      return res.status(400).json({ error: 'Empty source files are not included in analysis.' });
    }

    return res.status(200).json(
      analyzeSourceProject(inputFiles, effectiveProjectName || 'ANALYZED SOURCE')
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown compilation exception';
    return res.status(500).json({ error: 'Architecture analysis failed.', details: message });
  }
}
