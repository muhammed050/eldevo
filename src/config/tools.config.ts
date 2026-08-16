export type FAQ = { q: string; a: string };
export type ToolMeta = {
  slug: string;
  title: string;
  h1: string;
  category: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  searchIntent: string;
  description: string;
  features: string[];
  usageSteps: string[];
  codeExample: { input: string; output: string };
  faqs: FAQ[];
  related: string[];
};

export const tools: ToolMeta[] = [
  {
    slug: "json-formatter",
    title: "JSON Formatter & Validator",
    h1: "Free Online JSON Formatter & Validator",
    category: "JSON",
    primaryKeyword: "json formatter",
    secondaryKeywords: ["json validator", "json beautifier", "json minifier"],
    searchIntent: "Format, validate and minify JSON instantly in your browser.",
    description:
      "Fast browser-based JSON formatter and validator with precise syntax errors. Your JSON never leaves this device.",
    features: [
      "Native JSON.parse validation",
      "2 or 4 space indentation",
      "Minify and copy output",
      "Upload and download .json files",
    ],
    usageSteps: [
      "Paste JSON or load a .json file.",
      "Choose 2 or 4 spaces, or minify the result.",
      "Fix any highlighted line and column error.",
      "Copy or download the formatted JSON.",
    ],
    codeExample: {
      input: '{"name":"ElDevo","private":true}',
      output: '{\n  "name": "ElDevo",\n  "private": true\n}',
    },
    faqs: [
      {
        q: "Is this JSON formatter private?",
        a: "Yes. Parsing and formatting happen in your browser. No JSON payload is uploaded to ElDevo.",
      },
      {
        q: "Can I minify JSON?",
        a: "Yes. Use Minify to remove insignificant whitespace while preserving the JSON structure.",
      },
      {
        q: "Does it show JSON syntax errors?",
        a: "Yes. The parser error is displayed with a best-effort line and column location.",
      },
      {
        q: "Can I format a JSON file?",
        a: "Yes. Use Upload File to load a local .json file, then download the formatted result.",
      },
    ],
    related: [
      "/tools/jwt-decoder/",
      "/converters/json-to-yaml/",
      "/tools/sql-formatter/",
      "/tools/regex-tester/",
    ],
  },
  {
    slug: "jwt-decoder",
    title: "JWT Decoder",
    h1: "Free Online JWT Decoder",
    category: "Security",
    primaryKeyword: "jwt decoder",
    secondaryKeywords: ["jwt decoder online", "decode jwt", "jwt payload viewer"],
    searchIntent: "Inspect JWT header, payload and timestamp claims without uploading the token.",
    description:
      "Decode JSON Web Tokens entirely in your browser. Inspect header, payload, expiration and signature status without verification or server uploads.",
    features: [
      "Header and payload decoding",
      "Human-readable exp/iat timestamps",
      "Signature presence/status indicator",
      "No token upload",
    ],
    usageSteps: [
      "Paste a JWT into the token field.",
      "Inspect the decoded header and payload.",
      "Review expiration and issued-at timestamps.",
      "Remember that decoding is not signature verification.",
    ],
    codeExample: {
      input: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.…",
      output: 'Header: { "alg": "HS256", "typ": "JWT" }',
    },
    faqs: [
      {
        q: "Does decoding verify a JWT signature?",
        a: "No. This tool decodes the token locally. It does not possess your signing key and does not cryptographically verify the signature.",
      },
      {
        q: "Can I decode an expired JWT?",
        a: "Yes. The payload is still decoded, and the expiration status is shown separately.",
      },
      { q: "Is my JWT uploaded?", a: "No. Token processing is performed in the browser." },
      {
        q: "What do exp and iat mean?",
        a: "exp is the expiration time and iat is the issued-at time, both normally represented as Unix seconds.",
      },
    ],
    related: [
      "/tools/base64-encode-decode/",
      "/tools/json-formatter/",
      "/tools/regex-tester/",
      "/converters/json-to-typescript/",
    ],
  },
  {
    slug: "cron-expression-generator",
    title: "Cron Expression Generator",
    h1: "Free Online Cron Expression Generator",
    category: "Utilities",
    primaryKeyword: "cron expression generator",
    secondaryKeywords: ["cron parser", "cron humanizer", "crontab generator"],
    searchIntent: "Generate, humanize and validate five- or six-field cron expressions.",
    description:
      "Build cron schedules interactively, translate them to plain English and preview the next five run times locally.",
    features: [
      "5 and 6 field expressions",
      "Plain-English humanizer",
      "Next five run times",
      "Preset schedules",
    ],
    usageSteps: [
      "Edit each cron field or choose a preset.",
      "Read the plain-English interpretation.",
      "Review the next five scheduled times.",
      "Copy the expression into cron or Kubernetes.",
    ],
    codeExample: { input: "*/15 * * * *", output: "Every 15 minutes" },
    faqs: [
      {
        q: "What are the five cron fields?",
        a: "Minute, hour, day of month, month and day of week. A six-field form can include seconds as the leading field.",
      },
      {
        q: "Does it support Kubernetes CronJobs?",
        a: "Yes. Kubernetes uses standard five-field cron schedules.",
      },
      { q: "What timezone are upcoming runs shown in?", a: "Your browser's local timezone." },
      {
        q: "Can I use ranges and lists?",
        a: "Yes. Standard cron ranges, lists, steps and wildcards are supported by the parser.",
      },
    ],
    related: [
      "/tools/json-formatter/",
      "/cheatsheets/docker-cheat-sheet/",
      "/tools/regex-tester/",
      "/converters/json-to-yaml/",
    ],
  },
  {
    slug: "base64-encode-decode",
    title: "Base64 Encoder / Decoder",
    h1: "Free Online Base64 Encoder & Decoder",
    category: "Encoding",
    primaryKeyword: "base64 encode decode",
    secondaryKeywords: ["base64 decoder online", "base64 encoder", "url safe base64"],
    searchIntent: "Encode Unicode text to Base64 or decode Base64 back to text.",
    description:
      "UTF-8 safe Base64 encoding and decoding with optional URL-safe alphabet. Everything happens locally.",
    features: [
      "Unicode and UTF-8 support",
      "Encode and decode modes",
      "URL-safe Base64",
      "Download output",
    ],
    usageSteps: [
      "Choose Encode or Decode.",
      "Paste text or a Base64 value.",
      "Enable URL-safe mode when needed.",
      "Copy or download the result.",
    ],
    codeExample: { input: "ElDevo", output: "RWxEZXZv" },
    faqs: [
      { q: "Is Base64 encryption?", a: "No. Base64 is reversible encoding, not encryption." },
      {
        q: "Does it support Unicode?",
        a: "Yes. Text is converted through UTF-8 bytes before encoding.",
      },
      {
        q: "What is URL-safe Base64?",
        a: "It replaces + and / with URL-safe characters and can omit padding.",
      },
      {
        q: "Does decoding send my data anywhere?",
        a: "No. Conversion runs entirely in the browser.",
      },
    ],
    related: [
      "/tools/jwt-decoder/",
      "/tools/json-formatter/",
      "/tools/regex-tester/",
      "/converters/csv-to-json/",
    ],
  },
  {
    slug: "regex-tester",
    title: "Regex Tester",
    h1: "Free Online Regex Tester & Debugger",
    category: "Utilities",
    primaryKeyword: "regex tester",
    secondaryKeywords: ["regex online tester", "javascript regex tester", "regex debugger"],
    searchIntent: "Test JavaScript regular expressions against sample text.",
    description:
      "Test JavaScript regex patterns live, inspect matches and capture groups, and get safe syntax errors without sending text to a server.",
    features: [
      "Live match results",
      "Flags g, i, m, s, u, y",
      "Capture groups and indexes",
      "Invalid-pattern error handling",
    ],
    usageSteps: [
      "Enter a JavaScript regex pattern.",
      "Choose the flags you need.",
      "Paste the test text.",
      "Inspect matches and capture groups.",
    ],
    codeExample: { input: "^hello", output: "Matches: hello" },
    faqs: [
      {
        q: "Which regex engine is used?",
        a: "The browser's native JavaScript RegExp engine is used.",
      },
      { q: "Does the tool send my text to a server?", a: "No. Matching is local to your browser." },
      {
        q: "Can I test capture groups?",
        a: "Yes. Each match shows numbered and named captures when available.",
      },
      {
        q: "Why is my regex invalid?",
        a: "The browser rejects unsupported syntax or malformed patterns and the error is shown instead of crashing the page.",
      },
    ],
    related: [
      "/tools/json-formatter/",
      "/tools/base64-encode-decode/",
      "/tools/sql-formatter/",
      "/tools/jwt-decoder/",
    ],
  },
  {
    slug: "sql-formatter",
    title: "SQL Formatter",
    h1: "Free Online SQL Formatter",
    category: "SQL",
    primaryKeyword: "sql formatter",
    secondaryKeywords: ["sql beautifier", "format sql online", "sql pretty printer"],
    searchIntent: "Format SQL queries for readability in the browser.",
    description:
      "Pretty-print SQL with selectable dialects, consistent keyword casing and instant local formatting.",
    features: [
      "Multiple SQL dialects",
      "Uppercase keywords",
      "Instant local formatting",
      "Copy and download",
    ],
    usageSteps: [
      "Paste raw SQL.",
      "Select the SQL dialect.",
      "Copy or download the formatted query.",
      "Adjust and reformat as needed.",
    ],
    codeExample: {
      input: "select id,name from users where active=1",
      output: "SELECT id,\n       name\nFROM users\nWHERE active = 1",
    },
    faqs: [
      {
        q: "Which SQL dialects are available?",
        a: "Common options include PostgreSQL, MySQL, SQLite, MariaDB, BigQuery and Transact-SQL.",
      },
      { q: "Does formatting execute my SQL?", a: "No. The tool only parses and formats text." },
      {
        q: "Can I format multiple statements?",
        a: "Yes, provided the selected dialect parser accepts them.",
      },
      { q: "Is my SQL private?", a: "Yes. SQL formatting occurs in your browser." },
    ],
    related: [
      "/tools/json-formatter/",
      "/tools/regex-tester/",
      "/converters/csv-to-json/",
      "/tools/jwt-decoder/",
    ],
  },

  {
    slug: "url-parser",
    title: "URL Parser & Encoder",
    h1: "Free Online URL Parser & Encoder",
    category: "Web",
    primaryKeyword: "url parser",
    secondaryKeywords: ["url encoder", "url decoder", "parse url"],
    searchIntent: "Inspect, encode and decode URLs locally.",
    description:
      "Parse URLs into protocol, host, path, query and hash components, or encode/decode URL text in your browser.",
    features: [
      "URL component breakdown",
      "Encode and decode",
      "Query parameter inspection",
      "100% client-side",
    ],
    usageSteps: [
      "Paste a URL or URL component text.",
      "Choose Parse, Encode or Decode.",
      "Inspect the structured result.",
      "Copy or download the result.",
    ],
    codeExample: {
      input: "https://example.com/users?id=42#profile",
      output: "protocol: https:\nhost: example.com\npath: /users\nquery: ?id=42\nhash: #profile",
    },
    faqs: [
      {
        q: "Can it parse query parameters?",
        a: "Yes. The parser lists each query parameter and its decoded value.",
      },
      {
        q: "Does URL encoding modify the whole URL?",
        a: "The encoder treats the supplied text as a URL component, so reserved characters are escaped safely.",
      },
      { q: "Is the URL sent to a server?", a: "No. URL processing happens in the browser." },
      {
        q: "Does it support relative URLs?",
        a: "The encoder/decoder does; full parsing requires an absolute URL.",
      },
    ],
    related: [
      "/tools/base64-encode-decode/",
      "/tools/timestamp-converter/",
      "/tools/html-entity-encoder/",
    ],
  },
  {
    slug: "timestamp-converter",
    title: "Unix Timestamp Converter",
    h1: "Free Online Unix Timestamp Converter",
    category: "Utilities",
    primaryKeyword: "unix timestamp converter",
    secondaryKeywords: ["epoch converter", "timestamp to date", "date to timestamp"],
    searchIntent: "Convert Unix timestamps and dates instantly.",
    description:
      "Convert Unix seconds or milliseconds to readable dates and convert ISO/local dates back to Unix timestamps.",
    features: [
      "Seconds and milliseconds",
      "ISO date support",
      "Local and UTC views",
      "Live current timestamp",
    ],
    usageSteps: [
      "Enter a Unix timestamp or ISO date.",
      "Choose seconds or milliseconds when converting a timestamp.",
      "Review UTC and local time.",
      "Copy the result.",
    ],
    codeExample: { input: "1704067200", output: "UTC: 2024-01-01T00:00:00.000Z" },
    faqs: [
      { q: "What is Unix time?", a: "Unix time counts elapsed seconds from 1970-01-01T00:00:00Z." },
      {
        q: "Does it support milliseconds?",
        a: "Yes. You can explicitly select seconds or milliseconds.",
      },
      {
        q: "Are dates processed locally?",
        a: "Yes. JavaScript Date runs locally in your browser.",
      },
      {
        q: "Can I convert an ISO date?",
        a: "Yes. Enter an ISO-8601 date and select Date → Timestamp.",
      },
    ],
    related: ["/tools/cron-expression-generator/", "/tools/url-parser/", "/tools/uuid-generator/"],
  },
  {
    slug: "uuid-generator",
    title: "UUID Generator",
    h1: "Free Online UUID v4 Generator",
    category: "Utilities",
    primaryKeyword: "uuid generator",
    secondaryKeywords: ["uuid v4 generator", "guid generator", "random uuid"],
    searchIntent: "Generate cryptographically strong UUID v4 identifiers locally.",
    description:
      "Generate one or many UUID v4 identifiers using the browser's crypto.randomUUID API when available.",
    features: ["UUID v4", "Bulk generation", "Crypto-based randomness", "No server requests"],
    usageSteps: [
      "Choose how many UUIDs you need.",
      "Generate the identifiers.",
      "Copy the list or download it.",
      "Use the IDs in your application.",
    ],
    codeExample: { input: "Generate 3 UUIDs", output: "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" },
    faqs: [
      {
        q: "Are these UUID v4 values?",
        a: "Yes. Generation uses the browser's UUID v4 implementation.",
      },
      { q: "Can I generate multiple UUIDs?", a: "Yes, choose a quantity and generate a batch." },
      {
        q: "Are UUIDs predictable?",
        a: "The browser API is designed for random UUID generation; it is not a substitute for a dedicated cryptographic protocol.",
      },
      { q: "Is generation private?", a: "Yes. UUIDs are generated locally." },
    ],
    related: ["/tools/hash-generator/", "/tools/timestamp-converter/", "/tools/json-formatter/"],
  },
  {
    slug: "hash-generator",
    title: "Hash Generator",
    h1: "Free Online SHA Hash Generator",
    category: "Security",
    primaryKeyword: "sha256 hash generator",
    secondaryKeywords: ["sha256 online", "sha1 hash generator", "sha512 hash"],
    searchIntent: "Generate cryptographic hashes from text locally.",
    description:
      "Calculate SHA-1, SHA-256, SHA-384 and SHA-512 hashes with the browser Web Crypto API.",
    features: ["SHA-1 / 256 / 384 / 512", "Web Crypto API", "UTF-8 text support", "No uploads"],
    usageSteps: [
      "Enter text.",
      "Select a hash algorithm.",
      "Generate the digest.",
      "Copy the hexadecimal hash.",
    ],
    codeExample: { input: "ElDevo", output: "SHA-256 → local browser digest" },
    faqs: [
      {
        q: "Is hashing encryption?",
        a: "No. A cryptographic hash is designed to be one-way and is not decrypted like ciphertext.",
      },
      {
        q: "Which algorithms are supported?",
        a: "The browser Web Crypto API commonly provides SHA-1, SHA-256, SHA-384 and SHA-512.",
      },
      { q: "Is my input uploaded?", a: "No. The digest is calculated locally." },
      {
        q: "Can I hash files?",
        a: "The current tool focuses on text; file hashing can be added without a server by reading the file locally.",
      },
    ],
    related: ["/tools/uuid-generator/", "/tools/base64-encode-decode/", "/tools/jwt-decoder/"],
  },
  {
    slug: "html-entity-encoder",
    title: "HTML Entity Encoder / Decoder",
    h1: "Free Online HTML Entity Encoder & Decoder",
    category: "Encoding",
    primaryKeyword: "html entity encoder",
    secondaryKeywords: ["html entity decoder", "html escape online", "escape html"],
    searchIntent: "Escape or decode HTML entities locally.",
    description:
      "Encode special characters such as &, < and > into HTML entities, or decode entities back to readable text.",
    features: [
      "Encode HTML text",
      "Decode entities",
      "Safe text transformation",
      "Client-side processing",
    ],
    usageSteps: [
      "Paste HTML or text.",
      "Choose Encode or Decode.",
      "Review the transformed output.",
      "Copy the result.",
    ],
    codeExample: {
      input: "<div>Hello & welcome</div>",
      output: "&lt;div&gt;Hello &amp; welcome&lt;/div&gt;",
    },
    faqs: [
      {
        q: "Does encoding sanitize HTML?",
        a: "It escapes characters for display but should not be treated as a complete security sanitizer.",
      },
      {
        q: "Can it decode numeric entities?",
        a: "Yes. Browser DOM parsing handles common named and numeric entities.",
      },
      { q: "Does it preserve Unicode?", a: "Yes." },
      { q: "Is the content sent anywhere?", a: "No." },
    ],
    related: ["/tools/url-parser/", "/tools/base64-encode-decode/", "/tools/regex-tester/"],
  },
  {
    slug: "number-base-converter",
    title: "Number Base Converter",
    h1: "Free Online Binary, Decimal, Hex & Octal Converter",
    category: "Utilities",
    primaryKeyword: "number base converter",
    secondaryKeywords: ["binary converter", "hex converter", "decimal to binary"],
    searchIntent: "Convert integers between binary, decimal, hexadecimal and octal.",
    description:
      "Convert integer values between common number bases with validation and optional prefixes.",
    features: [
      "Binary / octal / decimal / hex",
      "Prefix detection",
      "Large integer support with BigInt",
      "Instant conversion",
    ],
    usageSteps: [
      "Choose the source base.",
      "Enter an integer.",
      "Select the target bases.",
      "Copy the converted values.",
    ],
    codeExample: { input: "255", output: "BIN 11111111\nOCT 377\nHEX FF" },
    faqs: [
      {
        q: "Does it support hexadecimal?",
        a: "Yes. Binary, octal, decimal and hexadecimal are supported.",
      },
      {
        q: "Can it handle large integers?",
        a: "Yes. The implementation uses BigInt where supported.",
      },
      { q: "Are fractions supported?", a: "This tool focuses on integer conversion." },
      { q: "Is conversion local?", a: "Yes." },
    ],
    related: ["/tools/timestamp-converter/", "/tools/url-parser/", "/tools/hash-generator/"],
  },
  {
    slug: "html-formatter",
    title: "HTML Formatter",
    h1: "Free Online HTML Formatter & Beautifier",
    category: "Web",
    primaryKeyword: "html formatter",
    secondaryKeywords: ["html beautifier", "format html online", "pretty html"],
    searchIntent: "Format HTML markup for readability.",
    description:
      "Beautify HTML documents locally with readable indentation and browser-native parsing.",
    features: ["Indentation", "Browser-native parsing", "No server upload", "Copy and download"],
    usageSteps: [
      "Paste HTML.",
      "Format the markup.",
      "Review the indented output.",
      "Copy or download it.",
    ],
    codeExample: {
      input: "<div><h1>Hello</h1><p>World</p></div>",
      output: "<div>\n  <h1>Hello</h1>\n  <p>World</p>\n</div>",
    },
    faqs: [
      { q: "Does it execute HTML?", a: "No. It treats HTML as text and formats the markup." },
      { q: "Can I use it for large snippets?", a: "Yes, within normal browser memory limits." },
      { q: "Is formatting local?", a: "Yes." },
      {
        q: "Will it preserve scripts?",
        a: "Script contents are treated as text, but complex malformed markup may not round-trip exactly.",
      },
    ],
    related: ["/tools/json-formatter/", "/tools/regex-tester/", "/tools/html-entity-encoder/"],
  },
  {
    slug: "text-case-converter",
    title: "Text Case Converter",
    h1: "Free Online Text Case Converter",
    category: "Utilities",
    primaryKeyword: "text case converter",
    secondaryKeywords: [
      "uppercase lowercase converter",
      "camel case converter",
      "snake case converter",
    ],
    searchIntent: "Convert developer text between common naming and writing cases.",
    description:
      "Transform text into uppercase, lowercase, Title Case, camelCase, PascalCase, snake_case and kebab-case.",
    features: [
      "7 case styles",
      "Whitespace normalization",
      "Developer naming cases",
      "Instant local conversion",
    ],
    usageSteps: [
      "Paste text.",
      "Choose a case style.",
      "Review the converted text.",
      "Copy the result.",
    ],
    codeExample: { input: "hello world from eldevo", output: "helloWorldFromEldevo" },
    faqs: [
      {
        q: "Which cases are supported?",
        a: "Uppercase, lowercase, Title Case, camelCase, PascalCase, snake_case and kebab-case.",
      },
      {
        q: "Does it preserve punctuation?",
        a: "It focuses on word-based transformations, so punctuation may be normalized.",
      },
      { q: "Is text uploaded?", a: "No." },
      { q: "Can it process multiple lines?", a: "Yes." },
    ],
    related: ["/tools/url-parser/", "/tools/regex-tester/", "/tools/number-base-converter/"],
  },
  {
    slug: "json-path-tester",
    title: "JSON Path Tester",
    h1: "Free Online JSON Path Tester",
    category: "JSON",
    primaryKeyword: "json path tester",
    secondaryKeywords: ["json query tester", "json path online", "json data explorer"],
    searchIntent: "Query JSON objects using simple JSONPath-style expressions.",
    description:
      "Explore JSON data with a lightweight client-side JSONPath-style query tool supporting dot paths and array indexes.",
    features: ["Dot notation", "Array indexes", "Simple wildcards", "Local JSON parsing"],
    usageSteps: [
      "Paste valid JSON.",
      "Enter a path such as $.users[0].name.",
      "Run the query.",
      "Copy the matched value.",
    ],
    codeExample: { input: '{"users":[{"name":"Ada"}]}\n$.users[0].name', output: '"Ada"' },
    faqs: [
      {
        q: "Is this full JSONPath?",
        a: "It intentionally implements a lightweight subset for common dot paths, indexes and wildcards.",
      },
      { q: "Can it query arrays?", a: "Yes, numeric indexes and simple wildcards are supported." },
      { q: "Does it modify the JSON?", a: "No. It only reads and returns matching values." },
      { q: "Is the JSON private?", a: "Yes." },
    ],
    related: [
      "/tools/json-formatter/",
      "/tools/json-schema-validator/",
      "/converters/json-to-typescript/",
    ],
  },
  {
    slug: "json-schema-validator",
    title: "JSON Schema Validator",
    h1: "Free Online JSON Schema Validator",
    category: "JSON",
    primaryKeyword: "json schema validator",
    secondaryKeywords: ["validate json schema", "json validator online"],
    searchIntent: "Validate JSON against a JSON Schema draft supported by the browser validator.",
    description:
      "Validate a JSON document against a practical subset of JSON Schema locally, including types, required properties, arrays and enums.",
    features: [
      "Type validation",
      "Required properties",
      "Enums and arrays",
      "Detailed local errors",
    ],
    usageSteps: [
      "Paste JSON.",
      "Paste a JSON Schema.",
      "Run validation.",
      "Review each path-specific error.",
    ],
    codeExample: {
      input: '{"age":12}\nSchema: {"type":"object","required":["name"]}',
      output: "Invalid: $.name is required",
    },
    faqs: [
      {
        q: "Does this support every JSON Schema keyword?",
        a: "No. It focuses on a useful client-side subset rather than claiming full draft compatibility.",
      },
      { q: "Can I validate nested properties?", a: "Yes." },
      { q: "Are errors path-specific?", a: "Yes, errors include the JSON path when possible." },
      { q: "Does validation upload my JSON?", a: "No." },
    ],
    related: [
      "/tools/json-formatter/",
      "/tools/json-path-tester/",
      "/converters/json-to-typescript/",
    ],
  },
];

