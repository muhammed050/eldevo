import type { ToolMeta } from "./tools.config";

const make = (slug: string, title: string, category: string, keyword: string, description: string): ToolMeta => ({
  slug,
  title,
  h1: `${title} — Free Online Tool`,
  category,
  primaryKeyword: keyword,
  secondaryKeywords: [keyword, `${keyword} online`],
  searchIntent: description,
  description,
  features: ["Runs locally in your browser", "No account required", "Copy or download results"],
  usageSteps: ["Enter your input.", "Run the tool.", "Copy or download the result."],
  codeExample: { input: "Example input", output: "Example output" },
  faqs: [{ q: "Is it free?", a: "Yes. This ElDevo tool is free to use." }, { q: "Is my input uploaded?", a: "No. The core engine runs in your browser." }],
  related: [],
});

export const coreTools: ToolMeta[] = [
  make("json-formatter", "JSON Formatter & Validator", "JSON", "json formatter", "Format and validate JSON locally with readable indentation and syntax errors."),
  make("jwt-decoder", "JWT Decoder", "Security", "jwt decoder", "Decode JWT headers and payload claims locally without pretending to verify signatures."),
  make("base64-encoder", "Base64 Encoder", "Encoding", "base64 encoder", "Encode UTF-8 text to Base64 in your browser."),
  make("base64-decoder", "Base64 Decoder", "Encoding", "base64 decoder", "Decode standard or URL-safe Base64 text to UTF-8 locally."),
  make("regex-tester", "Regex Tester", "Text", "regex tester", "Test regular expressions against multiple lines and inspect matches."),
  make("url-parser", "URL Parser", "Web", "url parser", "Inspect protocol, host, path, query parameters and hash values from a URL."),
  make("timestamp-converter", "Unix Timestamp Converter", "Web", "timestamp converter", "Convert Unix seconds or milliseconds into ISO dates and Unix values."),
  make("uuid-generator", "UUID Generator", "Generators", "uuid generator", "Generate cryptographically strong UUID v4 identifiers in your browser."),
  make("hash-generator", "SHA Hash Generator", "Security", "hash generator", "Generate SHA-256 and SHA-512 hashes using Web Crypto."),
  make("html-formatter", "HTML Formatter", "Web", "html formatter", "Format compact HTML into readable nested markup locally."),
  make("text-case-converter", "Text Case Converter", "Text", "text case converter", "Convert text into lower, upper, title, camel, Pascal, kebab and snake cases."),
  make("json-path-tester", "JSONPath Tester", "JSON", "jsonpath tester", "Query JSON using common dot, bracket and wildcard paths."),
  make("json-schema-validator", "JSON Schema Validator", "JSON", "json schema validator", "Validate common JSON type, required-property and property-type rules locally."),
  make("cron-generator", "Cron Expression Helper", "Generators", "cron generator", "Inspect and validate standard five-field cron expressions."),
  make("text-stats", "Text Statistics", "Text", "text statistics", "Measure words, characters, lines, sentences and reading time."),
  make("background-remover", "Background Remover", "Images", "background remover", "Remove simple solid-color image backgrounds locally and export transparent PNG."),
  make("image-upscaler", "Image Upscaler", "Images", "image upscaler", "Upscale PNG, JPG and WebP images 2x or 4x locally with high-quality browser canvas scaling."),
  make("image-compressor-pro", "Image Compressor Pro", "Images", "image compressor", "Compress JPG, PNG and WebP images locally with quality and optional maximum-width controls."),
  make("social-media-image-resizer", "Social Media Image Resizer", "Images", "social media image resizer", "Resize images for Instagram, TikTok, YouTube, Facebook, X and LinkedIn using ready-made dimensions."),
  make("image-to-pdf", "Image to PDF", "Images", "image to pdf", "Convert up to 30 PNG, JPG or WebP images into a multi-page PDF locally in your browser."),
  {
    ...make("image-editor", "Image Editor", "Images", "image editor", "Edit PNG, JPG and WebP images in your browser with crop, resize, rotation, flips, color adjustments, blur and local export."),
    features: ["PNG, JPG and WebP support", "Crop, resize, rotate and flip", "Brightness, contrast, saturation, grayscale and blur", "Live preview and Reset", "Processed locally in your browser"],
    usageSteps: ["Upload a PNG, JPG or WebP image.", "Adjust the editor controls and preview the changes.", "Choose PNG, JPG or WebP and download the edited image."],
    codeExample: { input: "PNG / JPG / WebP image", output: "Edited image — processed locally" },
    faqs: [
      { q: "Is my image uploaded?", a: "No. Image processing happens locally in your browser." },
      { q: "Which formats are supported?", a: "You can upload PNG, JPG or WebP images and export PNG, JPG or WebP." },
    ],
  },
];

export const coreSlugs = new Set(coreTools.map(tool => tool.slug));
