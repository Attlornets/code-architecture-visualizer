import ts from 'typescript';
import {
  FileAstSummary,
  CodeSymbol,
  ClassInfo,
  ParserDiagnostic,
  ArchitectureNode,
  ArchitectureEdge,
  ArchitectureGraph,
  GeneratedDocumentation,
  AnalysisResult,
  NodeCategory,
  ChangeabilityClass,
  ExecutionStep,
  SequenceMessage,
  FrameworkVersionInfo,
  SetupInstructions,
} from '@/types/architecture';

export interface SourceInputFile {
  path: string;
  content: string;
}

export const DEMO_MULTI_FILE_SUITE: SourceInputFile[] = [
  {
    path: 'package.json',
    content: `{
  "name": "enterprise-telemetry-mesh",
  "version": "2.4.0",
  "description": "High-throughput distributed telemetry, auth guard, and persistence pipeline",
  "scripts": {
    "dev": "tsx watch src/api/gateway.ts",
    "build": "tsc --project tsconfig.json",
    "start": "node dist/api/gateway.js",
    "test": "vitest run",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3",
    "ioredis": "^5.3.2",
    "kafkajs": "^2.2.4",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "vitest": "^1.0.4"
  }
}`,
  },
  {
    path: 'src/api/gateway.ts',
    content: `// Gateway Ingress Router & Dispatch Controller
import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT, rateLimiter } from '../middleware/security';
import { TelemetryDispatcherService } from '../services/telemetryService';
import { OrderProcessingService } from '../services/orderService';

export const gatewayRouter = Router();
const telemetryService = new TelemetryDispatcherService();
const orderService = new OrderProcessingService();

gatewayRouter.use('/v1/system', rateLimiter({ max: 5000, windowMs: 60000 }));

export async function handleTelemetryIngress(req: Request, res: Response, next: NextFunction) {
  const traceId = req.headers['x-request-id'] as string || 'trace-0x01';
  try {
    const dispatchResult = await telemetryService.dispatch(req.body, traceId);
    return res.status(200).json({ status: 'ACK', traceId, recordId: dispatchResult.recordId });
  } catch (error) {
    return res.status(500).json({ error: 'SYSTEM_ROUTING_FAULT' });
  }
}

export async function handleOrderCreation(req: Request, res: Response) {
  const order = await orderService.createOrder(req.body);
  return res.status(201).json(order);
}

gatewayRouter.post('/telemetry/dispatch', authenticateJWT, handleTelemetryIngress);
gatewayRouter.post('/orders', authenticateJWT, handleOrderCreation);

export default gatewayRouter;`,
  },
  {
    path: 'src/middleware/security.ts',
    content: `// RS256 Cryptographic Authentication & Token Validation
import { Request, Response, NextFunction } from 'express';
import { verify, JwtPayload } from 'jsonwebtoken';
import { RedisClusterPool } from '../infrastructure/redisPool';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  roles: string[];
}

export class SecurityGuardService {
  private cache: RedisClusterPool;

  constructor() {
    this.cache = new RedisClusterPool();
  }

  public async verifyToken(token: string): Promise<AuthenticatedUser | null> {
    const isRevoked = await this.cache.get(\`revoked:\${token}\`);
    if (isRevoked) {
      return null;
    }
    const decoded = verify(token, process.env.JWT_PUBLIC_KEY || 'secret-key') as JwtPayload;
    return {
      id: decoded.sub as string,
      tenantId: decoded.tenantId as string,
      roles: decoded.roles || [],
    };
  }
}

export function rateLimiter(options: { max: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction) => next();
}

export async function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const guard = new SecurityGuardService();
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'UNAUTHORIZED_ACCESS' });

  const user = await guard.verifyToken(token);
  if (!user) return res.status(403).json({ error: 'TOKEN_REVOKED_OR_INVALID' });

  req.body.user = user;
  return next();
}`,
  },
  {
    path: 'src/services/telemetryService.ts',
    content: `// Telemetry Business Logic & Asynchronous Orchestration
import { UserAnalyticsRepository } from '../infrastructure/postgres';
import { EventProducer } from '../infrastructure/eventBus';
import { RedisClusterPool } from '../infrastructure/redisPool';

export interface TelemetryPayload {
  userId: string;
  metricPayload: Record<string, unknown>;
}

export class TelemetryDispatcherService {
  private redis: RedisClusterPool;
  private analyticsDb: UserAnalyticsRepository;
  private eventBus: EventProducer;

  constructor() {
    this.redis = new RedisClusterPool();
    this.analyticsDb = new UserAnalyticsRepository();
    this.eventBus = new EventProducer({ topic: 'telemetry.ingress.v1' });
  }

  public async dispatch(payload: TelemetryPayload, traceId: string) {
    // 1. Hot Cache Lookup
    const cachedSession = await this.redis.get(\`session:\${payload.userId}\`);
    
    // 2. Relational Ledger Persistence
    const record = await this.analyticsDb.insertRecord({
      userId: payload.userId,
      payload: payload.metricPayload,
      traceId,
    });

    // 3. Distributed Stream Broadcast
    await this.eventBus.publish({
      topic: 'events.user.action',
      key: record.id,
      value: JSON.stringify(record),
    });

    return { recordId: record.id, cached: Boolean(cachedSession) };
  }
}`,
  },
  {
    path: 'src/services/orderService.ts',
    content: `// Order Processing Domain Service
import { UserAnalyticsRepository } from '../infrastructure/postgres';
import { EventProducer } from '../infrastructure/eventBus';

export interface OrderInput {
  customerId: string;
  items: { sku: string; quantity: number }[];
  total: number;
}

export class OrderProcessingService {
  private db: UserAnalyticsRepository;
  private eventBus: EventProducer;

  constructor() {
    this.db = new UserAnalyticsRepository();
    this.eventBus = new EventProducer({ topic: 'orders.events.v1' });
  }

  public async createOrder(input: OrderInput) {
    const record = await this.db.insertRecord({
      userId: input.customerId,
      payload: input,
      traceId: 'order-gen-trace',
    });

    await this.eventBus.publish({
      topic: 'orders.created',
      key: record.id,
      value: JSON.stringify(input),
    });

    return { orderId: record.id, status: 'CONFIRMED' };
  }
}`,
  },
  {
    path: 'src/infrastructure/postgres.ts',
    content: `// Relational Persistence Layer
export interface LedgerRecord {
  id: string;
  userId: string;
  payload: unknown;
  traceId: string;
  createdAt: Date;
}

export class UserAnalyticsRepository {
  private poolConfig = {
    host: process.env.PG_HOST || 'postgres.internal',
    port: 5432,
    database: 'analytics_ledger',
  };

  public async insertRecord(entry: { userId: string; payload: unknown; traceId: string }): Promise<LedgerRecord> {
    const id = 'rec_' + Math.random().toString(36).substring(2, 9);
    return {
      id,
      userId: entry.userId,
      payload: entry.payload,
      traceId: entry.traceId,
      createdAt: new Date(),
    };
  }

  public async findByUserId(userId: string): Promise<LedgerRecord[]> {
    return [];
  }
}`,
  },
  {
    path: 'src/infrastructure/redisPool.ts',
    content: `// In-Memory Distributed Cache Pool
export class RedisClusterPool {
  private endpoint = process.env.REDIS_HOST || 'redis://cluster-01.cache:6379';

  public async get(key: string): Promise<string | null> {
    return null;
  }

  public async set(key: string, value: string, ttlSeconds: number = 3600): Promise<void> {}

  public async expire(key: string, seconds: number): Promise<boolean> {
    return true;
  }
}`,
  },
  {
    path: 'src/infrastructure/eventBus.ts',
    content: `// Kafka Asynchronous Distributed Message Mesh
export interface EventMessage {
  topic: string;
  key: string;
  value: string;
}

export class EventProducer {
  private defaultTopic: string;
  private brokerAddress = process.env.KAFKA_BROKERS || 'kafka.internal:9092';

  constructor(options: { topic: string }) {
    this.defaultTopic = options.topic;
  }

  public async publish(message: EventMessage): Promise<boolean> {
    return true;
  }
}`,
  },
];

