# ElDevo Tool Status

The active registry is the only public tool surface. A tool is active only when it has a real executor and automated execution coverage. Partial or unsafe implementations are intentionally excluded rather than presented as complete.

## Status definitions

- **REAL** — active, executable implementation with automated tests.
- **PARTIAL** — not allowed in the active registry; must be completed or moved to unsupported.
- **UNSUPPORTED** — intentionally excluded because the current browser/static architecture cannot provide the advertised behavior safely and honestly.

## Explicitly unsupported / partial capabilities

| Tool | Status | Reason |
|---|---|---|
| HTTP Status Code Checker | UNSUPPORTED | Safe remote HTTP checking needs CORS-aware server support and SSRF protections. |
| MD5 Generator | UNSUPPORTED | Legacy checksum can be added later with a security warning; it is not a security primitive. |
| Regex Generator | UNSUPPORTED | No deterministic generator is currently exposed. |
| QR Code Generator | UNSUPPORTED | Requires a real QR encoder and binary/image output contract. |
| Image → Base64 | UNSUPPORTED | Requires file/Blob input UI. |
| Base64 → Image | UNSUPPORTED | Requires binary/image output UI. |
| Image Resizer | UNSUPPORTED | Requires Canvas/File UI. |
| Image Cropper | UNSUPPORTED | Requires interactive image UI. |
| Image Compressor | UNSUPPORTED | Requires Canvas/Blob output handling. |
| JPG → PNG | UNSUPPORTED | Requires binary image output UI. |
| PNG → JPG | UNSUPPORTED | Requires binary image output UI. |
| WebP Converter | UNSUPPORTED | Requires binary image output UI. |
| Favicon Generator | UNSUPPORTED | Requires multi-size image output and packaging. |
| CSS Formatter | UNSUPPORTED | Regex formatting is unsafe for CSS strings/comments; an AST parser is required. |
| CSS Minifier | UNSUPPORTED | Regex minification can corrupt strings/comments. |
| JavaScript Formatter | UNSUPPORTED | Requires an AST formatter to safely handle strings, regex literals and template literals. |
| JavaScript Minifier | UNSUPPORTED | Regex minification is not a JavaScript parser. |
| HTML Formatter | UNSUPPORTED | Requires a real HTML parser/serializer for correctness. |
| HTML Minifier | UNSUPPORTED | Regex minification can change text/attribute semantics. |
| HTML Validator | UNSUPPORTED | Current browser parser wrapper does not expose a complete conformance validator. |
| HTML → Markdown | UNSUPPORTED | Current conversion is only a partial tag mapping. |
| Markdown → HTML | UNSUPPORTED | Current conversion is not a complete Markdown implementation. |
| JSONPath Tester | UNSUPPORTED | Existing implementation is a subset and is not labelled as such. |
| JSON Schema Generator | UNSUPPORTED | Current generator only models shallow property types. |
| JSON Schema Validator | UNSUPPORTED | Current validator supports only a small subset of JSON Schema. |
| XML → JSON | UNSUPPORTED | Current parser does not preserve attributes/namespaces completely. |
| Breadcrumb Schema Generator | UNSUPPORTED | A complete BreadcrumbList needs item/name/position semantics, not generic WebPage fields. |
| Internal Link Analyzer | UNSUPPORTED | Current extractor does not reliably classify internal vs external links without a page-origin contract. |
| Cron Humanizer | UNSUPPORTED | Current output is only human-readable for a narrow subset of cron expressions. |

## QA source of truth

`src/lib/tools/status.ts` is the single unsupported-capability policy. `src/lib/tool-registry.ts` derives the active registry from that policy. `src/lib/tools/executor.ts` is the active execution facade and `src/lib/tools/real-engine.ts` contains the remaining real browser-safe implementations. `tests/tools.test.mjs` executes every active registry entry against a contract fixture and checks security-critical vectors.
