# ElDevo rebuild notes

This is a rebuild of the existing ElDevo Next.js project, not a separate app.

## Fixed

- Removed stale Vite/Lovable/TanStack project files.
- Replaced the monolithic, hard-to-maintain workspace implementation with typed, readable client-side logic.
- Added a central tool registry and relevance-ranked search.
- Added category filtering, Favorites and Recently Used tools using localStorage.
- Added global Command Palette with Ctrl/Cmd+K and keyboard navigation.
- Improved CodeMirror with JSON/HTML/SQL language modes, line wrapping, folding and keyboard maps, loaded dynamically.
- Added CSV delimiter controls and Cron presets.
- Added better JWT expiration status and timestamp display.
- Added PWA manifest and service-worker registration.
- Added static offline-friendly service worker shell.
- Added canonical metadata to legal/listing pages.
- Improved JSON-LD and per-tool metadata.
- Fixed `npm run lint` to use ESLint directly.
- Added a static `serve out` production helper.
- Updated Next.js from 15.5.0 to the patched 15.5 maintenance release used by this rebuild.

## Validation note

The source was statically inspected in this environment. A full dependency install/build could not be completed here because the npm registry was not reachable long enough to install the project dependencies. On the user's machine, run:

```bash
npm install
npm run lint
npm run build
npm start
```

Then run `npm audit` and review any remaining advisories individually; do not use `npm audit fix --force` blindly.