export function detectLanguage(filenameOrCode: string): string {
  const lower = filenameOrCode.toLowerCase();
  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.mts') ||
    lower.endsWith('.cts') ||
    lower.includes(': type') ||
    lower.includes('interface ')
  ) {
    return 'TypeScript';
  }
  if (lower.endsWith('.js') || lower.endsWith('.jsx') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) {
    return 'JavaScript';
  }
  if (lower.endsWith('.json')) {
    return 'JSON';
  }
  return 'TypeScript/JavaScript';
}

/**
 * Robust TypeScript AST Parser using native Compiler APIs
 */
export function parseTypeScriptSource(
  filePath: string,
  sourceCode: string
): { summary: FileAstSummary; diagnostics: ParserDiagnostic[]; classes: ClassInfo[] } {
  const extension = filePath.toLowerCase().split('.').pop();
  const scriptKind = extension === 'tsx' || extension === 'jsx'
    ? ts.ScriptKind.TSX
    : ['js', 'mjs', 'cjs'].includes(extension || '')
    ? ts.ScriptKind.JS
    : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true,
    scriptKind
  );

  const symbols: CodeSymbol[] = [];
  const classes: ClassInfo[] = [];
  const imports: FileAstSummary['imports'] = [];
  const endpoints: string[] = [];
  const exports: string[] = [];
  const diagnostics: ParserDiagnostic[] = [];

  // @ts-expect-error parseDiagnostics exists in TS SourceFile AST
  const parseDiags: readonly ts.Diagnostic[] = sourceFile.parseDiagnostics || [];
  for (const diag of parseDiags) {
    const lineChar = sourceFile.getLineAndCharacterOfPosition(diag.start || 0);
    diagnostics.push({
      file: filePath,
      line: lineChar.line + 1,
      message: ts.flattenDiagnosticMessageText(diag.messageText, '\n'),
      severity: diag.category === ts.DiagnosticCategory.Error ? 'error' : 'warning',
    });
  }

  function visit(node: ts.Node) {
    const lineChar = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const line = lineChar.line + 1;
    const character = lineChar.character + 1;

    // 1. Imports
    if (ts.isImportDeclaration(node)) {
      const moduleSpecifier = node.moduleSpecifier;
      if (ts.isStringLiteral(moduleSpecifier)) {
        const source = moduleSpecifier.text;
        const specifiers: string[] = [];
        let isDefault = false;

        if (node.importClause) {
          if (node.importClause.name) {
            isDefault = true;
            specifiers.push(node.importClause.name.text);
          }

          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const elem of node.importClause.namedBindings.elements) {
                specifiers.push(elem.name.text);
              }
            } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              specifiers.push(`* as ${node.importClause.namedBindings.name.text}`);
            }
          }
        }

        imports.push({ source, specifiers, isDefault, line });
      }
    }

    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text.toUpperCase();
      const route = node.arguments[0];
      if (
        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'ALL'].includes(method) &&
        route &&
        ts.isStringLiteralLike(route)
      ) {
        endpoints.push(`${method} ${route.text}`);
      }
    }

    // 2. Export Declarations
    if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        for (const el of node.exportClause.elements) {
          exports.push(el.name.text);
        }
      }
    }

    // 3. Functions
    if (ts.isFunctionDeclaration(node) && node.name) {
      const isExported = Boolean(node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
      const calls: string[] = [];

      node.forEachChild(function collectCalls(child) {
        if (ts.isCallExpression(child)) {
          calls.push(child.expression.getText(sourceFile));
        }
        child.forEachChild(collectCalls);
      });

      const params = node.parameters.map((p) => p.name.getText(sourceFile));
      const returnType = node.type ? node.type.getText(sourceFile) : 'void';

      symbols.push({
        name: node.name.text,
        kind: 'function',
        line,
        character,
        exported: isExported,
        parameters: params,
        returnType,
        calls,
      });

      if (isExported) exports.push(node.name.text);
    }

    // 4. Variables / Arrow Functions
    if (ts.isVariableStatement(node)) {
      const isExported = Boolean(node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          const isFunc = decl.initializer && (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer));
          const calls: string[] = [];

          if (decl.initializer) {
            decl.initializer.forEachChild(function collectCalls(child) {
              if (ts.isCallExpression(child)) {
                calls.push(child.expression.getText(sourceFile));
              }
              child.forEachChild(collectCalls);
            });
          }

          symbols.push({
            name,
            kind: isFunc ? 'function' : 'variable',
            line,
            character,
            exported: isExported,
            calls,
          });

          if (isExported) exports.push(name);
        }
      }
    }

    // 5. Classes
    if (ts.isClassDeclaration(node) && node.name) {
      const isExported = Boolean(node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
      const className = node.name.text;
      const classMethods: ClassInfo['methods'] = [];
      const classProps: ClassInfo['properties'] = [];

      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          const mLineChar = sourceFile.getLineAndCharacterOfPosition(member.getStart(sourceFile));
          const methodName = member.name.text;
          const mCalls: string[] = [];

          member.forEachChild(function collectCalls(child) {
            if (ts.isCallExpression(child)) {
              mCalls.push(child.expression.getText(sourceFile));
            }
            child.forEachChild(collectCalls);
          });

          const isPrivate = Boolean(member.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword));
          const isProtected = Boolean(member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ProtectedKeyword));
          const visibility = isPrivate ? 'private' : isProtected ? 'protected' : 'public';

          classMethods.push({
            name: methodName,
            line: mLineChar.line + 1,
            visibility,
            parameters: member.parameters.map((p) => p.name.getText(sourceFile)),
            returnType: member.type ? member.type.getText(sourceFile) : 'any',
          });

          symbols.push({
            name: `${className}.${methodName}`,
            kind: 'method',
            line: mLineChar.line + 1,
            character: mLineChar.character + 1,
            exported: isExported,
            calls: mCalls,
          });
        }

        if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
          const isPrivate = Boolean(member.modifiers?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword));
          const isProtected = Boolean(member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ProtectedKeyword));
          classProps.push({
            name: member.name.text,
            type: member.type ? member.type.getText(sourceFile) : 'any',
            visibility: isPrivate ? 'private' : isProtected ? 'protected' : 'public',
          });
        }
      }

      symbols.push({
        name: className,
        kind: 'class',
        line,
        character,
        exported: isExported,
      });

      classes.push({
        name: className,
        isInterface: false,
        methods: classMethods,
        properties: classProps,
      });

      if (isExported) exports.push(className);
    }

    // 6. Interfaces
    if (ts.isInterfaceDeclaration(node)) {
      const isExported = Boolean(node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword));
      const ifaceName = node.name.text;
      const ifaceProps: ClassInfo['properties'] = [];
      const ifaceMethods: ClassInfo['methods'] = [];

      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
          ifaceProps.push({
            name: member.name.text,
            type: member.type ? member.type.getText(sourceFile) : 'any',
            visibility: 'public',
          });
        }
      }

      symbols.push({
        name: ifaceName,
        kind: 'interface',
        line,
        character,
        exported: isExported,
      });

      classes.push({
        name: ifaceName,
        isInterface: true,
        methods: ifaceMethods,
        properties: ifaceProps,
      });

      if (isExported) exports.push(ifaceName);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const lines = sourceCode.split('\n');
  let packageDependencies: Record<string, string> | undefined;
  if (filePath.split('/').pop() === 'package.json') {
    try {
      const packageData = JSON.parse(sourceCode) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      packageDependencies = { ...packageData.dependencies, ...packageData.devDependencies };
    } catch (error) {
      diagnostics.push({
        file: filePath,
        line: 1,
        message: `Invalid package.json: ${error instanceof Error ? error.message : 'unable to parse JSON'}`,
        severity: 'warning',
      });
    }
  }
  const summary: FileAstSummary = {
    filePath,
    language: detectLanguage(filePath),
    lineCount: lines.length,
    statementCount: sourceFile.statements.length,
    symbols,
    classes,
    imports,
    endpoints: Array.from(new Set(endpoints)),
    packageDependencies,
    exports,
    parseErrors: diagnostics.filter((d) => d.severity === 'error').map((d) => `L${d.line}: ${d.message}`),
  };

  return { summary, diagnostics, classes };
}

