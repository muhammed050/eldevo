import test, { describe } from "node:test";
import assert from "node:assert/strict";

// Node 22 has the Web Crypto/TextEncoder APIs used by the real browser engine,
// but not DOMParser. These tiny test doubles expose only the DOM surface the
// engine actually consumes; browser behavior remains the production source of truth.
class TestElement {
  constructor(tagName, text = "", attrs = {}) { this.tagName = tagName; this.textContent = text; this.attrs = attrs; this.children = []; }
  getAttribute(name) { return this.attrs[name] ?? null; }
}
class TestDocument {
  constructor(source, xml = false) {
    this.source = source;
    this.documentElement = new TestElement("root");
    this.title = (source.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim();
    this._xml = xml;
    if (xml) {
      const root = source.match(/^\s*(?:<\?xml[^>]*>\s*)?<([\w:.-]+)[^>]*>([\s\S]*)<\/\1>\s*$/);
      if (!root) { this.parserError = true; return; }
      this.documentElement = new TestElement(root[1], root[2]);
      const stack = [{ element: this.documentElement, end: root[1] }];
      const token = /<([\w:.-]+)(?:\s+[^>]*)?>([\s\S]*?)<\/\1>/g;
      let m;
      while ((m = token.exec(root[2]))) stack[0].element.children.push(new TestElement(m[1], m[2]));
    }
  }
  querySelector(selector) {
    if (selector === "parsererror" && this.parserError) return new TestElement("parsererror", "Invalid XML");
    return null;
  }
  querySelectorAll(selector) {
    const tags = selector.split(",").map(x => x.trim().toLowerCase());
    const out = [];
    const re = /<([a-z][\w-]*)(?:\s+([^>]*))?>([\s\S]*?)<\/\1>/gi;
    let m;
    while ((m = re.exec(this.source))) {
      const tag = m[1].toLowerCase();
      if (tags.includes(tag)) out.push(new TestElement(tag.toUpperCase(), m[3].replace(/<[^>]+>/g, "").trim(), {}));
    }
    if (selector === "a[href]") {
      return [...this.source.matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(m => new TestElement("A", "", { href: m[1] }));
    }
    return out;
  }
}
if (typeof globalThis.DOMParser === "undefined") {
  globalThis.DOMParser = class DOMParser { parseFromString(source, type) { return new TestDocument(source, type === "application/xml"); } };
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = { createElement: () => ({ set innerHTML(value) { this.value = String(value).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); } }) };
}

const { executeTool, ToolUnsupportedError } = await import("../src/lib/tools/real-engine.ts");
const { toolEntries, unsupportedToolSlugs } = await import("../src/lib/tool-registry.ts");

function fixture(slug, example = "") {
  if (/json-schema-validator/.test(slug)) return '{"name":"ElDevo"}\n---SCHEMA---\n{"type":"object","required":["name"]}';
  if (/json-schema-generator/.test(slug)) return '{"name":"ElDevo","count":2}';
  if (/jsonpath|json-path/.test(slug)) return '{"users":[{"name":"Ada"}]}\n---PATH---\n$.users[0].name';
  if (/json-diff|text-diff|text-compare/.test(slug)) return 'left\n---DIFF---\nright';
  if (/json-to-(csv|xml|javascript|typescript)/.test(slug)) return '{"name":"Ada","age":36}';
  if (/xml-to-json/.test(slug)) return '<root><name>Ada</name><item>1</item><item>2</item></root>';
  if (/base64-decoder/.test(slug)) return 'RWxEZXZv';
  if (/hex-decoder/.test(slug)) return '4869';
  if (/binary-to-text/.test(slug)) return '01001000 01101001';
  if (/hmac/.test(slug)) return 'SHA-256\n---HMAC---\nsecret\nElDevo';
  if (/regex-tester/.test(slug)) return '^hello\n---TEST---\nhello world';
  if (/regex-explainer/.test(slug)) return '(?<name>hello)';
  if (/email-regex/.test(slug)) return 'test@example.com';
  if (/url-regex/.test(slug)) return 'https://example.com/path';
  if (/query-string-generator/.test(slug)) return '{"q":"eldevo","page":2}';
  if (/query-string-parser/.test(slug)) return 'https://example.com/?q=eldevo&page=2';
  if (/url-parser/.test(slug)) return 'https://example.com/users?id=42#profile';
  if (/domain-parser/.test(slug)) return 'https://blog.example.com';
  if (/user-agent/.test(slug)) return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36';
  if (/timestamp/.test(slug)) return '1704067200';
  if (/email-extractor/.test(slug)) return 'Contact test@example.com today.';
  if (/url-extractor/.test(slug)) return 'Visit https://example.com/docs today.';
  if (/heading-analyzer/.test(slug)) return '<h1>Main</h1><h2>Section</h2>';
  if (/internal-link-analyzer/.test(slug)) return '<a href="/about">About</a><a href="https://example.com">External</a>';
  if (/sitemap-generator/.test(slug)) return 'https://example.com/\nhttps://example.com/about';
  if (/robots-txt-generator/.test(slug)) return 'Disallow: /admin\nSitemap: https://example.com/sitemap.xml';
  if (/faq-schema/.test(slug)) return 'What is ElDevo?|A browser tool directory.';
  if (/article-schema|breadcrumb-schema|schema-markup/.test(slug)) return 'ElDevo\nhttps://example.com\nDeveloper tools';
  if (/meta-tag|open-graph|twitter-card|serp-snippet/.test(slug)) return 'ElDevo\nDeveloper tools\nhttps://example.com\nhttps://example.com/image.png';
  if (/keyword-density/.test(slug)) return 'ElDevo is a developer tool.\n---KEYWORD---\nElDevo';
  if (/canonical-url/.test(slug)) return 'https://example.com/page';
  if (/html-to-markdown/.test(slug)) return '<h1>Hello</h1><p>World</p>';
  if (/markdown-to-html/.test(slug)) return '# Hello\n\nWorld';
  if (/html-(formatter|minifier|validator)/.test(slug)) return '<!doctype html><html><head><title>Test</title></head><body><h1>Hello</h1></body></html>';
  if (/css-(gradient|box-shadow|border-radius|flexbox|grid)/.test(slug)) return '#0ea5e9 0%, #fff 100%';
  if (/javascript-(formatter|minifier|escape)/.test(slug)) return 'function add(a,b){return a+b;}';
  if (/calculator/.test(slug) || /percentage|ratio|average|median|standard-deviation|discount|profit-margin|markup|interest|break-even/.test(slug)) {
    if (/age-calculator/.test(slug)) return '2000-01-01';
    if (/date-difference/.test(slug)) return '2024-01-01\n2024-01-10';
    if (/time-duration/.test(slug)) return '09:30\n10:45';
    if (/compound-interest/.test(slug)) return '1000 5 2 12';
    if (/simple-interest/.test(slug)) return '1000 5 2';
    if (/break-even/.test(slug)) return '1000 50 30';
    if (/percentage-change/.test(slug)) return '100 120';
    if (/percentage-calculator/.test(slug)) return '20 200';
    if (/discount/.test(slug)) return '200 10';
    if (/profit-margin|markup/.test(slug)) return '100 80';
    return '1 2 3 4';
  }
  if (/hex-color|color-picker/.test(slug)) return '#0ea5e9';
  if (/rgb-to-hex/.test(slug)) return '14 165 233';
  if (/env-generator/.test(slug)) return 'DATABASE_URL\nAPI_KEY';
  if (/cron-(parser|humanizer)/.test(slug)) return '*/15 * * * *';
  if (/gitignore/.test(slug)) return 'node';
  if (/random-number/.test(slug)) return '1 10';
  if (/uuid/.test(slug)) return '2';
  if (/lorem/.test(slug)) return '2';
  return example || 'ElDevo';
}

const activeTools = toolEntries.filter(t => t.status === "active");

describe("active tool smoke suite", () => {
  for (const tool of activeTools) {
    test(`${tool.slug} executes a real implementation`, async () => {
      const input = fixture(tool.slug, tool.codeExample.input);
      try {
        const result = await tool.execute(input);
        assert.equal(typeof result, "string");
        assert.ok(result.length > 0, "tool returned an empty result");
        assert.notEqual(result, "Processed by ElDevo locally");
      } catch (error) {
        assert.equal(error instanceof ToolUnsupportedError, false, `active tool ${tool.slug} is unsupported`);
        throw error;
      }
    });
  }
});

describe("security-critical behavior", () => {
  test("SHA-256 matches known vector", async () => {
    assert.match(await executeTool("sha256-generator", "abc"), /^SHA-256: ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad$/);
  });
  test("SHA-512 matches known vector", async () => {
    assert.match(await executeTool("sha512-generator", "abc"), /^SHA-512: ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f$/);
  });
  test("random secrets are generated through Web Crypto", async () => {
    const a = await executeTool("secret-key-generator", "generate");
    const b = await executeTool("secret-key-generator", "generate");
    assert.equal(a.length, 64); assert.equal(b.length, 64); assert.notEqual(a, b);
  });
  test("invalid JSON is rejected", async () => { await assert.rejects(() => executeTool("json-formatter", "{")); });
  test("Unicode Base64 round-trips", async () => {
    const encoded = await executeTool("base64-encoder", "مرحبا 👋");
    assert.equal(await executeTool("base64-decoder", encoded), "مرحبا 👋");
  });
  test("regex captures named groups", async () => {
    const result = JSON.parse(await executeTool("regex-tester", "(?<name>hello)\\s+(world)\n---TEST---\nhello world"));
    assert.equal(result[0].groups.name, "hello"); assert.equal(result[0].match, "hello world");
  });
  test("percentage change handles zero safely", async () => { await assert.rejects(() => executeTool("percentage-change-calculator", "0 10")); });
  test("JWT decoder never claims signature verification", async () => {
    const token = "eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiIxMjMifQ.";
    const result = await executeTool("jwt-decoder", token);
    assert.doesNotMatch(result, /signature verified|valid signature/i);
  });
});

describe("unsupported surface", () => {
  for (const slug of unsupportedToolSlugs) {
    test(`${slug} is explicitly unsupported`, async () => {
      await assert.rejects(() => executeTool(slug, "test"), ToolUnsupportedError);
    });
  }
});
