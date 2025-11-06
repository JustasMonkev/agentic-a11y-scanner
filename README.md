# Multi-Agent Accessibility Scanner

This project pairs a Next.js App Router frontend with a LangChain-powered multi-agent system that performs end-to-end web accessibility audits. Users submit a URL through the UI, the orchestrator spins up specialized agents to explore the site, and the app renders actionable, prioritized findings.

## Architecture

- **Agent Orchestration**  
  `src/lib/multi-agent-orchestrator.ts` coordinates three agent types: a Discovery Agent that maps high-value pages, several Page Scanner Agents that analyze those pages in parallel, and a Summarizer Agent that aggregates violations into a single report. Agent prompts are defined in `src/lib/agent-prompts.ts`, while `src/lib/agent.ts` wires up shared LangChain tooling.
- **Next.js Interface**  
  The App Router entrypoint lives in `src/app`, with `layout.tsx` and `page.tsx` hosting the scanner experience. UI elements such as the submission form, progress indicators, and results renderer reside under `src/components`.
- **MCP Integrations**  
  `src/lib/mcp-client.ts` configures Model Context Protocol access. The current setup mocks tool calls but provides the contract needed to connect to a real MCP server.
- **Shared Types & Utilities**  
  Domain models sit in `src/lib/types.ts` and `src/lib/multi-agent-types.ts`, ensuring the backend orchestrator and frontend renderer keep a consistent shape.

Consult `MULTI_AGENT_ARCHITECTURE.md` for sequence diagrams, prompt snippets, and deep dives into agent responsibilities.

## Tech Stack

- Next.js 16 App Router with React 19 and TypeScript
- Tailwind CSS (via `globals.css`) with `@tailwindcss/typography`
- LangChain core abstractions plus `@langchain/openai` and MCP adapters
- Vitest for unit testing and coverage
- Biome for linting and formatting

## Directory Layout

```
src/
├─ app/                # Next.js entrypoint (layout, page, global styles)
├─ components/         # Client-side UI and shared view primitives
└─ lib/                # Agent orchestration, prompts, MCP client, types
public/                # Static assets (icons, favicons, OG images)
```

Configuration lives at the repo root (`biome.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `vitest.config.ts`).

## Development Workflow

Ensure Node.js 20+ is installed, then install dependencies:

```bash
npm install
```

Common tasks:

- `npm run dev` – start the Next.js dev server at http://localhost:3000
- `npm run build` – produce a production build and surface type errors
- `npm run start` – serve the compiled build locally
- `npm run lint` / `npm run format` – run or fix Biome checks
- `npm test` / `npm run test:ui` / `npm run test:coverage` – execute Vitest in batch, interactive, or coverage modes

## Testing & Quality

- Place unit tests in `src/lib/__tests__` or `src/components/__tests__`.
- Multi-agent orchestration scenarios already have coverage in `src/lib/__tests__/multi-agent-orchestrator.test.ts`; add cases when expanding agent behavior.
- Document manual smoke tests (forms, scanning flow) before shipping behavioural changes.

## Environment & Secrets

- Store API keys such as `OPENAI_API_KEY` in `.env`; never commit environment files.
- When integrating a real MCP server, update `src/lib/mcp-client.ts` with connection details and document any new requirements.

