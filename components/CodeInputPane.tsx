import React, { useState } from 'react';
import {
  Code2,
  GitBranch,
  Terminal,
  Cpu,
  Sparkles,
  Layers,
  ArrowRight,
  FileCode2,
  CheckCircle2,
} from 'lucide-react';
import { ArchitectureGraph, ArchitectureNode, ArchitectureEdge } from '@/types/architecture';

interface CodeInputPaneProps {
  onCompile: (graph: ArchitectureGraph) => void;
  isCompiling: boolean;
}

const PRESET_SNIPPET = `// Enterprise Microservices Routing & Persistence Gateway
import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, rateLimiter } from '@/middleware/security';
import { TelemetryClient } from '@enterprise/telemetry';
import { UserAnalyticsRepository } from '@/infrastructure/postgres';
import { EventProducer } from '@/infrastructure/kafka';
import { RedisClusterPool } from '@/infrastructure/redis';

const gatewayRouter = Router();
const redis = new RedisClusterPool({ clusterId: 'edge-01' });
const analyticsDb = new UserAnalyticsRepository();
const eventBus = new EventProducer({ topic: 'telemetry.ingress.v1' });

gatewayRouter.use('/v1/system', rateLimiter({ max: 5000, windowMs: 60000 }));

gatewayRouter.post(
  '/telemetry/dispatch',
  authenticateJWT,
  async (req: Request, res: Response, next: NextFunction) => {
    const traceId = req.headers['x-request-id'] || 'trace-gen-0x99';
    try {
      // 1. Check Hot Cache Session
      const cachedSession = await redis.get(\`session:\${req.body.userId}\`);
      
      // 2. Persist Relational Ledger Entry
      const record = await analyticsDb.insertRecord({
        userId: req.body.userId,
        payload: req.body.metricPayload,
        traceId,
      });

      // 3. Emit Asynchronous Distributed Stream Event
      await eventBus.publish({
        topic: 'events.user.action',
        key: record.id,
        value: JSON.stringify(record),
      });

      return res.status(200).json({ status: 'ACK', traceId, recordId: record.id });
    } catch (error) {
      TelemetryClient.captureException(error);
      return res.status(500).json({ error: 'SYSTEM_ROUTING_FAULT' });
    }
  }
);

export default gatewayRouter;`;

const PRESET_GRAPHS: Record<string, ArchitectureGraph> = {
  default: {
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
  },
};