/**
 * Classifies changeability with concrete evidence
 */
export function classifyChangeability(
  file: string,
  category: NodeCategory,
  hasContracts: boolean,
  isGenerated: boolean
): { classification: ChangeabilityClass; evidence: string } {
  if (file.includes('package.json') || file.includes('config') || file.includes('.env')) {
    return {
      classification: 'CONFIG_DRIVEN',
      evidence: 'Configuration manifest defining environment variables and package dependencies.',
    };
  }
  if (file.includes('node_modules') || category === 'client') {
    return {
      classification: 'EXTERNAL_DEP',
      evidence: 'Third-party package implementation owned by external registry.',
    };
  }
  if (isGenerated || file.includes('generated') || file.includes('.d.ts')) {
    return {
      classification: 'GENERATED',
      evidence: 'Synthesized build artifact or type declaration that should not be manually edited.',
    };
  }
  if (hasContracts || category === 'gateway' || file.includes('router') || file.includes('api/')) {
    return {
      classification: 'CONTRACT_SENSITIVE',
      evidence: 'Exposes public HTTP endpoints or shared interfaces. Alterations directly affect callers and clients.',
    };
  }
  if (category === 'database' || category === 'cache' || category === 'queue') {
    return {
      classification: 'INFRASTRUCTURE',
      evidence: 'Binds external stateful services and network sockets requiring operational coordination.',
    };
  }
  return {
    classification: 'APPLICATION_OWNED',
    evidence: 'First-party domain code located within project source tree, safe for direct iterative modification.',
  };
}

