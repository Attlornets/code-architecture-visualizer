export type NodeCategory =
  | 'gateway'
  | 'middleware'
  | 'service'
  | 'database'
  | 'queue'
  | 'cache'
  | 'module'
  | 'client'
  | 'subsystem'
  | 'file'
  | 'symbol';

export type NodeStatus = 'HEALTHY' | 'SYNCED' | 'WARNING' | 'STANDBY';

export type HierarchyLevel = 'SYSTEM' | 'COMPONENT' | 'FILE' | 'SYMBOL' | 'EXECUTION';

export type UmlDiagramMode =
  | 'SYSTEM_TOPOLOGY'
  | 'COMPONENT_DIAGRAM'
  | 'FILE_DEPENDENCY'
  | 'CALL_GRAPH'
  | 'DATA_FLOW'
  | 'SEQUENCE_DIAGRAM'
  | 'CLASS_DIAGRAM'
  | 'PACKAGE_DIAGRAM';

export type ArchitectureTemplate =
  | 'MICROSERVICES'
  | 'LAYERED'
  | 'CLEAN_ARCH'
  | 'HEXAGONAL'
  | 'MVC'
  | 'EVENT_DRIVEN'
  | 'DATA_PIPELINE'
  | 'CLIENT_SERVER'
  | 'UML_COMPONENT'
  | 'UML_SEQUENCE';

export type ChangeabilityClass =
  | 'APPLICATION_OWNED'
  | 'CONFIG_DRIVEN'
  | 'EXTERNAL_DEP'
  | 'GENERATED'
  | 'CONTRACT_SENSITIVE'
  | 'INFRASTRUCTURE'
  | 'UNKNOWN';

export type RelationshipConfidence =
  | 'OBSERVED_AST'
  | 'STATIC_INFERRED'
  | 'RUNTIME_TRACE_REQUIRED'
  | 'UNRESOLVED';

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
  parameters?: string[];
  returnType?: string;
  calls?: string[];
}

export interface ClassInfo {
  name: string;
  isInterface: boolean;
  superClass?: string;
  interfaces?: string[];
  methods: { name: string; line: number; visibility: 'public' | 'private' | 'protected'; parameters: string[]; returnType: string }[];
  properties: { name: string; type: string; visibility: 'public' | 'private' | 'protected' }[];
}

export interface FileAstSummary {
  filePath: string;
  language: string;
  lineCount: number;
  statementCount: number;
  symbols: CodeSymbol[];
  classes?: ClassInfo[];
  imports: {
    source: string;
    specifiers: string[];
    isDefault: boolean;
    line: number;
  }[];
  endpoints: string[];
  packageDependencies?: Record<string, string>;
  exports: string[];
  parseErrors: string[];
  frameworkAssociation?: string;
  frameworkVersion?: string;
}

export interface ExecutionStep {
  stepNumber: number;
  nodeId: string;
  nodeLabel: string;
  symbolName: string;
  filePath: string;
  line: number;
  inputDescription: string;
  operationDescription: string;
  outputDescription: string;
  confidence: RelationshipConfidence;
}

export interface SequenceMessage {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromLabel: string;
  toLabel: string;
  label: string;
  signature: string;
  stepNumber: number;
  isAsync: boolean;
  sourceLine?: number;
}

export interface ImpactAnalysisResult {
  targetId: string;
  targetLabel: string;
  directDependents: string[];
  indirectDependents: string[];
  affectedEndpoints: string[];
  contractSensitiveCalls: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rationale: string;
  impactPathNodeIds: string[];
}

export interface ArchitectureNode {
  id: string;
  hexId: string;
  label: string;
  category: NodeCategory;
  technology: string;
  status: NodeStatus;
  fileOrigin: string;
  sourceLine?: number;
  sourceCharacter?: number;
  x: number; // percentage in coordinate canvas (0 - 100)
  y: number; // percentage in coordinate canvas (0 - 100)
  metrics: NodeMetrics;
  summary: string;
  callChain: string[];
  dependencies: NodeDependencies;
  dataContracts: string[];
  // SYNAPSE 2.0 Hierarchical & Changeability Properties
  level: HierarchyLevel;
  parentSubsystemId?: string;
  parentNodeId?: string;
  subsystem?: string;
  files?: string[];
  symbols?: CodeSymbol[];
  classes?: ClassInfo[];
  endpoints?: string[];
  configKeys?: string[];
  changeability: ChangeabilityClass;
  changeabilityEvidence: string;
  isSubsystemParent?: boolean;
  collapsed?: boolean;
  inferred?: boolean;
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  protocol: string;
  flowLabel: string;
  active: boolean;
  confidence: RelationshipConfidence;
  relationshipType: 'import' | 'call' | 'data_flow' | 'implements' | 'extends' | 'event_emit' | 'subsystem_link';
  callSignature?: string;
  payloadType?: string;
  sourceLine?: number;
  isInferred?: boolean;
}

export interface ArchitectureGraph {
  systemName: string;
  complianceLevel: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  rawSourceLines: number;
  astNodesCount: number;
  activeLevel?: HierarchyLevel;
  activeDiagramMode?: UmlDiagramMode;
}

export interface ParserDiagnostic {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

export interface AnalysisPerformanceTiming {
  fileDiscoveryMs: number;
  inputProcessingMs: number;
  parsingMs: number;
  graphConstructionMs: number;
  documentationMs: number;
  githubSearchMs?: number;
  llmInferenceMs?: number;
  totalMs: number;
}

export interface FrameworkVersionInfo {
  name: string;
  version: string;
  source: 'package.json' | 'manifest' | 'ast_heuristic' | 'unknown';
  matchedFiles: string[];
}

export interface GitCommitInfo {
  hash: string;
  shortHash: string;
  author: string;
  authorEmail?: string;
  date?: string;
  message: string;
  changedFiles: string[];
  aiSummary?: string;
  architecturalImpact?: string;
}

export interface SetupInstructions {
  prerequisites: string[];
  cloneCommand: string;
  directoryCommand: string;
  installCommand: string;
  envSetupCommand: string;
  serviceConfiguration: string[];
  devStartCommand: string;
  buildCommand: string;
  testCommand: string;
  lintCommand: string;
  commonTroubleshooting: { issue: string; resolution: string }[];
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
  gitHistory: GitCommitInfo[];
  gitHistorySource?: string;
  gitHistoryError?: string;
  frameworkVersions: FrameworkVersionInfo[];
  setupInstructions: SetupInstructions;
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
  allLevelNodes: {
    system: ArchitectureNode[];
    component: ArchitectureNode[];
    file: ArchitectureNode[];
    symbol: ArchitectureNode[];
    execution: ArchitectureNode[];
  };
  allLevelEdges: {
    system: ArchitectureEdge[];
    component: ArchitectureEdge[];
    file: ArchitectureEdge[];
    symbol: ArchitectureEdge[];
    execution: ArchitectureEdge[];
  };
  fileSummaries: FileAstSummary[];
  diagnostics: ParserDiagnostic[];
  timings: AnalysisPerformanceTiming;
  documentation: GeneratedDocumentation;
  executionTraces: ExecutionStep[];
  sequenceMessages: SequenceMessage[];
  classes: ClassInfo[];
  rawSource?: string;
  rawFiles?: { path: string; content: string }[];
}