export const converters: ToolMeta[] = [
  {
    slug: "json-to-yaml",
    title: "JSON to YAML Converter",
    h1: "Free Online JSON to YAML Converter",
    category: "Converters",
    primaryKeyword: "json to yaml converter",
    secondaryKeywords: ["convert json to yaml", "json yaml online"],
    searchIntent: "Convert valid JSON into clean YAML.",
    description: "Convert JSON to readable YAML using js-yaml entirely in your browser.",
    features: [
      "Standards-compliant YAML output",
      "Local browser conversion",
      "Copy and download",
      "Clear parser errors",
    ],
    usageSteps: [
      "Paste JSON.",
      "Review the YAML output.",
      "Fix any syntax error shown below the editor.",
      "Copy or download the YAML file.",
    ],
    codeExample: {
      input: '{"name":"ElDevo","enabled":true}',
      output: "name: ElDevo\nenabled: true",
    },
    faqs: [
      {
        q: "Does JSON to YAML conversion happen locally?",
        a: "Yes. js-yaml runs in your browser and the JSON is never uploaded.",
      },
      { q: "Can YAML preserve arrays?", a: "Yes. JSON arrays become YAML sequences." },
      {
        q: "What happens with invalid JSON?",
        a: "The converter reports the parser error and leaves output empty until the input is valid.",
      },
      { q: "Can I download YAML?", a: "Yes. Download Output saves a .yaml file locally." },
    ],
    related: [
      "/tools/json-formatter/",
      "/converters/yaml-to-json/",
      "/converters/json-to-typescript/",
      "/converters/csv-to-json/",
    ],
  },
  {
    slug: "yaml-to-json",
    title: "YAML to JSON Converter",
    h1: "Free Online YAML to JSON Converter",
    category: "Converters",
    primaryKeyword: "yaml to json converter",
    secondaryKeywords: ["convert yaml to json", "yaml parser online"],
    searchIntent: "Convert YAML documents into JSON.",
    description:
      "Parse YAML locally with js-yaml and generate strict, readable JSON without uploads.",
    features: [
      "Local YAML parsing",
      "Pretty or minified JSON",
      "Copy and download",
      "Parser errors",
    ],
    usageSteps: [
      "Paste YAML.",
      "Choose formatted or minified output.",
      "Review parser errors if present.",
      "Copy or download JSON.",
    ],
    codeExample: {
      input: "name: ElDevo\nenabled: true",
      output: '{\n  "name": "ElDevo",\n  "enabled": true\n}',
    },
    faqs: [
      { q: "Is YAML parsing client-side?", a: "Yes. The parser executes in your browser." },
      {
        q: "Can I minify the JSON output?",
        a: "Yes. Toggle Minify to remove formatting whitespace.",
      },
      {
        q: "Does it support YAML arrays?",
        a: "Yes, standard YAML sequences are converted to JSON arrays.",
      },
      { q: "Is there a server upload?", a: "No." },
    ],
    related: [
      "/converters/json-to-yaml/",
      "/tools/json-formatter/",
      "/converters/json-to-typescript/",
      "/converters/csv-to-json/",
    ],
  },
  {
    slug: "csv-to-json",
    title: "CSV to JSON Converter",
    h1: "Free Online CSV to JSON Converter",
    category: "Converters",
    primaryKeyword: "csv to json converter",
    secondaryKeywords: ["convert csv to json", "csv parser online"],
    searchIntent: "Convert CSV rows into JSON arrays in the browser.",
    description: "Parse CSV or TSV data with Papa Parse and export a clean JSON array locally.",
    features: ["Header detection", "Delimiter selection", "Quoted fields", "Download JSON"],
    usageSteps: [
      "Paste CSV data.",
      "Enable header mode if the first row contains column names.",
      "Choose a delimiter when needed.",
      "Copy or download the JSON.",
    ],
    codeExample: { input: "name,age\nAda,36", output: '[{\n  "name": "Ada",\n  "age": "36"\n}]' },
    faqs: [
      { q: "Does it handle quoted commas?", a: "Yes. Papa Parse handles standard CSV quoting." },
      { q: "Can I convert TSV?", a: "Yes. Choose tab as the delimiter." },
      {
        q: "Are values automatically numbers?",
        a: "You can enable dynamic typing to convert numeric and boolean-looking values.",
      },
      { q: "Is CSV uploaded?", a: "No. Parsing is local." },
    ],
    related: [
      "/tools/json-formatter/",
      "/converters/json-to-yaml/",
      "/converters/json-to-typescript/",
      "/tools/base64-encode-decode/",
    ],
  },
  {
    slug: "json-to-typescript",
    title: "JSON to TypeScript Converter",
    h1: "Free Online JSON to TypeScript Converter",
    category: "Converters",
    primaryKeyword: "json to typescript converter",
    secondaryKeywords: ["json to interface", "typescript interface generator"],
    searchIntent: "Generate TypeScript interfaces from representative JSON.",
    description:
      "Turn JSON examples into readable TypeScript interfaces locally, including nested objects and arrays.",
    features: [
      "Nested interface generation",
      "Array type inference",
      "Identifier-safe property names",
      "Copy and download",
    ],
    usageSteps: [
      "Paste representative JSON.",
      "Choose the root interface name.",
      "Review generated interfaces.",
      "Copy or download the .ts file.",
    ],
    codeExample: {
      input: '{"id":1,"name":"Ada"}',
      output: "export interface Root {\n  id: number;\n  name: string;\n}",
    },
    faqs: [
      { q: "Does it infer nested objects?", a: "Yes. Nested records become separate interfaces." },
      {
        q: "What about arrays?",
        a: "Arrays are inferred from their first representative element.",
      },
      { q: "Can I name the root interface?", a: "Yes." },
      { q: "Does it upload the JSON?", a: "No. Generation is local." },
    ],
    related: [
      "/tools/json-formatter/",
      "/converters/json-to-yaml/",
      "/converters/yaml-to-json/",
      "/tools/sql-formatter/",
    ],
  },
];

