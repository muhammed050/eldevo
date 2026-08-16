# ElDevo

Privacy-first developer micro-tools built with Next.js App Router, TypeScript and static export.

## Stack

- Next.js 15 App Router
- TypeScript strict mode
- Tailwind CSS v4
- CodeMirror via `@uiw/react-codemirror`
- Client-side processing with dynamic imports for heavy parsers
- Static export for `eldevo.com`
- PWA service worker for an offline-friendly shell

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production static build

```bash
npm run build
npm start
```

`npm run build` creates the static `out/` directory. The `start` script serves that directory locally.

## Validation

```bash
npm run lint
npm run build
npm audit
```

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

## Architecture

Tool metadata lives in `src/config/tools.config.ts`. Search, categories, favorites and recent tools use `src/lib/tool-registry.ts`. Tool execution is centralized in a typed client-side workspace while heavy conversion libraries are dynamically imported.
