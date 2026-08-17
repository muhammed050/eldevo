# ElDevo Tool Status

This document is generated from the active registry policy and the real execution engine. An active tool must execute a real operation; unsupported capabilities are intentionally excluded from the public tool registry.

## Status definitions

- **REAL** — active, executable implementation with automated execution tests.
- **PARTIAL** — not acceptable for the active registry; any such tool must be removed or explicitly scoped before publication.
- **UNSUPPORTED** — intentionally excluded because the current browser/static architecture cannot provide the advertised behavior safely and honestly.

## Current unsupported capabilities

| Tool | Status | Implementation | Tests | Notes |
|---|---|---|---|---|
| HTTP Status Code Checker | UNSUPPORTED | none in active UI | rejection test | Browser CORS/SSRF concerns require a hardened server-side design. |
| MD5 Generator | UNSUPPORTED | none in active UI | rejection test | Can be added later as a clearly labelled legacy checksum, never as a security primitive. |
| Regex Generator | UNSUPPORTED | none in active UI | rejection test | No deterministic generator is currently exposed. |
| QR Code Generator | UNSUPPORTED | none in active UI | rejection test | Requires a real QR encoder/library and output test. |
| Image → Base64 | UNSUPPORTED | none in active UI | rejection test | Requires file/Blob UI contract rather than text workspace. |
| Base64 → Image | UNSUPPORTED | none in active UI | rejection test | Requires binary/image output UI. |
| Image Resizer | UNSUPPORTED | none in active UI | rejection test | Requires Canvas/File UI contract. |
| Image Cropper | UNSUPPORTED | none in active UI | rejection test | Requires interactive image UI. |
| Image Compressor | UNSUPPORTED | none in active UI | rejection test | Requires Canvas/Blob output UI. |
| JPG → PNG | UNSUPPORTED | none in active UI | rejection test | Requires binary image output UI. |
| PNG → JPG | UNSUPPORTED | none in active UI | rejection test | Requires binary image output UI. |
| WebP Converter | UNSUPPORTED | none in active UI | rejection test | Requires Canvas/Blob output UI. |
| Favicon Generator | UNSUPPORTED | none in active UI | rejection test | Requires image output and multi-size packaging. |

## Active tools

The active matrix is intentionally generated from the TypeScript registry during CI rather than maintained as a second hand-written list. `npm run validate-tools` imports the registry, verifies the status boundary, and executes every active tool against a public example fixture.

See the test suite in `tests/tools.test.mjs` for real execution tests and security-critical vectors.
