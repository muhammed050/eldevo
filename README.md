# ElDevo

Privacy-first developer micro-tools built with Next.js App Router, TypeScript and static export.

## Quality contract

ElDevo does not use a generic success fallback for tools. An active tool must be connected to a real executor, return a real result or a clear execution error, and be covered by automated tests. Capabilities that cannot be implemented safely in the current browser/static architecture are explicitly marked unsupported and excluded from the active registry, search, generated tool pages and sitemap.

## Stack

- Next.js 15 App Router
- TypeScript strict mode
- Tailwind CSS v4
- CodeMirror via `@uiw/react-codemirror`
- Client-side Web APIs for local processing
- Static export for `eldevo.com`
- PWA service worker for an offline-friendly shell

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification commands

```bash
npm run validate-tools
npm run typecheck
npm run lint
npm test
npm run test:tools
npm run test:coverage
npm run build
```

`npm test` runs the real Node test suite. It is not an alias for registry validation.

## Tool architecture

The execution path is:

`Tool metadata → typed ToolDefinition → real executor → registry → UI → SEO pages`

`src/lib/tool-registry.ts` is the public source for active tool definitions. Every active entry exposes a typed executor and validator. Unsupported capabilities are excluded before they reach search/navigation/page generation.

The real execution engine is `src/lib/tools/real-engine.ts`. The test suite in `tests/tools.test.mjs` executes actual tool functions, includes security vectors and runs a smoke test for every active registry entry.

## Unsupported capabilities

The current static/browser build intentionally excludes image file converters, QR generation, HTTP status checking, MD5, and regex generation where the current UI or security model cannot provide the advertised behavior honestly. See `docs/tool-status.md` for the exact list and rationale.

## Security

- Security-sensitive randomness uses Web Crypto rather than `Math.random()`.
- `eval()` and `new Function()` are not part of the tool execution path.
- User-provided HTML is treated as data in the workspace; generated output is rendered as text.
- No remote URL fetch/proxy is exposed by the static tool engine, avoiding an SSRF surface.
- JWT decoding is explicitly not signature verification.

## Privacy model

Tool input is processed in the browser. The application does not use a backend API or database to process tool content.

## Routes

- `/`
- `/tools/`
- `/tools/[slug]/`
- `/converters/`
- `/converters/[slug]/`
- `/cheatsheets/`
- `/cheatsheets/[slug]/`
- legal pages

## CI

`.github/workflows/ci.yml` runs on pushes and pull requests and requires dependency installation, tool validation, TypeScript, ESLint, the real test suite, and the production build to pass.
