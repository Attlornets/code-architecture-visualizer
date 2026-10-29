# SYNAPSE // Interactive Code-to-Architecture Visualizer & Live Explainer

> **A source-grounded TypeScript/JavaScript dependency visualizer with hierarchical source navigation and an avant-garde editorial dashboard.**

[![CI Pipeline](https://github.com/enterprise/code-to-architecture-visualizer/actions/workflows/ci.yml/badge.svg)](https://github.com/enterprise/code-to-architecture-visualizer/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-20.x-111111?style=flat&logo=node.js&color=111111)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-111111?style=flat&logo=typescript&color=111111)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-111111?style=flat&logo=next.js&color=111111)](https://nextjs.org)

---

## 1. Product Concept & Mechanics

Modern microservices, serverless topologies, and modular monoliths evolve rapidly. Static README diagrams like Mermaid charts or static PNGs drift out of sync with production code within weeks.

**SYNAPSE** provides an interactive static-analysis workflow:
1. **Source ingestion:** Analyze supplied TypeScript/JavaScript files or a public GitHub repository. A small illustrative project is available only through the explicitly labeled **LOAD DEMO FIXTURE** action.
2. **AST parsing:** TypeScript compiler APIs extract declarations, imports, and common HTTP route registrations. Relative imports are connected only when they resolve to discovered files. This is static analysis, not runtime tracing or semantic type checking.
3. **Hierarchical graph:** Navigate system groupings, source modules, files, and symbols. Relationship edges are based on resolved imports or statically inferred call-name matches; inferred edges are labeled accordingly.
4. **Documentation and impact:** These views use the same analysis result. Runtime latency, throughput, security posture, and actual execution behavior are not inferred.
5. **GitHub integrations:** Repository search and commit summaries use live GitHub REST API responses. API failures are shown rather than replaced with sample repositories or commits.

---

## 2. Avant-Garde Editorial Design System

SYNAPSE deliberately rejects generic corporate dashboard patterns in favor of an **editorial, high-fashion set-design aesthetic**:
- **Color Palette & Atmosphere:** A calibrated dust-pink base (`#dfb2b2`) paired with stark high-contrast deep ink typography (`#111111`).
- **Spatial Typography:** Massive sans-serif headers broken across spatial boundaries, paired with micro-spaced monospace indicators (`[X:048 Y:120]`) and a vertical rotated label (`writing-mode: vertical-rl`) framing the outer viewport.
- **GPU-Accelerated Micro-Interactions:** Hover transitions where navigation links and action buttons expand their text tracking (`letter-spacing`) smoothly using custom cubic-bezier curves (`editorial-letter-spacing`).
- **Dynamic Directional Flows:** SVG vector paths running directional stroke dash animations (`animate-edge-flow`) demonstrating real-time message transit between microservice boundaries.

---

## 3. Directory Structure

```
├── .github/
│   └── workflows/
│       └── ci.yml               # CI lint, type-check and build workflow
├── components/
│   ├── ArchitectureCanvas.tsx   # Interactive graph and hierarchy navigation
│   ├── CodeInputPane.tsx        # Source input and source-location viewer
│   ├── DocumentationView.tsx    # Analysis-derived documentation
│   ├── GitHubDiscoveryPane.tsx  # Live repository search results
│   ├── ParserInspectorView.tsx  # AST declarations and diagnostics
│   └── SidebarMetadata.tsx      # Node details and impact analysis
├── lib/
│   ├── astParser.ts             # AST parsing and graph construction
│   ├── githubDiscovery.ts       # Search query and repository scoring helpers
│   └── impactAnalysis.ts        # Dependency impact traversal
├── pages/
│   ├── _app.tsx                 # Global application wrapper and typography baseline
│   └── index.tsx                # Three-column horizon orchestration & editorial header
│   └── api/                     # Source analysis, GitHub, explanation and history endpoints
├── styles/
│   └── globals.css              # Editorial Tailwind utilities, dash keyframes, & grid patterns
├── types/
│   └── architecture.ts          # Strongly typed domain entities, nodes, and edges
├── .env.example                 # Optional server-side integration settings
├── next.config.js               # Next.js production build configuration
├── package.json                 # Project scripts, dependencies, and metadata
├── postcss.config.js            # PostCSS engine pipeline
├── README.md                    # System blueprint & developer handbook
└── tsconfig.json                # Strict TypeScript compilation rules
```

---

## 4. Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/Attlornets/code-architecture-visualizer.git
cd code-to-architecture-visualizer

# Optional: configure .env.local from .env.example
cp .env.example .env.local

# Install verified dependencies
npm install
```

### Local Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quality Assurance & Validation
```bash
# Execute linting
npm run lint

# Validate TypeScript type consistency
npm run type-check

# Compile production build
npm run build

# Run analysis and API integration tests
npm test
```

---

## 5. Optional Integrations

The local source parser and deterministic AST summary do not require API credentials. Configure these server-side only when you need the related integration:

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `GITHUB_TOKEN` | `string` | Optional | Raises GitHub API rate limits and permits access to private repositories available to the token. Public repository analysis and search can work without it, subject to unauthenticated rate limits. |
| `OPENAI_API_KEY` | `string` | Optional | Enables OpenAI-powered component explanations. |
| `LOCAL_LLM_ENDPOINT` | `URL` | Optional | Enables local Ollama-compatible explanations when the endpoint is reachable. |

Git history is fetched only for repository analyses; pasted snippets and local fixture inputs have no associated repository history. GitHub commit-summary responses do not include changed-file lists, which are therefore shown as unavailable. Similar-repository discovery requires a usable detected language or external package and a reachable GitHub API.

---

## 6. Analysis and API boundaries

- Source text is parsed as data; the analyzer does not execute submitted code.
- Remote repository analysis, commit history, and similar-repository discovery depend on GitHub availability and rate limits. `GITHUB_TOKEN` is optional for public repositories and required for private repositories.
- Explanations use the local deterministic summary by default. OpenAI and local-model options require their respective integrations and report failures rather than silently switching providers.
- Static relationships and path-based subsystem groupings are not runtime traces, security assessments, or measured performance metrics.

---

## 7. License

This repository does not currently contain a LICENSE file; no license is asserted here.
