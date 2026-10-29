import type { NextApiRequest, NextApiResponse } from 'next';
import { analyzeSourceProject, SourceInputFile } from '@/lib/astParser';
import { AnalysisResult } from '@/types/architecture';

interface AnalyzeRequestBody {
  sourceCode?: string;
  files?: SourceInputFile[];
  githubUrl?: string;
  projectName?: string;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

/**
 * Validates and normalizes GitHub repo URLs into owner/repo identifier
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const cleaned = url.trim().replace(/\/+$/, '');
    const match = cleaned.match(/^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  } catch {
    return null;
  }
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
    const { sourceCode, files, githubUrl, projectName }: AnalyzeRequestBody = req.body;

    const inputFiles: SourceInputFile[] = [];

    // Mode A: Direct Source Snippet / In-memory files
    if (files && Array.isArray(files) && files.length > 0) {
      inputFiles.push(...files);
    } else if (sourceCode && typeof sourceCode === 'string') {
      inputFiles.push({
        path: 'src/api/gateway.ts',
        content: sourceCode,
      });
    } else if (githubUrl && typeof githubUrl === 'string') {
      // Mode B: GitHub Repository Remote Ingestion via GitHub REST API
      const parsed = parseGitHubUrl(githubUrl);
      if (!parsed) {
        return res.status(400).json({
          error: 'Invalid GitHub repository URL format. Must be https://github.com/owner/repository',
        });
      }

      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'SYNAPSE-Architecture-Visualizer-v1',
      };
      if (process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
      }

      // Fetch repo tree to discover source files safely
      const treeUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/main?recursive=1`;
      let treeRes = await fetch(treeUrl, { headers });
      if (!treeRes.ok) {
        // Fallback to master branch
        treeRes = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/master?recursive=1`, { headers });
      }

      if (!treeRes.ok) {
        return res.status(treeRes.status === 403 ? 429 : treeRes.status).json({
          error: `GitHub API error (${treeRes.status}): ${treeRes.statusText}. Rate limit may be exceeded or repository is private.`,
        });
      }

      const treeData = await treeRes.json();
      const treeItems: { path: string; type: string }[] = treeData.tree || [];

      // Filter TypeScript and JavaScript source files (up to 8 files to respect limits)
      const targetPaths = treeItems
        .filter((item) => item.type === 'blob' && (item.path.endsWith('.ts') || item.path.endsWith('.tsx') || item.path.endsWith('.js')))
        .filter((item) => !item.path.includes('.test.') && !item.path.includes('.spec.') && !item.path.includes('node_modules'))
        .slice(0, 8)
        .map((item) => item.path);

      if (targetPaths.length === 0) {
        return res.status(400).json({
          error: 'No supported TypeScript/JavaScript source files discovered in the target repository.',
        });
      }

      // Fetch file raw contents safely
      for (const filePath of targetPaths) {
        const rawUrl = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/HEAD/${filePath}`;
        try {
          const rawRes = await fetch(rawUrl, { headers });
          if (rawRes.ok) {
            const content = await rawRes.text();
            if (content.length < 500000) { // Limit to 500KB per file
              inputFiles.push({ path: filePath, content });
            }
          }
        } catch {
          // Continue fetching others
        }
      }
    }

    if (inputFiles.length === 0) {
      return res.status(400).json({
        error: 'No valid source code or accessible files provided for AST compilation.',
      });
    }

    const effectiveProjectName = projectName || (githubUrl ? parseGitHubUrl(githubUrl)?.repo || 'GITHUB REPO' : 'AST COMPILED PIPELINE');
    const result = analyzeSourceProject(inputFiles, effectiveProjectName);

    return res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown compilation exception';
    return res.status(500).json({
      error: 'Architecture synthesis pipeline failed',
      details: message,
    });
  }
}
