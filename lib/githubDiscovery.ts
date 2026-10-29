import { GitHubSimilarRepo } from '@/types/architecture';

export interface GitHubDiscoveryQuery {
  language: string;
  technologies: string[];
  topics: string[];
  projectName: string;
}

/**
 * Derives search query keywords from real AST analysis evidence
 */
export function buildGitHubSearchQueries(
  language: string,
  technologies: string[]
): string[] {
  const queries: string[] = [];

  const langTerm = language && language !== 'Unknown' ? `language:${language.toLowerCase()}` : '';

  // Extract unique technology names (e.g., 'express', 'redis', 'postgres', 'kafka')
  const cleanTechs = technologies
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length > 2 && !['typescript', 'javascript', 'engine', 'node', 'module'].includes(t));

  const uniqueTechs = Array.from(new Set(cleanTechs)).slice(0, 3);

  if (uniqueTechs.length > 0 || langTerm) {
    queries.push(`${uniqueTechs.join(' ')} ${langTerm} stars:>15`.trim());
  }
  if (langTerm) {
    queries.push(`microservice architecture ${langTerm} stars:>20`);
    queries.push(`api gateway router ${langTerm} stars:>10`);
  }

  return queries;
}

/**
 * Calculates a multi-factor similarity score between 0 and 100 based on actual GitHub repository metadata
 */
export function scoreRepositorySimilarity(
  repo: {
    name: string;
    description: string | null;
    language: string | null;
    topics?: string[];
  },
  projectLanguage: string,
  targetTechnologies: string[]
): {
  similarityScore: number;
  scoreBreakdown: GitHubSimilarRepo['scoreBreakdown'];
  matchRationale: string;
} {
  const textCorpus = `${repo.name} ${repo.description || ''} ${(repo.topics || []).join(' ')}`.toLowerCase();

  // 1. Language Match (Max 25 pts)
  let languageMatch = 0;
  if (repo.language && projectLanguage && repo.language.toLowerCase() === projectLanguage.toLowerCase()) {
    languageMatch = 25;
  } else if (
    (repo.language?.toLowerCase() === 'javascript' && projectLanguage.toLowerCase() === 'typescript') ||
    (repo.language?.toLowerCase() === 'typescript' && projectLanguage.toLowerCase() === 'javascript')
  ) {
    languageMatch = 18;
  } else if (repo.language) {
    languageMatch = 5;
  }

  // 2. Technology Stack Overlap (Max 30 pts)
  let techMatchesCount = 0;
  const matchedTechs: string[] = [];
  for (const tech of targetTechnologies) {
    const clean = tech.toLowerCase().trim();
    if (clean && textCorpus.includes(clean)) {
      techMatchesCount++;
      matchedTechs.push(tech);
    }
  }
  const technologyMatch = Math.min(30, techMatchesCount * 10);

  // 3. Topic & Keyword Alignment (Max 25 pts)
  const architecturalKeywords = ['gateway', 'router', 'microservice', 'api', 'database', 'middleware', 'cache', 'queue', 'ast', 'architecture'];
  let keywordMatches = 0;
  for (const kw of architecturalKeywords) {
    if (textCorpus.includes(kw)) {
      keywordMatches++;
    }
  }
  const topicKeywordMatch = Math.min(25, keywordMatches * 5);

  // 4. Architectural Pattern Overlap (Max 20 pts)
  let architecturalMatch = 0;
  if (textCorpus.includes('microservice') || textCorpus.includes('distributed')) {
    architecturalMatch += 8;
  }
  if (textCorpus.includes('pipeline') || textCorpus.includes('flow') || textCorpus.includes('visualizer')) {
    architecturalMatch += 7;
  }
  architecturalMatch = Math.min(20, architecturalMatch);

  const similarityScore = Math.min(100, Math.round(languageMatch + technologyMatch + topicKeywordMatch + architecturalMatch));

  // Build a transparent grounded explanation
  const rationaleParts: string[] = [];
  if (languageMatch >= 18) {
    rationaleParts.push(`Shared runtime (${repo.language})`);
  }
  if (matchedTechs.length > 0) {
    rationaleParts.push(`Stack overlap on: ${matchedTechs.slice(0, 3).join(', ')}`);
  }
  if (keywordMatches > 0) {
    rationaleParts.push(`${keywordMatches} architectural keyword match(es)`);
  }
  if (rationaleParts.length === 0) {
    rationaleParts.push('No explicit language, stack, or architecture keyword matches were found');
  }

  return {
    similarityScore,
    scoreBreakdown: {
      technologyMatch,
      languageMatch,
      topicKeywordMatch,
      architecturalMatch,
    },
    matchRationale: rationaleParts.join('; ') + '.',
  };
}
