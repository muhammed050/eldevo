import type { FAQ, ToolMeta } from "./tools.config.ts";
import { tools, converters } from "./tools.config.ts";
import { strategicTools } from "./seo-tools.catalog.ts";

type ContentPack = {
  features: string[];
  usageSteps: string[];
  extraFaqs: FAQ[];
  example: { input: string; output: string };
};

const defaultPack: ContentPack = {
  features: [
    "Runs entirely in your browser",
    "No file upload or account required",
    "Instant results as you type",
    "Copy or download the output in one click",
  ],
  usageSteps: [
    "Paste or type your input into the editor.",
    "Adjust any available options for the operation.",
    "Review the generated result instantly.",
    "Copy the result or download it as a file.",
  ],
  extraFaqs: [
    {
      q: "Does this work offline?",
      a: "Once the page has loaded, the tool keeps working without a network connection because processing happens on your device.",
    },
  ],
  example: { input: "sample input", output: "processed output" },
};

const contentPacks: Record<string, ContentPack> = {
  JSON: {
    features: [
      "Parses and validates JSON in your browser",
      "Handles nested objects and large payloads",
      "Highlights syntax errors with line context",
      "No data is ever uploaded to a server",
    ],
    usageSteps: [
      "Paste your JSON document into the editor.",
      "The tool parses it and reports the result immediately.",
      "Fix any highlighted syntax issues if needed.",
      "Copy or download the processed JSON.",
    ],
    extraFaqs: [
      {
        q: "Can it handle large JSON files?",
        a: "Yes, parsing happens locally in your browser, so file size is limited only by your device's memory rather than a server upload limit.",
      },
      {
        q: "Will it catch invalid JSON?",
        a: "Yes, malformed JSON is reported with a clear error so you can locate and fix the issue.",
      },
    ],
    example: {
      input: '{"user":{"id":1,"name":"Ada","active":true}}',
      output: '{\n  "user": {\n    "id": 1,\n    "name": "Ada",\n    "active": true\n  }\n}',
    },
  },
  Encoding: {
    features: [
      "Converts between text and encoded formats instantly",
      "Handles Unicode and special characters correctly",
      "No character limit imposed by a backend",
      "Runs fully client-side for sensitive strings",
    ],
    usageSteps: [
      "Enter the text or encoded string you want to convert.",
      "The conversion runs automatically in your browser.",
      "Check the output for correctness.",
      "Copy the encoded or decoded result.",
    ],
    extraFaqs: [
      {
        q: "Is this safe for sensitive strings?",
        a: "Yes, the encoding or decoding happens locally, so the string never leaves your browser tab.",
      },
    ],
    example: { input: "Hello, World!", output: "SGVsbG8sIFdvcmxkIQ==" },
  },
  Security: {
    features: [
      "Generates values using your browser's secure random source",
      "Nothing is transmitted or logged externally",
      "Configurable length and character options",
      "Safe to use for local development and testing",
    ],
    usageSteps: [
      "Choose the options relevant to what you need to generate or check.",
      "Run the tool to produce a result locally.",
      "Review the output for your use case.",
      "Copy the value for use in your project.",
    ],
    extraFaqs: [
      {
        q: "Is the output cryptographically secure?",
        a: "Where applicable, generation uses the Web Crypto API available in modern browsers rather than a predictable pseudo-random source.",
      },
      {
        q: "Should I reuse generated secrets in production?",
        a: "Treat browser-generated secrets the same as any other credential: store them securely and rotate them according to your security policy.",
      },
    ],
    example: { input: "length: 24, symbols: true", output: "kX9#mQ2!zR7$pL4&wT8@vN1%" },
  },
  Regex: {
    features: [
      "Tests patterns against sample text instantly",
      "Explains matches and capture groups",
      "No sample data is sent to a server",
      "Useful for debugging validation logic",
    ],
    usageSteps: [
      "Enter your regular expression pattern.",
      "Provide sample text to test it against.",
      "Review matches, groups and any errors.",
      "Copy the working pattern into your code.",
    ],
    extraFaqs: [
      {
        q: "Which regex flavor is used?",
        a: "The tool uses the JavaScript RegExp engine built into your browser, matching the behavior you would get in Node.js or a browser script.",
      },
    ],
    example: { input: "^[\\w.-]+@[\\w.-]+\\.\\w+$", output: "Matches: user@example.com" },
  },
  HTML: {
    features: [
      "Processes markup entirely client-side",
      "Preserves structure while cleaning formatting",
      "Useful before pasting markup into a CMS or editor",
      "No content is stored or logged",
    ],
    usageSteps: [
      "Paste your HTML markup into the editor.",
      "The tool processes it immediately in your browser.",
      "Review the formatted or converted result.",
      "Copy the output into your project or CMS.",
    ],
    extraFaqs: [
      {
        q: "Will it strip out my scripts or styles?",
        a: "No, the tool preserves the structure of your markup; it only performs the specific formatting or conversion operation you requested.",
      },
    ],
    example: { input: "<div><p>Hello</p></div>", output: "<div>\n  <p>Hello</p>\n</div>" },
  },
  CSS: {
    features: [
      "Live preview as you adjust values",
      "Generates copy-paste-ready CSS",
      "Covers common modern layout properties",
      "No signup needed to save or export output",
    ],
    usageSteps: [
      "Adjust the sliders or fields for the property you need.",
      "Watch the live preview update instantly.",
      "Fine-tune the values until the result matches your design.",
      "Copy the generated CSS into your stylesheet.",
    ],
    extraFaqs: [
      {
        q: "Does the generated CSS need a build step?",
        a: "No, the output is plain CSS you can paste directly into any stylesheet or CSS-in-JS solution.",
      },
    ],
    example: { input: "border-radius: 12px 12px 0 0", output: "border-radius: 12px 12px 0 0;" },
  },
  JavaScript: {
    features: [
      "Processes code entirely in your browser",
      "Preserves logic while adjusting formatting or size",
      "No source code is uploaded anywhere",
      "Useful for quick checks before committing code",
    ],
    usageSteps: [
      "Paste your JavaScript code into the editor.",
      "The tool processes it immediately.",
      "Review the formatted or transformed output.",
      "Copy the result back into your project.",
    ],
    extraFaqs: [
      {
        q: "Does this modify code logic?",
        a: "No, the tool only changes formatting, whitespace or escaping; the underlying logic of your code is preserved.",
      },
    ],
    example: {
      input: "function add(a,b){return a+b}",
      output: "function add(a, b) {\n  return a + b;\n}",
    },
  },
  Developer: {
    features: [
      "A quick browser-based utility for a common developer task",
      "No install or account required",
      "Produces output you can use immediately",
      "Works entirely on your device",
    ],
    usageSteps: [
      "Enter the details this tool needs.",
      "Run the tool to generate a result.",
      "Review the output for accuracy.",
      "Copy the result into your project or terminal.",
    ],
    extraFaqs: [],
    example: { input: "example input", output: "example output" },
  },
  Web: {
    features: [
      "Looks up or parses web-related data instantly",
      "No proxy server sees your input",
      "Useful for debugging requests and headers",
      "Works directly in your browser",
    ],
    usageSteps: [
      "Enter the value you want to inspect or parse.",
      "The tool processes it in your browser.",
      "Review the structured result.",
      "Copy the details you need.",
    ],
    extraFaqs: [],
    example: {
      input: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      output: "Browser: Chrome · OS: Windows 10",
    },
  },
  URL: {
    features: [
      "Parses or builds URLs and query strings instantly",
      "Handles encoding edge cases correctly",
      "No URLs are logged or stored",
      "Useful for debugging redirects and links",
    ],
    usageSteps: [
      "Paste the URL or query string you're working with.",
      "The tool parses or generates the result automatically.",
      "Review each component of the output.",
      "Copy the result for use in your code or browser.",
    ],
    extraFaqs: [],
    example: { input: "https://example.com/search?q=eldevo&page=2", output: "q=eldevo\npage=2" },
  },
  Text: {
    features: [
      "Processes text instantly as you type",
      "Works on documents of any length locally",
      "No text is stored or transmitted",
      "Useful for cleaning up pasted or scraped content",
    ],
    usageSteps: [
      "Paste your text into the editor.",
      "The tool processes it automatically.",
      "Review the cleaned or transformed output.",
      "Copy the result where you need it.",
    ],
    extraFaqs: [],
    example: { input: "  Hello   World  \n\n\n", output: "Hello World" },
  },
  SEO: {
    features: [
      "Generates search-engine-friendly output instantly",
      "Follows current metadata and schema.org conventions",
      "No page content is sent to a third-party service",
      "Ready to paste into your site's head or CMS",
    ],
    usageSteps: [
      "Enter the page details this tool needs (title, description, or content).",
      "The tool generates the SEO output automatically.",
      "Review the result against your page's real content.",
      "Copy the output into your site's HTML or CMS field.",
    ],
    extraFaqs: [
      {
        q: "Will this guarantee higher rankings?",
        a: "No single tag or snippet guarantees rankings. This tool helps you produce technically correct metadata and structured data, which is one input among many search engines consider.",
      },
    ],
    example: {
      input: "Free Online JSON Beautifier",
      output: '<meta property="og:title" content="Free Online JSON Beautifier" />',
    },
  },
  Calculators: {
    features: [
      "Calculates results instantly as you enter numbers",
      "No spreadsheet or app install required",
      "Shows the formula used for transparency",
      "Works entirely offline once loaded",
    ],
    usageSteps: [
      "Enter the numbers required for the calculation.",
      "The result updates automatically.",
      "Check the formula shown for transparency.",
      "Copy or note down the result.",
    ],
    extraFaqs: [
      {
        q: "How is the result calculated?",
        a: "The calculation uses the standard formula for this metric; the formula is shown alongside the result for transparency.",
      },
    ],
    example: { input: "value: 240, from: 200", output: "Change: +20%" },
  },
  Images: {
    features: [
      "Processes images directly in your browser",
      "No file is uploaded to a remote server",
      "Supports common formats (PNG, JPG, WebP)",
      "Instant preview before you download",
    ],
    usageSteps: [
      "Select or drag an image file into the tool.",
      "Adjust any available options.",
      "Preview the processed result.",
      "Download the output file.",
    ],
    extraFaqs: [
      {
        q: "Are my images uploaded anywhere?",
        a: "No, image processing runs locally using your browser's built-in canvas and file APIs, so files are never sent to a server.",
      },
    ],
    example: { input: "photo.png (2.4 MB)", output: "photo-optimized.png (480 KB)" },
  },
  Generators: {
    features: [
      "Generates a ready-to-use value on demand",
      "Uses your browser's secure random source where relevant",
      "No signup or rate limit",
      "Regenerate as many times as you need",
    ],
    usageSteps: [
      "Set any options for what you want to generate.",
      "Click generate to produce a new value.",
      "Regenerate if you want a different result.",
      "Copy the value for use in your project.",
    ],
    extraFaqs: [],
    example: { input: "options: default", output: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d" },
  },
  Design: {
    features: [
      "Live visual preview as you adjust values",
      "Outputs values in multiple common formats",
      "No account needed to use or export",
      "Useful for quick design and prototyping decisions",
    ],
    usageSteps: [
      "Pick or enter a starting value.",
      "Adjust it using the on-screen controls.",
      "Preview the result instantly.",
      "Copy the value in the format you need.",
    ],
    extraFaqs: [],
    example: { input: "#0EA5E9", output: "rgb(14, 165, 233)" },
  },
  Converters: {
    features: [
      "Converts between formats entirely in your browser",
      "Preserves structure and data types where possible",
      "No file is uploaded to a server",
      "Handles common edge cases in each format",
    ],
    usageSteps: [
      "Paste or upload the data you want to convert.",
      "The tool converts it automatically.",
      "Review the converted output.",
      "Copy or download the result.",
    ],
    extraFaqs: [
      {
        q: "Does the conversion preserve data types?",
        a: "The tool preserves data types and structure wherever the target format supports an equivalent representation.",
      },
    ],
    example: { input: "source format", output: "target format" },
  },
};

const faq = (title: string): FAQ[] => [
  {
    q: `Is ${title} free?`,
    a: `Yes. ${title} is available free in your browser, with no usage limits.`,
  },
  {
    q: "Is my data uploaded to a server?",
    a: "No. Tool processing is performed locally in your browser unless the tool explicitly says otherwise.",
  },
];

export const strategicToolMeta: ToolMeta[] = strategicTools.map((item) => {
  const base = [...tools, ...converters].find((tool) => tool.slug === item.slug);
  const pack = contentPacks[item.category] ?? defaultPack;
  return {
    slug: item.slug,
    title: base?.title ?? item.title,
    h1: base?.h1 ?? `Free ${item.title}`,
    category: base?.category ?? item.category,
    primaryKeyword: item.keyword,
    secondaryKeywords: base?.secondaryKeywords ?? [],
    searchIntent: base?.searchIntent ?? `Use ${item.title} directly in your browser.`,
    description: item.description,
    features: base?.features ?? pack.features,
    usageSteps: base?.usageSteps ?? pack.usageSteps,
    codeExample: base?.codeExample ?? pack.example,
    faqs: [...(base?.faqs ?? faq(item.title)), ...pack.extraFaqs],
    related: base?.related ?? [],
  };
});