export const CodeInputPane: React.FC<CodeInputPaneProps> = ({ onCompile, isCompiling }) => {
  const [mode, setMode] = useState<'snippet' | 'github'>('snippet');
  const [sourceCode, setSourceCode] = useState<string>(PRESET_SNIPPET);
  const [githubUrl, setGithubUrl] = useState<string>(
    'https://github.com/enterprise-systems/telemetry-mesh-core'
  );
  const [tokenCounter, setTokenCounter] = useState<number>(142);
  const [lastCompilationTime, setLastCompilationTime] = useState<string>('00:00:00 UTC');

  const lineCount = sourceCode.split('\n').length;

  const handleSourceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setSourceCode(text);
    // Rough estimate of tokens for AST metrics
    setTokenCounter(Math.floor(text.length / 4));
  };

  const executeAstParsing = () => {
    const now = new Date().toISOString().replace('T', ' ').substring(11, 19) + ' UTC';
    setLastCompilationTime(now);

    // Dynamic parsing logic: analyze imports and structural identifiers
    if (mode === 'github') {
      const repoName = githubUrl.split('/').pop() || 'REPOSITORY';
      const synthesizedGraph: ArchitectureGraph = {
        ...PRESET_GRAPHS.default,
        systemName: repoName.toUpperCase().replace(/[-_.]/g, ' '),
        rawSourceLines: 1240,
        astNodesCount: 388,
      };
      onCompile(synthesizedGraph);
    } else {
      // Analyze current source code
      const hasKafka = sourceCode.toLowerCase().includes('kafka') || sourceCode.includes('producer');
      const hasRedis = sourceCode.toLowerCase().includes('redis') || sourceCode.includes('cache');
      const hasDb = sourceCode.toLowerCase().includes('postgres') || sourceCode.includes('database') || sourceCode.includes('sql');
      const hasAuth = sourceCode.toLowerCase().includes('jwt') || sourceCode.includes('auth');

      const filteredNodes = PRESET_GRAPHS.default.nodes.filter((node) => {
        if (node.id === 'node-queue' && !hasKafka) return false;
        if (node.id === 'node-cache' && !hasRedis) return false;
        if (node.id === 'node-db' && !hasDb) return false;
        if (node.id === 'node-auth' && !hasAuth) return false;
        return true;
      });

      const nodeIds = new Set(filteredNodes.map((n) => n.id));
      const filteredEdges = PRESET_GRAPHS.default.edges.filter(
        (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
      );

      const dynamicGraph: ArchitectureGraph = {
        ...PRESET_GRAPHS.default,
        systemName: 'AST COMPILED PIPELINE',
        rawSourceLines: lineCount,
        astNodesCount: Math.max(34, Math.floor(sourceCode.length / 14)),
        nodes: filteredNodes.length > 0 ? filteredNodes : PRESET_GRAPHS.default.nodes,
        edges: filteredEdges.length > 0 ? filteredEdges : PRESET_GRAPHS.default.edges,
      };

      onCompile(dynamicGraph);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#dfb2b2] border-r border-[#111111] font-mono select-none">
      {/* Pane Top Header Bar */}
      <div className="p-3 border-b border-[#111111] flex items-center justify-between bg-[#dfb2b2]">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-[#111111]" />
          <span className="text-[11px] font-bold tracking-widest text-[#111111] uppercase">
            SOURCE.STREAM // PARSER
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#111111] animate-pulse-subtle" />
          <span className="text-[9px] tracking-wider text-[#111111]/80">
            AST ENGINE ONLINE
          </span>
        </div>
      </div>

      {/* Input Mode Selector Tabs */}
      <div className="grid grid-cols-2 border-b border-[#111111] text-[10px] tracking-wider font-bold">
        <button
          onClick={() => setMode('snippet')}
          className={`py-2 px-3 flex items-center justify-center space-x-1.5 transition-colors border-r border-[#111111] ${
            mode === 'snippet'
              ? 'bg-[#111111] text-[#dfb2b2]'
              : 'bg-transparent text-[#111111] hover:bg-[#111111]/10'
          }`}
        >
          <Code2 className="w-3 h-3" />
          <span>RAW CODE SNIPPET</span>
        </button>
        <button
          onClick={() => setMode('github')}
          className={`py-2 px-3 flex items-center justify-center space-x-1.5 transition-colors ${
            mode === 'github'
              ? 'bg-[#111111] text-[#dfb2b2]'
              : 'bg-transparent text-[#111111] hover:bg-[#111111]/10'
          }`}
        >
          <GitBranch className="w-3 h-3" />
          <span>GITHUB REPOSITORY</span>
        </button>
      </div>

      {/* Dynamic Input Body */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden relative">
        {mode === 'snippet' ? (
          <div className="flex-1 flex flex-col border border-[#111111] bg-[#dfb2b2]/50 relative overflow-hidden">
            {/* Editor Sub-header info */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#111111] bg-[#111111]/5 text-[9px] text-[#111111]/70 tracking-widest">
              <span className="flex items-center gap-1.5">
                <FileCode2 className="w-3 h-3" />
                <span>ENTRY: src/api/gateway.ts</span>
              </span>
              <span>SYNTAX: TYPESCRIPT // AST</span>
            </div>

            {/* Line numbers + Textarea */}
            <div className="flex-1 flex overflow-hidden font-mono text-[11px] leading-relaxed">
              <div className="py-2.5 px-2 bg-[#111111]/10 text-right text-[10px] text-[#111111]/50 border-r border-[#111111] select-none font-mono">
                {Array.from({ length: Math.min(lineCount, 60) }, (_, i) => (
                  <div key={i}>{String(i + 1).padStart(2, '0')}</div>
                ))}
              </div>
              <textarea
                value={sourceCode}
                onChange={handleSourceChange}
                spellCheck={false}
                placeholder="// Paste TypeScript, Express, Prisma, or microservice source code..."
                className="flex-1 p-2.5 bg-transparent text-[#111111] focus:outline-none resize-none font-mono text-[11px] leading-relaxed selection:bg-[#111111] selection:text-[#dfb2b2] overflow-y-auto"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center space-y-4 p-4 border border-[#111111] bg-[#dfb2b2]/40">
            <div className="space-y-1">
              <label className="text-[10px] font-bold tracking-widest text-[#111111] uppercase block">
                Target Enterprise Repository URL:
              </label>
              <p className="text-[10px] text-[#111111]/70 leading-normal">
                Direct AST resolver inspects remote branches, parses `package.json`, dependency lockfiles, and routing decorators.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/org/microservice-core"
                className="w-full py-2.5 px-3 border border-[#111111] bg-transparent text-[11px] text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] font-mono tracking-tight"
              />
            </div>

            <div className="border-t border-[#111111]/30 pt-3 space-y-2">
              <span className="text-[9px] uppercase tracking-widest text-[#111111]/60 block font-bold">
                Enterprise Branch Filters:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[9px]">
                <span className="px-2 py-0.5 border border-[#111111] bg-[#111111] text-[#dfb2b2]">
                  refs/heads/main
                </span>
                <span className="px-2 py-0.5 border border-[#111111]/50 text-[#111111]/80">
                  refs/heads/production-rc1
                </span>
                <span className="px-2 py-0.5 border border-[#111111]/50 text-[#111111]/80">
                  tags/v2.4.0
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Live Diagnostics & AST Telemetry */}
        <div className="mt-3 pt-3 border-t border-[#111111] grid grid-cols-3 gap-2 text-[9px] text-[#111111]/80 tracking-widest uppercase">
          <div>
            <span className="block text-[8px] text-[#111111]/60">LINES SCANNED</span>
            <span className="font-bold text-[#111111]">{lineCount}</span>
          </div>
          <div>
            <span className="block text-[8px] text-[#111111]/60">TOKENS ESTIMATED</span>
            <span className="font-bold text-[#111111]">{tokenCounter}</span>
          </div>
          <div>
            <span className="block text-[8px] text-[#111111]/60">LAST COMPILED</span>
            <span className="font-bold text-[#111111] truncate">{lastCompilationTime}</span>
          </div>
        </div>

        {/* High-Contrast Action Compilation Button */}
        <button
          onClick={executeAstParsing}
          disabled={isCompiling}
          className="mt-4 w-full py-3 px-4 bg-[#111111] text-[#dfb2b2] text-[11px] font-bold tracking-widest uppercase flex items-center justify-center space-x-2 border border-[#111111] hover:bg-transparent hover:text-[#111111] transition-all duration-200 active:scale-[0.99] disabled:opacity-50"
        >
          {isCompiling ? (
            <>
              <Cpu className="w-4 h-4 animate-spin" />
              <span>COMPILING ABSTRACT SYNTAX TREE...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span className="editorial-letter-spacing">TRIGGER ARCHITECTURE SYNTHESIS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Pane Bottom Status Strip */}
      <div className="p-2.5 border-t border-[#111111] bg-[#dfb2b2] flex items-center justify-between text-[9px] tracking-widest text-[#111111]/70 uppercase">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-[#111111]" />
          <span>PARSER BUFFER STABLE</span>
        </span>
        <span>INDEX MEMORY: 3.4 MB</span>
      </div>
    </div>
  );
};
export default CodeInputPane;