function resolveRelativeImport(importerPath: string, importSource: string, filePaths: Set<string>): string | undefined {
  if (!importSource.startsWith('.')) return undefined;

  const segments = importerPath.replace(/\\/g, '/').split('/').slice(0, -1);
  for (const segment of importSource.replace(/\\/g, '/').split('/')) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }

  const resolved = segments.join('/');
  const candidates = [
    resolved,
    ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'].map((extension) => `${resolved}${extension}`),
    ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'].map((extension) => `${resolved}/index${extension}`),
  ];
  return candidates.find((candidate) => filePaths.has(candidate));
}

/**
 * Generates genuine multi-level hierarchical architecture graph:
 * Level 1: System Subsystems
 * Level 2: Components (Files/Modules)
 * Level 3: Files & Symbols
 * Level 4: Execution / Data Flow Traces
 */
export function buildMultiLevelArchitecture(
  files: FileAstSummary[],
  projectName: string,
  diagnostics: ParserDiagnostic[]
): {
  graph: ArchitectureGraph;
  allLevelNodes: AnalysisResult['allLevelNodes'];
  allLevelEdges: AnalysisResult['allLevelEdges'];
  documentation: GeneratedDocumentation;
  executionTraces: ExecutionStep[];
  sequenceMessages: SequenceMessage[];
  classes: ClassInfo[];
} {
  let hexSeed = 0x10a0;
  const nextHex = () => `0x${(hexSeed += 0x1f7).toString(16).toUpperCase()}`;

  // -------------------------------------------------------------
  // LEVEL 2: COMPONENT NODES (ONE PER DISTINCT SOURCE FILE)
  // Fixes the root cause where files were collapsed into 2-3 buckets!
  // -------------------------------------------------------------
  const componentNodes: ArchitectureNode[] = [];
  const componentEdges: ArchitectureEdge[] = [];

  const fileToNodeMap: Map<string, ArchitectureNode> = new Map();

  files.forEach((file, index) => {
    const fileName = file.filePath.split('/').pop() || file.filePath;
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    const pathLower = file.filePath.toLowerCase();
    const allImports = file.imports.map((i) => i.source);

    let category: NodeCategory = 'service';
    let subsystem = 'Core Business Logic';
    let subsystemId = 'subsystem-core-services';

    if (pathLower.includes('gateway') || pathLower.includes('router') || pathLower.includes('api')) {
      category = 'gateway';
      subsystem = 'API & Ingress Gateway';
      subsystemId = 'subsystem-gateway';
    } else if (pathLower.includes('security') || pathLower.includes('auth') || pathLower.includes('guard')) {
      category = 'middleware';
      subsystem = 'Security & Authentication Perimeter';
      subsystemId = 'subsystem-security';
    } else if (pathLower.includes('postgres') || pathLower.includes('db') || pathLower.includes('repository') || pathLower.includes('sql')) {
      category = 'database';
      subsystem = 'Persistence & Storage Tier';
      subsystemId = 'subsystem-persistence';
    } else if (pathLower.includes('redis') || pathLower.includes('cache')) {
      category = 'cache';
      subsystem = 'Distributed In-Memory Cache';
      subsystemId = 'subsystem-cache';
    } else if (pathLower.includes('event') || pathLower.includes('kafka') || pathLower.includes('queue') || pathLower.includes('bus')) {
      category = 'queue';
      subsystem = 'Event Streaming Mesh';
      subsystemId = 'subsystem-messaging';
    } else if (pathLower.includes('package.json') || pathLower.includes('config')) {
      category = 'module';
      subsystem = 'Configuration & Infrastructure';
      subsystemId = 'subsystem-config';
    }

    // Spatial coordinate calculation across a balanced canvas grid
    const cols = Math.max(3, Math.ceil(Math.sqrt(files.length * 1.5)));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = Math.round(15 + (col / (cols - 1 || 1)) * 70);
    const y = Math.round(18 + (row / (Math.ceil(files.length / cols) || 1)) * 64);

    const endpoints = file.endpoints;

    const { classification, evidence } = classifyChangeability(
      file.filePath,
      category,
      file.exports.length > 0 || endpoints.length > 0,
      false
    );

    const callChain = file.symbols.slice(0, 4).map((s) => `${s.kind} ${s.name}() [L${s.line}]`);
    if (callChain.length === 0) {
      callChain.push(`Module evaluation [${file.filePath}]`);
    }

    const contracts = file.exports.map((e) => `export ${e}`).slice(0, 5);
    if (contracts.length === 0) {
      contracts.push(...allImports.slice(0, 3).map((imp) => `import from '${imp}'`));
    }

    const node: ArchitectureNode = {
      id: `node-${encodeURIComponent(file.filePath)}`,
      hexId: nextHex(),
      label: `${baseName.charAt(0).toUpperCase() + baseName.slice(1)} Module`,
      category,
      technology: `${file.language} // ${file.symbols.length} AST Symbols`,
      status: file.parseErrors.length > 0 ? 'WARNING' : 'HEALTHY',
      fileOrigin: file.filePath,
      x,
      y,
      metrics: {
        latency: 'Not measured (static analysis)',
        throughput: 'Not measured (static analysis)',
        securityZone: 'Not determined by static analysis',
        complexity: `${file.statementCount} top-level statements`,
      },
      summary: `Source file '${file.filePath}' declares ${file.symbols.length} symbols and ${file.imports.length} imports.`,
      callChain,
      dependencies: { upstream: [], downstream: [] },
      dataContracts: contracts,
      level: 'COMPONENT',
      parentSubsystemId: subsystemId,
      subsystem,
      files: [file.filePath],
      symbols: file.symbols,
      classes: file.classes,
      endpoints,
      changeability: classification,
      changeabilityEvidence: evidence,
      inferred: true,
    };

    componentNodes.push(node);
    fileToNodeMap.set(file.filePath, node);
  });

  const filePaths = new Set(files.map((file) => file.filePath.replace(/\\/g, '/')));

  // Resolve only exact relative imports against discovered file paths.
  componentNodes.forEach((sourceNode) => {
    const sourceFile = files.find((f) => f.filePath === sourceNode.fileOrigin);
    if (!sourceFile) return;

    sourceFile.imports.forEach((imp) => {
      const targetPath = resolveRelativeImport(sourceNode.fileOrigin, imp.source, filePaths);
      const targetNode = targetPath
        ? fileToNodeMap.get(targetPath) || componentNodes.find((candidate) => candidate.fileOrigin.replace(/\\/g, '/') === targetPath)
        : undefined;

      if (targetNode) {
        const edgeId = `edge-${sourceNode.id}-${targetNode.id}`;
        if (!componentEdges.some((e) => e.id === edgeId)) {
          sourceNode.dependencies.downstream.push(targetNode.label);
          targetNode.dependencies.upstream.push(sourceNode.label);

          componentEdges.push({
            id: edgeId,
            source: sourceNode.id,
            target: targetNode.id,
            protocol: 'Static Module Binding',
            flowLabel: `${sourceNode.label.split(' ')[0]} -> ${targetNode.label.split(' ')[0]}`,
            active: true,
            confidence: 'OBSERVED_AST',
            relationshipType: 'import',
            callSignature: `import { ${imp.specifiers.slice(0, 2).join(', ')} } from '${imp.source}'`,
            sourceLine: imp.line,
          });
        }
      }
    });
  });

  // -------------------------------------------------------------
  // LEVEL 1: SYSTEM TOPOLOGY (SUBSYSTEMS)
  // High-level architectural clusters with progressive disclosure
  // -------------------------------------------------------------
  const subsystemMap: Map<string, {
    label: string;
    category: NodeCategory;
    files: string[];
    symbols: CodeSymbol[];
    components: ArchitectureNode[];
  }> = new Map();

  componentNodes.forEach((comp) => {
    const subId = comp.parentSubsystemId || 'subsystem-core';
    if (!subsystemMap.has(subId)) {
      subsystemMap.set(subId, {
        label: comp.subsystem || 'Core Subsystem',
        category: comp.category,
        files: [],
        symbols: [],
        components: [],
      });
    }
    const sub = subsystemMap.get(subId)!;
    sub.files.push(...(comp.files || []));
    sub.symbols.push(...(comp.symbols || []));
    sub.components.push(comp);
  });

  const systemNodes: ArchitectureNode[] = [];
  const systemEdges: ArchitectureEdge[] = [];
  const subEntries = Array.from(subsystemMap.entries());

  subEntries.forEach(([subId, sub], idx) => {
    const angle = (idx / subEntries.length) * 2 * Math.PI;
    const x = Math.round(50 + 36 * Math.cos(angle));
    const y = Math.round(50 + 32 * Math.sin(angle));

    systemNodes.push({
      id: subId,
      hexId: nextHex(),
      label: sub.label,
      category: sub.category,
      technology: `${sub.components.length} Components // ${sub.files.length} Files`,
      status: 'HEALTHY',
      fileOrigin: sub.files[0] || 'src/',
      x,
      y,
      metrics: {
        latency: 'Not measured (static analysis)',
        throughput: 'Not measured (static analysis)',
        securityZone: 'Not determined by static analysis',
        complexity: `${sub.symbols.length} declarations`,
      },
      summary: `Path-based grouping of ${sub.components.length} source files.`,
      callChain: [],
      dependencies: { upstream: [], downstream: [] },
      dataContracts: [],
      level: 'SYSTEM',
      isSubsystemParent: true,
      inferred: true,
      files: sub.files,
      symbols: sub.symbols,
      changeability: 'CONTRACT_SENSITIVE',
      changeabilityEvidence: 'Major structural subsystem boundary. Changes require architectural review.',
    });
  });

  // Connect subsystems based on child component connections
  componentEdges.forEach((compEdge) => {
    const srcComp = componentNodes.find((c) => c.id === compEdge.source);
    const tgtComp = componentNodes.find((c) => c.id === compEdge.target);
    if (srcComp && tgtComp && srcComp.parentSubsystemId !== tgtComp.parentSubsystemId) {
      const srcSub = srcComp.parentSubsystemId!;
      const tgtSub = tgtComp.parentSubsystemId!;
      const edgeId = `sysedge-${srcSub}-${tgtSub}`;
      if (!systemEdges.some((e) => e.id === edgeId)) {
        const sourceSubsystem = systemNodes.find((node) => node.id === srcSub);
        const targetSubsystem = systemNodes.find((node) => node.id === tgtSub);
        if (sourceSubsystem && targetSubsystem) {
          sourceSubsystem.dependencies.downstream.push(targetSubsystem.label);
          targetSubsystem.dependencies.upstream.push(sourceSubsystem.label);
        }
        systemEdges.push({
          id: edgeId,
          source: srcSub,
          target: tgtSub,
          protocol: 'Subsystem Communication Mesh',
          flowLabel: `${srcComp.label.split(' ')[0]} -> ${tgtComp.label.split(' ')[0]}`,
          active: true,
          confidence: 'STATIC_INFERRED',
          relationshipType: 'subsystem_link',
          isInferred: true,
        });
      }
    }
  });

  // -------------------------------------------------------------
  // LEVEL 3: FILE TOPOLOGY (DETAILED SYMBOLS & CALL GRAPH)
  // -------------------------------------------------------------
  const fileNodes: ArchitectureNode[] = files.map((file, index) => {
    const component = fileToNodeMap.get(file.filePath)!;
    return {
      ...component,
      id: `file-${encodeURIComponent(file.filePath)}`,
      hexId: nextHex(),
      label: file.filePath,
      category: 'file',
      level: 'FILE',
      parentNodeId: component.id,
      x: 15 + (index % Math.max(1, Math.ceil(Math.sqrt(files.length)))) * 24,
      y: 20 + Math.floor(index / Math.max(1, Math.ceil(Math.sqrt(files.length)))) * 24,
    };
  });
  const fileEdges: ArchitectureEdge[] = componentEdges.map((edge) => ({
    ...edge,
    id: `file-${edge.id}`,
    source: fileNodes.find((node) => node.fileOrigin === componentNodes.find((component) => component.id === edge.source)?.fileOrigin)?.id || edge.source,
    target: fileNodes.find((node) => node.fileOrigin === componentNodes.find((component) => component.id === edge.target)?.fileOrigin)?.id || edge.target,
  }));
  const symbolNodes: ArchitectureNode[] = [];
  const symbolEdges: ArchitectureEdge[] = [];
  const totalSymbolCount = files.reduce((total, file) => total + file.symbols.length, 0);
  const symbolColumns = Math.max(1, Math.ceil(Math.sqrt(totalSymbolCount)));
  const symbolRows = Math.max(1, Math.ceil(totalSymbolCount / symbolColumns));

  const allDeclaredSymbols: { symbol: CodeSymbol; file: string; nodeId: string }[] = [];

  files.forEach((file) => {
    file.symbols.forEach((sym, sIdx) => {
      const symNodeId = `sym-${encodeURIComponent(file.filePath)}-${sIdx}-${encodeURIComponent(sym.name)}`;
      const positionIndex = symbolNodes.length;
      const x = Math.round(10 + (positionIndex % symbolColumns) * (80 / Math.max(1, symbolColumns - 1)));
      const y = Math.round(15 + Math.floor(positionIndex / symbolColumns) * (70 / Math.max(1, symbolRows - 1)));
      const parentFileNode = fileNodes.find((node) => node.fileOrigin === file.filePath);

      const symNode: ArchitectureNode = {
        id: symNodeId,
        hexId: nextHex(),
        label: sym.name,
        category: 'symbol',
        technology: `${sym.kind.toUpperCase()} @ L${sym.line}`,
        status: 'HEALTHY',
        fileOrigin: file.filePath,
        sourceLine: sym.line,
        sourceCharacter: sym.character,
        x,
        y,
        metrics: {
          latency: 'Not measured (static analysis)',
          throughput: 'Not measured (static analysis)',
          securityZone: 'Not determined by static analysis',
          complexity: `Line ${sym.line}, column ${sym.character}`,
        },
        summary: `Symbol '${sym.name}' declared as ${sym.kind} in ${file.filePath} at line ${sym.line}.`,
        callChain: sym.calls || [],
        dependencies: { upstream: [], downstream: [] },
        dataContracts: [`${sym.exported ? 'export ' : ''}${sym.kind} ${sym.name}`],
        level: 'SYMBOL',
        parentNodeId: parentFileNode?.id,
        changeability: sym.exported ? 'CONTRACT_SENSITIVE' : 'APPLICATION_OWNED',
        changeabilityEvidence: sym.exported
          ? 'Exported symbol: changing signature impacts external importing files.'
          : 'Internal symbol: safe to refactor within its enclosing file.',
      };

      symbolNodes.push(symNode);
      allDeclaredSymbols.push({ symbol: sym, file: file.filePath, nodeId: symNodeId });
    });
  });

  // Connect symbol call edges
  allDeclaredSymbols.forEach(({ symbol: caller, nodeId: callerId }) => {
    (caller.calls || []).forEach((callExpr) => {
      const calledName = callExpr.split('.').pop()?.replace(/\(.*$/, '') || callExpr;
      const targetMatches = allDeclaredSymbols.filter(
        (symbol) => symbol.symbol.name === calledName || symbol.symbol.name.endsWith(`.${calledName}`)
      );
      const targetMatch = targetMatches.length === 1 ? targetMatches[0] : undefined;
      if (targetMatch && targetMatch.nodeId !== callerId) {
        const edgeId = `calledge-${callerId}-${targetMatch.nodeId}`;
        if (!symbolEdges.some((e) => e.id === edgeId)) {
          symbolEdges.push({
            id: edgeId,
            source: callerId,
            target: targetMatch.nodeId,
            protocol: 'Static Function Call',
            flowLabel: `calls ${calledName}()`,
            active: true,
            confidence: 'STATIC_INFERRED',
            relationshipType: 'call',
            callSignature: `${caller.name}() -> ${targetMatch.symbol.name}()`,
            isInferred: true,
          });
        }
      }
    });
  });

  // -------------------------------------------------------------
  // LEVEL 4: EXECUTION TRACES & DATA FLOW SIMULATION
  // Grounded walk-through for Simulink-style interactive playback
  // -------------------------------------------------------------
  const executionTraces: ExecutionStep[] = symbolEdges.flatMap((edge, index) => {
    const caller = allDeclaredSymbols.find((entry) => entry.nodeId === edge.source);
    const callee = allDeclaredSymbols.find((entry) => entry.nodeId === edge.target);
    if (!caller || !callee) return [];
    return [{
      stepNumber: index + 1,
      nodeId: edge.source,
      nodeLabel: caller.symbol.name,
      symbolName: edge.callSignature || edge.flowLabel,
      filePath: caller.file,
      line: caller.symbol.line,
      inputDescription: 'Call arguments are not inferred by static analysis.',
      operationDescription: `Static call expression targets ${callee.symbol.name} in ${callee.file}.`,
      outputDescription: 'Runtime values and call outcome are not available from static analysis.',
      confidence: edge.confidence,
    }];
  });

  const sequenceMessages: SequenceMessage[] = symbolEdges.flatMap((edge, index) => {
    const caller = symbolNodes.find((node) => node.id === edge.source);
    const callee = symbolNodes.find((node) => node.id === edge.target);
    if (!caller || !callee) return [];
    return [{
      id: `sequence-${edge.id}`,
      fromNodeId: caller.id,
      toNodeId: callee.id,
      fromLabel: caller.label,
      toLabel: callee.label,
      label: edge.flowLabel,
      signature: edge.callSignature || edge.flowLabel,
      stepNumber: index + 1,
      isAsync: false,
      sourceLine: edge.sourceLine,
    }];
  });
  // Consolidate Classes
  const allClasses = files.flatMap((f) => f.classes || []);

  // Compute Lines & Counts
  const rawSourceLines = files.reduce((acc, f) => acc + f.lineCount, 0);
  const astNodesCount = files.reduce((acc, f) => acc + f.statementCount + f.symbols.length, 0);

  const frameworkVersions: FrameworkVersionInfo[] = files
    .flatMap((manifest) =>
      Object.entries(manifest.packageDependencies || {}).map(([name, version]) => ({
        name,
        version,
        source: 'package.json' as const,
        matchedFiles: files
          .filter((file) => file.imports.some((entry) => entry.source === name || entry.source.startsWith(`${name}/`)))
          .map((file) => file.filePath),
      }))
    );

  const gitHistory: GeneratedDocumentation['gitHistory'] = [];
  const setupInstructions: SetupInstructions = {
    prerequisites: [],
    cloneCommand: 'Repository URL was not part of the analyzed source.',
    directoryCommand: 'Not available from source analysis.',
    installCommand: files.some((file) => file.filePath.split('/').pop() === 'package.json')
      ? 'Package manifest detected; exact install command depends on the lockfile/package manager.'
      : 'No package manifest was provided.',
    envSetupCommand: 'Environment setup was not inferred from source files.',
    serviceConfiguration: [],
    devStartCommand: 'Not detected in supplied files.',
    buildCommand: 'Not detected in supplied files.',
    testCommand: 'Not detected in supplied files.',
    lintCommand: 'Not detected in supplied files.',
    commonTroubleshooting: [],
  };

  // Derived Documentation
  const documentation: GeneratedDocumentation = {
    overview: `Multi-level software architecture derived from static AST inspection of ${files.length} file(s) comprising ${rawSourceLines} lines of code and ${astNodesCount} AST statements/symbols.`,
    detectedStyle: 'Static source dependency graph',
    modules: componentNodes.map((n) => ({
      name: n.label,
      description: n.summary,
      files: n.files || [n.fileOrigin],
      role: `Classified as ${n.category.toUpperCase()} within '${n.subsystem}'. Changeability: ${n.changeability}.`,
    })),
    dependencies: componentEdges.map((e) => ({
      from: componentNodes.find((n) => n.id === e.source)?.label || e.source,
      to: componentNodes.find((n) => n.id === e.target)?.label || e.target,
      nature: e.protocol,
    })),
    entryPoints: files.flatMap((file) => file.endpoints.map((endpoint) => `${endpoint} (${file.filePath})`)),
    keySymbols: files
      .flatMap((f) => f.symbols)
      .slice(0, 12)
      .map((s) => ({
        name: s.name,
        type: s.kind,
        location: `${files.find((file) => file.symbols.includes(s))?.filePath || 'unknown'}:${s.line}`,
        purpose: s.exported ? 'Export modifier observed in source' : 'Declaration observed in source',
      })),
    dataFlow: executionTraces.map((t) => `${t.stepNumber}. [${t.nodeLabel}] ${t.symbolName} -> ${t.outputDescription}`),
    externalIntegrations: Array.from(
      new Set(
        files.flatMap((file) =>
          file.imports
            .filter((entry) =>
              !entry.source.startsWith('.') &&
              !entry.source.startsWith('@/') &&
              !entry.source.startsWith('~/')
            )
            .map((entry) => (entry.source.startsWith('@') ? entry.source.split('/').slice(0, 2).join('/') : entry.source.split('/')[0]))
        )
      )
    ),
    risksAndRecommendations: [
      {
        type: diagnostics.length > 0 ? 'risk' : 'recommendation',
        title: diagnostics.length > 0 ? 'Parser Diagnostics Detected' : 'No Parser Diagnostics',
        detail: diagnostics.length > 0
          ? `${diagnostics.length} parser diagnostic(s) found. Check the Parser View for file and line coordinates.`
          : 'No syntax diagnostics were reported. Static analysis does not verify runtime behavior or architecture quality.',
      },
      {
        type: 'recommendation',
        title: 'Zero-Trust Secrets Isolation',
        detail: 'Database connection strings and JWT signing keys must be loaded via secure process environment variables rather than bundled in client bundles.',
      },
    ],
    gitHistory,
    frameworkVersions,
    setupInstructions,
  };

  // Primary Default Graph (Level 2: Component View)
  const graph: ArchitectureGraph = {
    systemName: projectName.toUpperCase(),
    complianceLevel: diagnostics.length === 0 ? 'STATIC ANALYSIS // NO PARSER DIAGNOSTICS' : 'STATIC ANALYSIS // DIAGNOSTICS LOGGED',
    nodes: componentNodes,
    edges: componentEdges,
    rawSourceLines,
    astNodesCount,
    activeLevel: 'COMPONENT',
    activeDiagramMode: 'COMPONENT_DIAGRAM',
  };

  return {
    graph,
    allLevelNodes: {
      system: systemNodes,
      component: componentNodes,
      file: fileNodes,
      symbol: symbolNodes,
      execution: symbolNodes,
    },
    allLevelEdges: {
      system: systemEdges,
      component: componentEdges,
      file: fileEdges,
      symbol: symbolEdges,
      execution: symbolEdges,
    },
    documentation,
    executionTraces,
    sequenceMessages,
    classes: allClasses,
  };
}

/**
 * Top-Level Analysis Orchestrator
 */
export function analyzeSourceProject(
  files: SourceInputFile[],
  projectName: string = 'PROJECT SOURCE'
): AnalysisResult {
  const startTotal = performance.now();

  // 1. File Discovery & Input Validation
  const startDiscovery = performance.now();
  if (
    !Array.isArray(files) ||
    files.length === 0 ||
    files.some((file) => !file || typeof file.path !== 'string' || typeof file.content !== 'string') ||
    files.every((file) => !file.content.trim())
  ) {
    throw new Error('Provide at least one non-empty source file to analyze.');
  }
  const effectiveFiles = files.map((file) => ({
    ...file,
    path: file.path.replace(/\\/g, '/'),
  }));
  const fileDiscoveryMs = Math.round((performance.now() - startDiscovery) * 100) / 100;

  const startInput = performance.now();
  const inputProcessingMs = Math.round((performance.now() - startInput) * 100) / 100;

  // 2. AST Parsing
  const startParse = performance.now();
  const fileSummaries: FileAstSummary[] = [];
  const diagnostics: ParserDiagnostic[] = [];
  const classes: ClassInfo[] = [];

  for (const file of effectiveFiles) {
    if (!file.content.trim()) continue;
    const { summary, diagnostics: diags, classes: cl } = parseTypeScriptSource(file.path, file.content);
    fileSummaries.push(summary);
    diagnostics.push(...diags);
    classes.push(...cl);
  }
  const parsingMs = Math.round((performance.now() - startParse) * 100) / 100;

  // 3. Multi-Level Graph & Simulation Synthesis
  const startGraph = performance.now();
  const {
    graph,
    allLevelNodes,
    allLevelEdges,
    documentation,
    executionTraces,
    sequenceMessages,
  } = buildMultiLevelArchitecture(fileSummaries, projectName, diagnostics);
  const graphConstructionMs = Math.round((performance.now() - startGraph) * 100) / 100;

  // 4. Documentation & Timing
  const startDoc = performance.now();
  const documentationMs = Math.round((performance.now() - startDoc) * 100) / 100;
  const totalMs = Math.round((performance.now() - startTotal) * 100) / 100;

  const totalLines = fileSummaries.reduce((acc, f) => acc + f.lineCount, 0);
  const totalStatements = fileSummaries.reduce((acc, f) => acc + f.statementCount, 0);
  const totalSymbols = fileSummaries.reduce((acc, f) => acc + f.symbols.length, 0);
  const totalImports = fileSummaries.reduce((acc, f) => acc + f.imports.length, 0);
  const languageCounts = new Map<string, number>();
  fileSummaries.forEach((file) => {
    if (file.language === 'TypeScript' || file.language === 'JavaScript') {
      languageCounts.set(file.language, (languageCounts.get(file.language) || 0) + 1);
    }
  });
  const language = Array.from(languageCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  const parserStatus = diagnostics.some((d) => d.severity === 'error') ? 'WARNING' : 'SUCCESS';

  return {
    systemName: projectName,
    complianceLevel: diagnostics.length === 0 ? 'STATIC ANALYSIS // NO PARSER DIAGNOSTICS' : 'STATIC ANALYSIS // ISSUES FOUND',
    language,
    parserName: 'TypeScript Compiler v5.x Native AST Engine',
    parserStatus,
    filesDiscovered: effectiveFiles.length,
    filesParsed: fileSummaries.length,
    totalLines,
    totalStatements,
    totalSymbols,
    totalImports,
    graph,
    allLevelNodes,
    allLevelEdges,
    fileSummaries,
    diagnostics,
    timings: {
      fileDiscoveryMs,
      inputProcessingMs,
      parsingMs,
      graphConstructionMs,
      documentationMs,
      totalMs,
    },
    documentation,
    executionTraces,
    sequenceMessages,
    classes,
    rawSource: effectiveFiles[0]?.content,
    rawFiles: effectiveFiles,
  };
}
