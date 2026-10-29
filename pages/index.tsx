import React, { useState } from 'react';
import {
  CodeInputPane,
} from '@/components/CodeInputPane';
import {
  ArchitectureCanvas,
} from '@/components/ArchitectureCanvas';
import {
  SidebarMetadata,
} from '@/components/SidebarMetadata';
import { ArchitectureGraph, ArchitectureNode } from '@/types/architecture';
import {
  ShieldCheck,
  Activity,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  GitPullRequest,
  CheckCircle2,
  Workflow,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

const INITIAL_GRAPH: ArchitectureGraph = {
  systemName: 'ENTERPRISE ROUTING CORE',
  complianceLevel: 'SOC2-TYPE-II // ISO-27001',
  rawSourceLines: 46,
  astNodesCount: 128,
  nodes: [
    {
      id: 'node-gateway',
      hexId: '0x8A10',
      label: 'Gateway API Router',
      category: 'gateway',
      technology: 'Express / Envoy Ingress',
      status: 'HEALTHY',
      fileOrigin: 'src/api/gateway.ts',
      x: 18,
      y: 48,
      metrics: {
        latency: '2.4ms',
        throughput: '14.2k req/s',
        securityZone: 'DMZ Public Tier',
        complexity: 'O(1) Hash Map Routing',
      },
      summary:
        'Ingress gateway dispatching inbound HTTP/2 requests with TLS 1.3 termination, rate-limiting enforcement, and distributed trace header propagation.',
      callChain: [
        'gatewayRouter.use("/v1/system", rateLimiter)',
        'gatewayRouter.post("/telemetry/dispatch", authenticateJWT)',
        'dispatchController.routeExecution()',
      ],
      dependencies: {
        upstream: ['Client Mobile/Web Clients', 'Edge CDN Cloudflare'],
        downstream: ['node-auth', 'node-cache', 'node-db', 'node-queue'],
      },
      dataContracts: ['POST /v1/system/telemetry/dispatch', 'Header: x-request-id', 'Bearer JWT'],
    },
    {
      id: 'node-auth',
      hexId: '0x2B4F',
      label: 'Auth & Session Middleware',
      category: 'middleware',
      technology: 'RS256 JWT / Keystore',
      status: 'HEALTHY',
      fileOrigin: 'src/middleware/security.ts',
      x: 48,
      y: 20,
      metrics: {
        latency: '0.8ms',
        throughput: '22.0k val/s',
        securityZone: 'Zero-Trust Perimeter',
        complexity: 'Asymmetric Cryptographic Verification',
      },
      summary:
        'Intercepts every incoming request to validate digital signatures against the enterprise public keystore, enforcing tenant role isolation and scope claims.',
      callChain: [
        'authenticateJWT(req, res, next)',
        'verifyRS256Signature(token)',
        'attachClaimsToRequestContext()',
      ],
      dependencies: {
        upstream: ['node-gateway'],
        downstream: ['node-cache'],
      },
      dataContracts: ['Authorization: Bearer <jwt>', 'Claims: { uid, tenant_id, role }'],
    },
    {
      id: 'node-cache',
      hexId: '0x3D72',
      label: 'Redis Cluster Edge Pool',
      category: 'cache',
      technology: 'Redis 7.2 In-Memory Cluster',
      status: 'SYNCED',
      fileOrigin: 'src/infrastructure/redis.ts',
      x: 48,
      y: 76,
      metrics: {
        latency: '0.3ms',
        throughput: '45.0k ops/s',
        securityZone: 'Internal VPC Tier-A',
        complexity: 'In-Memory Sub-Millisecond Hash',
      },
      summary:
        'Distributed memory pool storing active user sessions, token revocations, and short-lived sliding window rate-limiter counters.',
      callChain: [
        'redis.get("session:" + userId)',
        'redis.expire(key, 3600)',
        'redisClusterPool.connectionKeepAlive()',
      ],
      dependencies: {
        upstream: ['node-gateway', 'node-auth'],
        downstream: [],
      },
      dataContracts: ['Key: session:{userId}', 'TTL: 3600s', 'Protocol: RESP3'],
    },
    {
      id: 'node-db',
      hexId: '0x9E88',
      label: 'PostgreSQL Analytics Ledger',
      category: 'database',
      technology: 'PostgreSQL 16 Enterprise',
      status: 'HEALTHY',
      fileOrigin: 'src/infrastructure/postgres.ts',
      x: 82,
      y: 30,
      metrics: {
        latency: '4.8ms',
        throughput: '6.8k writes/s',
        securityZone: 'Encrypted at Rest (AES-256)',
        complexity: 'ACID Transactional B-Tree Index',
      },
      summary:
        'Primary relational persistence store holding immutable telemetry ledger entries, partitioned by tenant identifier with continuous streaming replication.',
      callChain: [
        'analyticsDb.insertRecord({ userId, payload, traceId })',
        'pgPool.query("INSERT INTO telemetry_ledger...")',
        'walStreamer.emitHeartbeat()',
      ],
      dependencies: {
        upstream: ['node-gateway'],
        downstream: ['node-queue'],
      },
      dataContracts: ['Table: telemetry_ledger', 'Foreign Key: users(id)', 'Partition: monthly'],
    },
    {
      id: 'node-queue',
      hexId: '0xF10C',
      label: 'Kafka Event Dispatch Bus',
      category: 'queue',
      technology: 'Apache Kafka 3.6 Event Stream',
      status: 'HEALTHY',
      fileOrigin: 'src/infrastructure/kafka.ts',
      x: 82,
      y: 72,
      metrics: {
        latency: '1.9ms',
        throughput: '85.0k msgs/s',
        securityZone: 'Internal Streaming Mesh',
        complexity: 'Log-Appended Distributed Partitioning',
      },
      summary:
        'High-throughput message pipeline broadcasting asynchronously committed state mutations to downstream analytical pipelines, search indexes, and microservices.',
      callChain: [
        'eventBus.publish({ topic, key, value })',
        'kafkaProducer.sendBatch()',
        'consumerWorkerPool.ack()',
      ],
      dependencies: {
        upstream: ['node-gateway', 'node-db'],
        downstream: ['Downstream ML Ingestion', 'Elasticsearch Syncer'],
      },
      dataContracts: ['Topic: events.user.action', 'Format: Avro / JSON Schema v1', 'Acks: all'],
    },
  ],
  edges: [
    {
      id: 'edge-gw-auth',
      source: 'node-gateway',
      target: 'node-auth',
      protocol: 'Internal Loop / Direct Call',
      flowLabel: 'Verify Bearer Token',
      active: true,
    },
    {
      id: 'edge-gw-cache',
      source: 'node-gateway',
      target: 'node-cache',
      protocol: 'TCP / RESP3 Protocol',
      flowLabel: 'Session Cache Lookup',
      active: true,
    },
    {
      id: 'edge-auth-cache',
      source: 'node-auth',
      target: 'node-cache',
      protocol: 'Internal Socket',
      flowLabel: 'Check Token Revocation',
      active: false,
    },
    {
      id: 'edge-gw-db',
      source: 'node-gateway',
      target: 'node-db',
      protocol: 'PostgreSQL Wire / TLS',
      flowLabel: 'INSERT Transaction',
      active: true,
    },
    {
      id: 'edge-gw-queue',
      source: 'node-gateway',
      target: 'node-queue',
      protocol: 'Kafka Binary TCP Stream',
      flowLabel: 'Produce Event payload',
      active: true,
    },
    {
      id: 'edge-db-queue',
      source: 'node-db',
      target: 'node-queue',
      protocol: 'CDC / WAL Debezium',
      flowLabel: 'Change Data Capture Stream',
      active: false,
    },
  ],
};

export default function HomePage() {
  const [graph, setGraph] = useState<ArchitectureGraph>(INITIAL_GRAPH);
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(INITIAL_GRAPH.nodes[0]);
  const [isCompiling, setIsCompiling] = useState<boolean>(false);
  const [activeNav, setActiveNav] = useState<string>('GRAPH');

  const handleCompileGraph = (newGraph: ArchitectureGraph) => {
    setIsCompiling(true);
    setTimeout(() => {
      setGraph(newGraph);
      setSelectedNode(newGraph.nodes[0] || null);
      setIsCompiling(false);
    }, 450);
  };

  const handleNodeClick = (node: ArchitectureNode) => {
    setSelectedNode(node);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#dfb2b2] text-[#111111] overflow-x-hidden relative">
      {/* Avant-Garde Rotated Viewport Label Framing Outer Edge */}
      <div className="hidden xl:flex fixed right-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none select-none">
        <div className="vertical-text font-mono text-[9px] tracking-[0.35em] text-[#111111]/60 uppercase border-r border-[#111111]/30 pr-1.5">
          ENTERPRISE ARCHITECTURE // AST SYNTHESIS CORE // REVISION 2026.4
        </div>
      </div>

      {/* Top Minimal Editorial Navigation Bar */}
      <header className="border-b border-[#111111] bg-[#dfb2b2] px-6 py-3 flex items-center justify-between font-mono text-[11px] tracking-widest uppercase select-none z-20">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 font-bold tracking-tighter text-sm">
            <span className="w-2.5 h-2.5 bg-[#111111]" />
            <span className="editorial-letter-spacing font-sans font-black">SYNAPSE</span>
            <span className="text-[10px] text-[#111111]/60 font-mono tracking-widest">
              [V1.0.0-PROD]
            </span>
          </div>

          <div className="hidden md:flex items-center space-x-1 border-l border-[#111111] pl-6">
            {(['CORE.ENGINE', 'PARSER', 'GRAPH', 'DOCUMENTATION'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setActiveNav(item)}
                className={`px-3 py-1 text-[10px] tracking-wider transition-all duration-200 border ${
                  activeNav === item
                    ? 'border-[#111111] bg-[#111111] text-[#dfb2b2] font-bold'
                    : 'border-transparent text-[#111111] hover:border-[#111111]/30 hover:tracking-widest'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-[10px] text-[#111111]/80">
            <ShieldCheck className="w-3.5 h-3.5 text-[#111111]" />
            <span>GITHUB ENTERPRISE PUSH COMPLIANT</span>
          </div>
          <span className="hidden sm:inline text-[#111111]/30">|</span>
          <span className="text-[10px] font-bold px-2 py-0.5 border border-[#111111] bg-[#111111]/5">
            US-EAST-1 // SECURED
          </span>
        </div>
      </header>

      {/* Massive Editorial Asymmetric Title Banner */}
      <section className="border-b border-[#111111] px-6 py-5 bg-[#dfb2b2] relative overflow-hidden select-none">
        <div className="max-w-7xl flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 font-mono text-[9px] tracking-[0.25em] text-[#111111]/70 uppercase">
              <span>SYSTEM SPECIFICATION</span>
              <span>//</span>
              <span>DYNAMIC DATA FLOW TOPOGRAPHY</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black font-sans uppercase tracking-tight text-[#111111] leading-none">
              CODE-TO-ARCHITECTURE <span className="font-light italic tracking-normal">VISUALIZER</span>
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 font-mono text-[10px] tracking-widest text-[#111111]/80">
            <div className="border border-[#111111] p-2 bg-[#dfb2b2]/40">
              <span className="block text-[8px] text-[#111111]/60">ACTIVE MODEL</span>
              <span className="font-bold">TYPESCRIPT AST + LLM</span>
            </div>
            <div className="border border-[#111111] p-2 bg-[#dfb2b2]/40">
              <span className="block text-[8px] text-[#111111]/60">SECURITY LEVEL</span>
              <span className="font-bold">ZERO-TRUST AUDITED</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main 3-Column Horizon: Input Pane | Graphic Visualizer Centerpiece | Sidebar Metadata Dock */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-230px)]">
        {/* Left Column: Code / URL Input Stream */}
        <section className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col">
          <CodeInputPane onCompile={handleCompileGraph} isCompiling={isCompiling} />
        </section>

        {/* Centerpiece Column: Interactive Graphic Architecture Canvas */}
        <section className="flex-1 min-w-0 flex flex-col min-h-[500px] lg:min-h-0">
          <ArchitectureCanvas
            graph={graph}
            selectedNode={selectedNode}
            onNodeClick={handleNodeClick}
          />
        </section>

        {/* Right Column: Exploded Metadata & Live Plain-English Explainer Dock */}
        <section className="w-full lg:w-[390px] xl:w-[440px] flex-shrink-0 flex flex-col">
          <SidebarMetadata selectedNode={selectedNode} />
        </section>
      </main>

      {/* Functional Enterprise Footer Anchoring Metrics & Confirmation Hooks */}
      <footer className="border-t border-[#111111] bg-[#dfb2b2] px-6 py-2.5 flex flex-wrap items-center justify-between font-mono text-[9px] tracking-widest text-[#111111]/80 uppercase select-none z-20">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 font-bold text-[#111111]">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse-subtle" />
            <span>STATUS: OPERATIONAL</span>
          </div>
          <span>//</span>
          <span>AST MAPPER V1.0.0</span>
          <span>//</span>
          <span className="hidden sm:inline">PARSER RUNTIME: V8 TURBOFAN</span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-[#111111]" />
            <span className="font-bold">GITHUB COMPLIANCE SECURED</span>
          </div>
          <span>//</span>
          <span className="text-[#111111]/60">NO SECRETS DETECTED</span>
          <span>//</span>
          <span>SHA-256: 0x9DF84A</span>
        </div>
      </footer>
    </div>
  );
}
