export type NodeCategory =
  | 'gateway'
  | 'middleware'
  | 'service'
  | 'database'
  | 'queue'
  | 'cache'
  | 'module'
  | 'client';

export type NodeStatus = 'HEALTHY' | 'SYNCED' | 'WARNING' | 'STANDBY';

export interface NodeMetrics {
  latency: string;
  throughput: string;
  securityZone: string;
  complexity: string;
}

export interface NodeDependencies {
  upstream: string[];
  downstream: string[];
}

export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type' | 'method';
  line: number;
  character: number;
  exported: boolean;
  docstring?: string;
}

export interface FileAstSummary {
  filePath: string;
  language: string;
  lineCount: number;
  statementCount: number;
  symbols: CodeSymbol[];
  imports: {
    source: string;
    specifiers: string[];
    isDefault: boolean;
    line: number;
  }[];
  parseErrors: string[];
}

export interface ArchitectureNode {
  id: string;
  hexId: string;
  label: string;
  category: NodeCategory;
  technology: string;
  status: NodeStatus;
  fileOrigin: string;
  x: number; // percentage in coordinate canvas (0 - 100)
  y: number; // percentage in coordinate canvas (0 - 100)
  metrics: NodeMetrics;
  summary: string;
  callChain: string[];
  dependencies: NodeDependencies;
  dataContracts: string[];
  // Grounded AST metadata
  files?: string[];
  symbols?: CodeSymbol[];
  inferred?: boolean;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  protocol: string;
  flowLabel: string;
  active: boolean;
  isInferred?: boolean;
}

export interface ArchitectureGraph {
  systemName: string;
  complianceLevel: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  rawSourceLines: number;
  astNodesCount: number;
}

export interface ParserDiagnostic {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface AnalysisPerformanceTiming {
  inputProcessingMs: number;
  parsingMs: number;
  graphConstructionMs: number;
  githubSearchMs?: number;
  llmInferenceMs?: number;
  totalMs: number;
}

export interface GeneratedDocumentation {
  overview: string;
  detectedStyle: string;
  modules: {
    name: string;
    description: string;
    files: string[];
    role: string;
  }[];
  dependencies: {
    from: string;
    to: string;
    nature: string;
  }[];
  entryPoints: string[];
  keySymbols: {
    name: string;
    type: string;
    location: string;
    purpose: string;
  }[];
  dataFlow: string[];
  externalIntegrations: string[];
  risksAndRecommendations: {
    type: 'risk' | 'recommendation';
    title: string;
    detail: string;
  }[];
}

export interface GitHubSimilarRepo {
  id: number;
  name: string;
  fullName: string;
  description: string;
  htmlUrl: string;
  language: string;
  topics: string[];
  stars: number;
  forks: number;
  updatedAt: string;
  similarityScore: number; // 0 to 100
  scoreBreakdown: {
    technologyMatch: number; // 0 - 30
    languageMatch: number;   // 0 - 25
    topicKeywordMatch: number; // 0 - 25
    architecturalMatch: number; // 0 - 20
  };
  matchRationale: string;
}

export interface AnalysisResult {
  systemName: string;
  complianceLevel: string;
  language: string;
  parserName: string;
  parserStatus: 'SUCCESS' | 'WARNING' | 'FAILED';
  filesDiscovered: number;
  filesParsed: number;
  totalLines: number;
  totalStatements: number;
  totalSymbols: number;
  totalImports: number;
  graph: ArchitectureGraph;
  fileSummaries: FileAstSummary[];
  diagnostics: ParserDiagnostic[];
  timings: AnalysisPerformanceTiming;
  documentation: GeneratedDocumentation;
  rawSource?: string;
}
