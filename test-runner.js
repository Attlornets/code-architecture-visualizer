const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const root = __dirname;
const resolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveProjectAlias(request, parent, isMain, options) {
  const resolvedRequest = request.startsWith('@/') ? path.join(root, request.slice(2)) : request;
  return resolveFilename.call(this, resolvedRequest, parent, isMain, options);
};

require.extensions['.ts'] = (loadedModule, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  loadedModule._compile(output, filename);
};

function loadTypeScriptModule(relativePath) {
  const filename = path.join(root, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const loadedModule = new Module(filename, module);
  loadedModule.filename = filename;
  loadedModule.paths = Module._nodeModulePaths(path.dirname(filename));
  loadedModule._compile(output, filename);
  return loadedModule.exports;
}

const { analyzeSourceProject, parseTypeScriptSource } = loadTypeScriptModule('lib/astParser.ts');
const { buildGitHubSearchQueries, scoreRepositorySimilarity } = loadTypeScriptModule('lib/githubDiscovery.ts');
const { calculateImpactAnalysis } = loadTypeScriptModule('lib/impactAnalysis.ts');
const analyzeHandler = require(path.join(root, 'pages/api/analyze.ts')).default;
const historyHandler = require(path.join(root, 'pages/api/git/history.ts')).default;
const searchHandler = require(path.join(root, 'pages/api/github/search-similar.ts')).default;

const testPromises = [];
function test(name, operation) {
  testPromises.push(
    Promise.resolve()
      .then(operation)
      .then(() => console.log(`PASS ${name}`))
  );
}

function responseCapture() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const files = [
  {
    path: 'package.json',
    content: JSON.stringify({
      name: 'integration-fixture',
      dependencies: { express: '^4.0.0' },
      scripts: { test: 'node test.js' },
    }),
  },
  {
    path: 'src/api.ts',
    content: [
      "import { service } from './service';",
      "import express from 'express';",
      'export const app = express();',
      'export function handleOrder() { service(); }',
      "app.post('/orders', handleOrder);",
    ].join('\n'),
  },
  {
    path: 'src/service.ts',
    content: 'export function service() { return true; }',
  },
];

test('real parser captures symbols, imports, endpoint and source coordinates', () => {
  const parsed = parseTypeScriptSource('src/api.ts', files[1].content);
  assert.equal(parsed.summary.filePath, 'src/api.ts');
  assert.ok(parsed.summary.symbols.some((symbol) => symbol.name === 'handleOrder' && symbol.line === 4));
  assert.ok(parsed.summary.imports.some((entry) => entry.source === './service' && entry.line === 1));
  assert.deepEqual(parsed.summary.endpoints, ['POST /orders']);
});

test('analysis preserves discovered files and resolves exact relative imports', () => {
  const result = analyzeSourceProject(files, 'integration-fixture');
  assert.equal(result.filesDiscovered, 3);
  assert.equal(result.filesParsed, 3);
  assert.equal(result.graph.nodes.length, 3);
  assert.equal(result.allLevelNodes.file.length, 3);
  assert.ok(result.allLevelNodes.symbol.some((node) => node.label === 'handleOrder' && node.sourceLine === 4));
  assert.equal(result.graph.edges.length, 1);
  const apiNode = result.graph.nodes.find((node) => node.fileOrigin === 'src/api.ts');
  const serviceNode = result.graph.nodes.find((node) => node.fileOrigin === 'src/service.ts');
  assert.ok(result.graph.edges.some((edge) => edge.source === apiNode.id && edge.target === serviceNode.id));
  assert.equal(result.allLevelEdges.file.length, 1);
  assert.ok(result.allLevelEdges.symbol.some((edge) => edge.relationshipType === 'call' && edge.confidence === 'STATIC_INFERRED'));
});

test('documentation and impact analysis use the same graph evidence', () => {
  const result = analyzeSourceProject(files, 'integration-fixture');
  const apiNode = result.graph.nodes.find((node) => node.fileOrigin === 'src/api.ts');
  const serviceNode = result.graph.nodes.find((node) => node.fileOrigin === 'src/service.ts');
  assert.ok(result.documentation.modules.some((item) => item.files.includes(apiNode.fileOrigin)));
  assert.ok(result.documentation.dependencies.some((item) => item.from === apiNode.label && item.to === serviceNode.label));
  assert.deepEqual(result.documentation.entryPoints, ['POST /orders (src/api.ts)']);
  assert.deepEqual(result.documentation.externalIntegrations, ['express']);
  assert.equal(result.documentation.gitHistory.length, 0);
  assert.ok(result.documentation.frameworkVersions.some((item) => item.name === 'express' && item.version === '^4.0.0'));
  assert.equal(result.documentation.dataFlow.length, result.executionTraces.length);
  assert.match(apiNode.metrics.latency, /Not measured/);

  const impact = calculateImpactAnalysis(
    serviceNode,
    [...result.allLevelNodes.component, ...result.allLevelNodes.file, ...result.allLevelNodes.symbol],
    [...result.allLevelEdges.component, ...result.allLevelEdges.file, ...result.allLevelEdges.symbol]
  );
  assert.deepEqual(impact.directDependents, [apiNode.label]);
  assert.deepEqual(impact.affectedEndpoints, ['POST /orders']);
});

test('empty source is rejected rather than replaced by a demo project', () => {
  assert.throws(() => analyzeSourceProject([], 'empty'), /at least one non-empty source file/);
});

test('syntax diagnostics and GitHub similarity helpers use real implementations', () => {
  const broken = parseTypeScriptSource('broken.ts', 'function broken( { const value = ;');
  assert.ok(broken.diagnostics.some((diagnostic) => diagnostic.severity === 'error'));

  const queries = buildGitHubSearchQueries('TypeScript', ['express']);
  assert.equal(queries[0], 'express language:typescript stars:>15');
  const score = scoreRepositorySimilarity(
    { name: 'express-api', description: 'API gateway', language: 'TypeScript', topics: ['architecture'] },
    'TypeScript',
    ['express']
  );
  assert.ok(score.similarityScore > 0 && score.similarityScore <= 100);
  assert.ok(score.matchRationale.includes('express'));
});

test('GitHub API routes parse repository files, commits, and empty search results without fixtures', async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith('/repos/acme/sample')) {
      return { ok: true, json: async () => ({ default_branch: 'main' }) };
    }
    if (String(url).includes('/git/trees/main?recursive=1')) {
      return {
        ok: true,
        json: async () => ({
          tree: [
            { path: 'package.json', type: 'blob', size: 35 },
            { path: 'src/api.ts', type: 'blob', size: 63 },
            { path: 'src/service.ts', type: 'blob', size: 42 },
            { path: 'README.md', type: 'blob', size: 6 },
          ],
        }),
      };
    }
    if (String(url).includes('raw.githubusercontent.com')) {
      const source = String(url).endsWith('/package.json')
        ? '{"dependencies":{"express":"^4.0.0"}}'
        : String(url).endsWith('/src/api.ts')
        ? "import { run } from './service';\nexport function handler() { run(); }"
        : 'export function run() { return true; }';
      return { ok: true, text: async () => source };
    }
    if (String(url).includes('/commits?per_page=10')) {
      return {
        ok: true,
        json: async () => [{
          sha: '1234567890abcdef',
          commit: { author: { name: 'Contributor', email: 'dev@example.test', date: '2026-01-02T03:04:05Z' }, message: 'real change' },
        }],
      };
    }
    if (String(url).includes('/search/repositories?')) {
      return { ok: true, json: async () => ({ items: [] }) };
    }
    throw new Error(`Unexpected mocked GitHub request: ${url}`);
  };

  try {
    const analysisResponse = responseCapture();
    await analyzeHandler(
      { method: 'POST', body: { githubUrl: 'https://github.com/acme/sample' } },
      analysisResponse
    );
    assert.equal(analysisResponse.statusCode, 200);
    assert.deepEqual(analysisResponse.body.rawFiles.map((file) => file.path).sort(), [
      'package.json',
      'src/api.ts',
      'src/service.ts',
    ]);
    assert.equal(analysisResponse.body.graph.edges.length, 1);
    assert.equal(analysisResponse.body.documentation.gitHistory.length, 0);

    const historyResponse = responseCapture();
    await historyHandler(
      { method: 'POST', body: { githubUrl: 'https://github.com/acme/sample' } },
      historyResponse
    );
    assert.equal(historyResponse.statusCode, 200);
    assert.equal(historyResponse.body.commits[0].hash, '1234567890abcdef');
    assert.deepEqual(historyResponse.body.commits[0].changedFiles, []);

    const searchResponse = responseCapture();
    await searchHandler(
      { method: 'POST', body: { language: 'TypeScript', technologies: ['express'] } },
      searchResponse
    );
    assert.equal(searchResponse.statusCode, 200);
    assert.deepEqual(searchResponse.body.results, []);
    assert.equal(searchResponse.body.totalFound, 0);
    assert.ok(calls.some((url) => url.includes('/search/repositories?')));
  } finally {
    global.fetch = originalFetch;
  }
});

Promise.all(testPromises).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
