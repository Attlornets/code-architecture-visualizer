export type NodeCategory =
  | 'gateway'
  | 'middleware'
  | 'service'
  | 'database'
  | 'queue'
  | 'cache';

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
}

export interface ArchitectureEdge {
  id: string;
  source: string;
  target: string;
  protocol: string;
  flowLabel: string;
  active: boolean;
}

export interface ArchitectureGraph {
  systemName: string;
  complianceLevel: string;
  nodes: ArchitectureNode[];
  edges: ArchitectureEdge[];
  rawSourceLines: number;
  astNodesCount: number;
}