export const cheatsheets = [
  {
    slug: "docker-cheat-sheet",
    title: "Docker Commands Cheat Sheet",
    h1: "Docker Commands Cheat Sheet",
    description:
      "A concise reference for images, containers, logs, volumes, networks and Docker Compose.",
    sections: [
      {
        title: "Images",
        items: ["docker pull IMAGE", "docker build -t NAME .", "docker images", "docker rmi IMAGE"],
      },
      {
        title: "Containers",
        items: [
          "docker run --name APP IMAGE",
          "docker ps -a",
          "docker logs -f CONTAINER",
          "docker exec -it CONTAINER sh",
          "docker stop CONTAINER",
          "docker rm CONTAINER",
        ],
      },
      {
        title: "Compose",
        items: [
          "docker compose up -d",
          "docker compose ps",
          "docker compose logs -f",
          "docker compose down",
        ],
      },
    ],
  },
  {
    slug: "git-commands-cheat-sheet",
    title: "Git Commands Cheat Sheet",
    h1: "Git Commands Cheat Sheet",
    description:
      "A practical Git reference for branches, commits, remotes, history, stashing and recovery.",
    sections: [
      {
        title: "Daily workflow",
        items: [
          "git status",
          "git add .",
          'git commit -m "message"',
          "git pull --rebase",
          "git push",
        ],
      },
      {
        title: "Branches",
        items: [
          "git branch",
          "git switch -c feature/name",
          "git switch main",
          "git merge feature/name",
          "git branch -d feature/name",
        ],
      },
      {
        title: "History & recovery",
        items: [
          "git log --oneline --graph",
          "git diff",
          "git stash",
          "git restore FILE",
          "git reflog",
        ],
      },
    ],
  },
];

export const allToolPaths = [
  ...tools.map((x) => `/tools/${x.slug}/`),
  ...converters.map((x) => `/converters/${x.slug}/`),
  ...cheatsheets.map((x) => `/cheatsheets/${x.slug}/`),
];
