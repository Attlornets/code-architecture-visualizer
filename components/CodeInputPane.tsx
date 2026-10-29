import React, { useState } from 'react';
import {
  Code2,
  GitBranch,
  Terminal,
  Cpu,
  Sparkles,
  ArrowRight,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { AnalysisResult } from '@/types/architecture';

interface CodeInputPaneProps {
  onAnalyze: (sourceCode: string, mode: 'snippet' | 'github', githubUrl?: string) => Promise<void>;
  isCompiling: boolean;
  currentResult: AnalysisResult | null;
  errorMessage?: string | null;
}

export const PRESET_CODE_SNIPPETS: Record<string, { label: string; code: string; language: string }> = {
  expressGateway: {
    label: 'Express API Gateway + Postgres + Redis',
    language: 'TypeScript',
    code: `// Enterprise Microservices Routing & Persistence Gateway
import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, rateLimiter } from './security';
import { UserAnalyticsRepository } from './postgres';
import { EventProducer } from './kafka';
import { RedisClusterPool } from './redis';

export const gatewayRouter = Router();
const redis = new RedisClusterPool({ clusterId: 'edge-01' });
const analyticsDb = new UserAnalyticsRepository();
const eventBus = new EventProducer({ topic: 'telemetry.ingress.v1' });

gatewayRouter.use('/v1/system', rateLimiter({ max: 5000, windowMs: 60000 }));

export async function dispatchTelemetryHandler(req: Request, res: Response, next: NextFunction) {
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
    return res.status(500).json({ error: 'SYSTEM_ROUTING_FAULT' });
  }
}

gatewayRouter.post('/telemetry/dispatch', authenticateJWT, dispatchTelemetryHandler);
export default gatewayRouter;`,
  },
  microserviceAuth: {
    label: 'Zero-Trust JWT Auth Middleware + Keystore',
    language: 'TypeScript',
    code: `// RS256 Cryptographic Authentication & Token Validation
import { Request, Response, NextFunction } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken';
import { RedisClient } from './redis';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  roles: string[];
}

export class SecurityGuardService {
  private cache: RedisClient;

  constructor() {
    this.cache = new RedisClient();
  }

  public async verifyToken(token: string): Promise<AuthenticatedUser | null> {
    const isRevoked = await this.cache.get(\`revoked:\${token}\`);
    if (isRevoked) {
      return null;
    }
    const decoded = verify(token, process.env.PUBLIC_KEY || 'secret') as JwtPayload;
    return {
      id: decoded.sub as string,
      tenantId: decoded.tenantId as string,
      roles: decoded.roles || [],
    };
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const guard = new SecurityGuardService();
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED' });

  const user = await guard.verifyToken(token);
  if (!user) return res.status(403).json({ error: 'INVALID_TOKEN' });

  req.body.user = user;
  return next();
}`,
  },
  fastifyPipeline: {
    label: 'Fastify Ingestion Engine + Queue Worker',
    language: 'TypeScript',
    code: `// Fastify Ingress Pipeline with BullMQ Job Queue
import Fastify, { FastifyInstance } from 'fastify';
import { Queue } from 'bullmq';

export interface IngestionPayload {
  eventId: string;
  deviceType: string;
  metrics: Record<string, number>;
}

export class IngestionServer {
  private app: FastifyInstance;
  private queue: Queue;

  constructor() {
    this.app = Fastify({ logger: true });
    this.queue = new Queue('ingestion-queue');
    this.setupRoutes();
  }

  private setupRoutes() {
    this.app.post('/events', async (request, reply) => {
      const data = request.body as IngestionPayload;
      const job = await this.queue.add('process-event', data);
      return reply.code(202).send({ queued: true, jobId: job.id });
    });
  }

  public async start(port: number = 8080) {
    await this.app.listen({ port });
  }
}`,
  },
};

export const CodeInputPane: React.FC<CodeInputPaneProps> = ({
  onAnalyze,
  isCompiling,
  currentResult,
  errorMessage,
}) => {
  const [mode, setMode] = useState<'snippet' | 'github'>('snippet');
  const [selectedPreset, setSelectedPreset] = useState<string>('expressGateway');
  const [sourceCode, setSourceCode] = useState<string>(PRESET_CODE_SNIPPETS.expressGateway.code);
  const [githubUrl, setGithubUrl] = useState<string>(
    'https://github.com/nestjs/nest'
  );

  const lineCount = sourceCode.split('\n').length;
  const tokenEstimate = Math.max(1, Math.floor(sourceCode.length / 4));

  const handlePresetSelect = (key: string) => {
    setSelectedPreset(key);
    if (PRESET_CODE_SNIPPETS[key]) {
      setSourceCode(PRESET_CODE_SNIPPETS[key].code);
    }
  };

  const handleTriggerAnalysis = async () => {
    if (mode === 'github') {
      await onAnalyze('', 'github', githubUrl);
    } else {
      await onAnalyze(sourceCode, 'snippet');
    }
  };

  const handleReset = () => {
    setSourceCode(PRESET_CODE_SNIPPETS.expressGateway.code);
    setSelectedPreset('expressGateway');
    setGithubUrl('https://github.com/nestjs/nest');
  };

  return (
    <div className="flex flex-col h-full bg-[#dfb2b2] border-r border-[#111111] font-mono select-none">
      {/* Pane Top Header Bar */}
      <div className="p-3 border-b border-[#111111] flex items-center justify-between bg-[#dfb2b2]">
        <div className="flex items-center space-x-2">
          <Terminal className="w-3.5 h-3.5 text-[#111111]" />
          <span className="text-[11px] font-bold tracking-widest text-[#111111] uppercase">
            SOURCE.STREAM // WORKSPACE
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="p-1 hover:bg-[#111111]/10 text-[#111111] border border-[#111111]/30 transition-colors"
            title="Reset to default preset"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <span className="w-2 h-2 rounded-full bg-[#111111] animate-pulse-subtle" />
          <span className="text-[9px] tracking-wider text-[#111111]/80">
            {isCompiling ? 'PARSING...' : 'READY'}
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

      {/* Preset Selector Dropdown / Bar */}
      {mode === 'snippet' && (
        <div className="border-b border-[#111111] p-2 bg-[#dfb2b2]/80 flex items-center justify-between text-[9px]">
          <span className="text-[#111111]/70 font-bold uppercase tracking-wider">LOAD PRESET:</span>
          <select
            value={selectedPreset}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="bg-transparent border border-[#111111] text-[#111111] px-1.5 py-0.5 text-[9px] font-mono tracking-tight focus:outline-none"
          >
            {Object.entries(PRESET_CODE_SNIPPETS).map(([k, v]) => (
              <option key={k} value={k} className="bg-[#dfb2b2] text-[#111111]">
                {v.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Dynamic Input Body */}
      <div className="flex-1 flex flex-col p-3 overflow-hidden relative">
        {errorMessage && (
          <div className="mb-2 p-2 border border-red-700 bg-red-100/60 text-red-900 text-[9px] font-mono flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 text-red-700 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
        )}

        {mode === 'snippet' ? (
          <div className="flex-1 flex flex-col border border-[#111111] bg-[#dfb2b2]/50 relative overflow-hidden">
            {/* Editor Sub-header info */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#111111] bg-[#111111]/5 text-[9px] text-[#111111]/70 tracking-widest">
              <span className="flex items-center gap-1.5">
                <FileCode2 className="w-3 h-3" />
                <span>ENTRY: src/api/gateway.ts</span>
              </span>
              <span>LANG: TYPESCRIPT // AST</span>
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
                onChange={(e) => setSourceCode(e.target.value)}
                spellCheck={false}
                placeholder="// Paste TypeScript, Express, Fastify, or microservice code..."
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
                Direct AST resolver inspects remote branches, parses `package.json`, dependency lockfiles, and routing decorators safely without code execution.
              </p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/nestjs/nest"
                className="w-full py-2.5 px-3 border border-[#111111] bg-transparent text-[11px] text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] font-mono tracking-tight"
              />
            </div>

            <div className="border-t border-[#111111]/30 pt-3 space-y-2">
              <span className="text-[9px] uppercase tracking-widest text-[#111111]/60 block font-bold">
                Example Public Repositories:
              </span>
              <div className="flex flex-wrap gap-1.5 text-[9px]">
                <button
                  onClick={() => setGithubUrl('https://github.com/nestjs/nest')}
                  className="px-2 py-0.5 border border-[#111111] hover:bg-[#111111] hover:text-[#dfb2b2] transition-colors"
                >
                  nestjs/nest
                </button>
                <button
                  onClick={() => setGithubUrl('https://github.com/fastify/fastify')}
                  className="px-2 py-0.5 border border-[#111111] hover:bg-[#111111] hover:text-[#dfb2b2] transition-colors"
                >
                  fastify/fastify
                </button>
                <button
                  onClick={() => setGithubUrl('https://github.com/trpc/trpc')}
                  className="px-2 py-0.5 border border-[#111111] hover:bg-[#111111] hover:text-[#dfb2b2] transition-colors"
                >
                  trpc/trpc
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Diagnostics & AST Telemetry */}
        <div className="mt-3 pt-3 border-t border-[#111111] grid grid-cols-3 gap-2 text-[9px] text-[#111111]/80 tracking-widest uppercase">
          <div>
            <span className="block text-[8px] text-[#111111]/60">LINES SCANNED</span>
            <span className="font-bold text-[#111111]">{currentResult ? currentResult.totalLines : lineCount}</span>
          </div>
          <div>
            <span className="block text-[8px] text-[#111111]/60">TOKENS / NODES</span>
            <span className="font-bold text-[#111111]">{currentResult ? currentResult.graph.astNodesCount : tokenEstimate}</span>
          </div>
          <div>
            <span className="block text-[8px] text-[#111111]/60">MEASURED LATENCY</span>
            <span className="font-bold text-[#111111] truncate">
              {currentResult ? `${currentResult.timings.totalMs}ms` : '0.0ms'}
            </span>
          </div>
        </div>

        {/* High-Contrast Action Compilation Button */}
        <button
          onClick={handleTriggerAnalysis}
          disabled={isCompiling}
          className="mt-3 w-full py-3 px-4 bg-[#111111] text-[#dfb2b2] text-[11px] font-bold tracking-widest uppercase flex items-center justify-center space-x-2 border border-[#111111] hover:bg-transparent hover:text-[#111111] transition-all duration-200 active:scale-[0.99] disabled:opacity-50"
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
        <span>STATUS: {currentResult ? currentResult.parserStatus : 'STANDBY'}</span>
      </div>
    </div>
  );
};
export default CodeInputPane;
