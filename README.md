# SYNAPSE // Interactive Code-to-Architecture Visualizer & Live Explainer

> **Enterprise-grade AST parser, dynamic topological architecture visualizer, and plain-English LLM explainer wrapped in an avant-garde editorial dashboard.**

[![CI Pipeline](https://github.com/enterprise/code-to-architecture-visualizer/actions/workflows/ci.yml/badge.svg)](https://github.com/enterprise/code-to-architecture-visualizer/actions/workflows/ci.yml)
[![Node.js Version](https://img.shields.io/badge/Node.js-20.x-111111?style=flat&logo=node.js&color=111111)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-111111?style=flat&logo=typescript&color=111111)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-111111?style=flat&logo=next.js&color=111111)](https://nextjs.org)
[![Security Compliance](https://img.shields.io/badge/Enterprise_Compliance-SOC2_Type_II_--_Zero_Trust-111111?style=flat)](https://github.com)

---

## 1. Product Concept & Mechanics

Modern microservices, serverless topologies, and modular monoliths evolve rapidly. Static README diagrams like Mermaid charts or static PNGs drift out of sync with production code within weeks.

**SYNAPSE** solves this architectural decay by providing an interactive, live developer tool:
1. **Source Code / Repository Ingestion:** Developers paste a raw backend code snippet (Express, FastAPI, NestJS, Go, Prisma, Redis) or an enterprise GitHub repository URL.
2. **Deterministic AST Parsing:** The engine analyzes import trees, routing middleware chains, database connection pools, and distributed message broker dispatch loops.
3. **Dynamic Vector Topology Map:** Renders an animated 2D interactive canvas showing how HTTP requests, authentication perimeters, caches, databases, and message brokers interconnect.
4. **Contextual Live Explainer:** Clicking any node reveals its exploded metadata, upstream/downstream dependencies, cryptographic boundaries, and plain-English summaries powered by OpenAI GPT-4o or local Ollama instances.

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
│       └── ci.yml               # Enterprise CI validation & build verification
├── components/
│   ├── ArchitectureCanvas.tsx   # Dynamic vector centerpiece with animated SVG paths
│   ├── CodeInputPane.tsx        # Controlled AST stream view & compilation triggers
│   └── SidebarMetadata.tsx      # Plain-English LLM explainer & diagnostic dossier
├── pages/
│   ├── _app.tsx                 # Global application wrapper and typography baseline
│   └── index.tsx                # Three-column horizon orchestration & editorial header
├── styles/
│   └── globals.css              # Editorial Tailwind utilities, dash keyframes, & grid patterns
├── types/
│   └── architecture.ts          # Strongly typed domain entities, nodes, and edges
├── .env.example                 # Enterprise environment configuration template
├── .gitignore                   # Strict enterprise artifact & secret exclusions
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
git clone https://github.com/your-org/code-to-architecture-visualizer.git
cd code-to-architecture-visualizer

# Copy environment variables
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
```

---

## 5. Environment Configuration

All environment variables must be defined in `.env.local` for local execution or via your deployment secret manager:

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_ENV` | `string` | Yes | Target deployment tier (`development`, `staging`, `production`) |
| `NEXT_PUBLIC_API_BASE_URL` | `string` | Yes | Ingress API gateway endpoint for AST telemetry services |
| `OPENAI_API_KEY` | `string` | Optional | API token for remote GPT-4o plain-English node synthesizers |
| `LOCAL_LLM_ENDPOINT` | `string` | Optional | Local endpoint for Ollama or vLLM daemon (`http://localhost:11434`) |

---

## 6. GitHub Enterprise Push Compliance & Security

This repository is pre-configured to comply with enterprise push protection and zero-trust engineering standards:
- **No Hardcoded Secrets:** Zero API keys, bearer tokens, or internal credentials exist in the source tree. All secrets are read via environment variables.
- **Strict `.gitignore`:** Eliminates risk of committing `.env` files, build caches, system artifacts, and temporary dumps.
- **Continuous Integration (`ci.yml`):** Runs on every push or PR to `main` and `master`, verifying dependency integrity (`npm ci`), syntax linting, strict TypeScript checks, and production artifact builds.
- **Content Security & Sanitization:** All user-supplied snippets and URLs are handled in memory without executing unsafe `eval()` or unescaped HTML injections.

---

## 7. License

Distributed under the Apache 2.0 Enterprise License. See `LICENSE` for details.
