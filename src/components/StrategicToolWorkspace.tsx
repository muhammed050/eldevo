"use client";

import { useEffect, useMemo, useState } from "react";

function transform(slug: string, input: string): string {
  const text = input;
  switch (slug) {
    case "json-beautifier": return JSON.stringify(JSON.parse(text), null, 2);
    case "json-minifier": return JSON.stringify(JSON.parse(text));
    case "json-validator": JSON.parse(text); return "Valid JSON";
    case "json-sorter": return JSON.stringify(sortJson(JSON.parse(text)), null, 2);
    case "json-escape": return JSON.stringify(text).slice(1, -1);
    case "json-unescape": return JSON.parse(`"${text}"`);
    case "json-diff": return "JSON diff is available for two JSON documents separated by a line containing ---DIFF---.\n" + simpleJsonDiff(text);
    case "json-to-csv": return jsonToCsv(JSON.parse(text));
    case "xml-to-json": return xmlToJson(text);
    case "json-to-xml": return jsonToXml(JSON.parse(text));
    case "json-to-javascript": return `const data = ${JSON.stringify(JSON.parse(text), null, 2)};`;
    case "json-to-typescript-interface": return jsonToTs(JSON.parse(text));
    case "base64-encoder": return b64Encode(text);
    case "base64-decoder": return b64Decode(text);
    case "url-encoder": return encodeURIComponent(text);
    case "url-decoder": return decodeURIComponent(text);
    case "html-encoder": return escapeHtml(text);
    case "html-decoder": { const el = document.createElement("textarea"); el.innerHTML = text; return el.value; }
    case "unicode-escape": return Array.from(text).map(c => `\\u${c.charCodeAt(0).toString(16).padStart(4,"0")}`).join("");
    case "unicode-decoder": return text.replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
    case "hex-encoder": return bytesToHex(new TextEncoder().encode(text));
    case "hex-decoder": return new TextDecoder().decode(hexToBytes(text));
    case "binary-to-text": return new TextDecoder().decode(hexToBytes(text.replace(/\s+/g, " ").split(" ").map(x => parseInt(x,2).toString(16).padStart(2,"0")).join("")));
    case "text-to-binary": return Array.from(new TextEncoder().encode(text)).map(b => b.toString(2).padStart(8,"0")).join(" ");
    case "ascii-converter": return Array.from(text).map(c => `${c}: ${c.charCodeAt(0)}`).join("\n");
    case "word-counter": return `Words: ${text.trim() ? text.trim().split(/\s+/).length : 0}\nCharacters: ${text.length}`;
    case "character-counter": return String(text.length);
    case "sentence-counter": return String(text.trim() ? (text.match(/[.!?]+(?=\s|$)/g)?.length ?? 1) : 0);
    case "reading-time-calculator": return `${Math.max(1, Math.ceil((text.trim() ? text.trim().split(/\s+/).length : 0) / 200))} minute(s)`;
    case "remove-duplicate-lines": return [...new Set(text.split(/\r?\n/))].join("\n");
    case "sort-lines": return text.split(/\r?\n/).sort((a,b)=>a.localeCompare(b)).join("\n");
    case "reverse-text": return Array.from(text).reverse().join("");
    case "remove-extra-spaces": return text.replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
    case "remove-empty-lines": return text.split(/\r?\n/).filter(line=>line.trim()).join("\n");
    case "text-diff": return simpleTextDiff(text);
    case "slug-generator": return text.trim().toLowerCase().replace(/[^a-z0-9\s-]/gi,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"");
    case "lorem-ipsum-generator": return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
    case "random-number-generator": return String(Math.floor(Math.random()*1000000));
    case "random-string-generator": return randomString(24);
    case "password-generator": return randomString(20, true);
    case "uuid-generator-v4": return crypto.randomUUID();
    case "api-key-generator": return `eld_${randomString(32, true)}`;
    case "secret-key-generator": return randomString(48, true);
    case "timestamp-generator": return String(Math.floor(Date.now()/1000));
    case "http-status-code-checker": return httpStatus(text);
    case "query-string-parser": return queryParse(text);
    case "query-string-generator": return queryGenerate(text);
    case "domain-parser": return domainParse(text);
    case "email-extractor": return [...new Set(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])].join("\n");
    case "url-extractor": return [...new Set(text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [])].join("\n");
    case "color-picker": return text.trim() || "#06b6d4";
    case "hex-color-converter": return colorConvert(text);
    case "rgb-to-hex": return rgbToHex(text);
    case "hex-to-rgb": return hexToRgb(text);
    case "percentage-calculator": return `${(Number(text)*0.01).toString()}`;
    case "percentage-change-calculator": return percentageChange(text);
    case "ratio-calculator": return ratio(text);
    case "average-calculator": return average(text);
    case "median-calculator": return median(text);
    case "age-calculator": return age(text);
    case "date-difference-calculator": return dateDiff(text);
    case "time-duration-calculator": return duration(text);
    case "simple-interest-calculator": return simpleInterest(text);
    case "compound-interest-calculator": return compoundInterest(text);
    case "discount-calculator": return discount(text);
    case "profit-margin-calculator": return profitMargin(text);
    case "markup-calculator": return markup(text);
    case "break-even-calculator": return breakEven(text);
    case "meta-tag-generator": return metaTags(text);
    case "open-graph-generator": return ogTags(text);
    case "twitter-card-generator": return twitterTags(text);
    case "canonical-url-generator": return `<link rel="canonical" href="${text.trim()}" />`;
    case "robots-txt-generator": return "User-agent: *\nAllow: /\n\nSitemap: https://eldevo.com/sitemap.xml";
    case "sitemap-generator": return "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url><loc>https://eldevo.com/</loc></url>\n</urlset>";
    case "favicon-generator": return "Use the image tools to prepare a square PNG, then export an ICO in your browser.";
    default: return generic(slug, text);
  }
}

function sortJson(v: unknown): unknown { if (Array.isArray(v)) return v.map(sortJson); if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,sortJson(x)])); return v; }
function b64Encode(s:string){const b=new TextEncoder().encode(s);let x="";for(const n of b)x+=String.fromCharCode(n);return btoa(x)}
function b64Decode(s:string){const b=atob(s.replace(/\s/g,""));return new TextDecoder().decode(Uint8Array.from(b,c=>c.charCodeAt(0)))}
function bytesToHex(b:Uint8Array){return [...b].map(x=>x.toString(16).padStart(2,"0")).join("")}
function hexToBytes(s:string){const h=s.replace(/[^0-9a-f]/gi,"");return Uint8Array.from(h.match(/.{1,2}/g)??[],x=>parseInt(x,16))}
function escapeHtml(s:string){return s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;")}
function jsonToCsv(v:unknown){if(!Array.isArray(v)||!v.length)throw new Error("Enter a JSON array of objects.");const rows=v as Record<string,unknown>[];const keys=[...new Set(rows.flatMap(x=>Object.keys(x)))];return [keys.join(","),...rows.map(r=>keys.map(k=>JSON.stringify(r[k]??"")).join(","))].join("\n")}
function jsonToXml(v:unknown,root="root"):string{if(v===null||typeof v!=="object")return `<${root}>${escapeHtml(String(v??""))}</${root}>`;if(Array.isArray(v))return v.map(x=>jsonToXml(x,"item")).join("");return `<${root}>${Object.entries(v as Record<string,unknown>).map(([k,x])=>jsonToXml(x,k.replace(/[^\w-]/g,"_"))).join("")}</${root}>`}
function xmlToJson(s:string){const doc=new DOMParser().parseFromString(s,"application/xml");if(doc.querySelector("parsererror"))throw new Error("Invalid XML");const walk=(e:Element):unknown=>{const kids=[...e.children];if(!kids.length)return e.textContent??"";const o:Record<string,unknown>={};for(const k of kids){const v=walk(k);if(k.tagName in o)o[k.tagName]=Array.isArray(o[k.tagName])?[...(o[k.tagName] as unknown[]),v]:[o[k.tagName],v];else o[k.tagName]=v}return o};return JSON.stringify({[doc.documentElement.tagName]:walk(doc.documentElement)},null,2)}
function jsonToTs(v:unknown,name="Root"){const fields=Object.entries(v as Record<string,unknown>).map(([k,x])=>`  ${/^\w+$/.test(k)?k:JSON.stringify(k)}: ${typeof x=== "number"?"number":typeof x=== "boolean"?"boolean":Array.isArray(x)?"unknown[]":x&&typeof x==="object"?"Record<string, unknown>":"string"};`).join("\n");return `export interface ${name} {\n${fields}\n}`}
function simpleJsonDiff(s:string){const [a,b]=s.split(/\n---DIFF---\n/i);try{return JSON.stringify({left:JSON.parse(a),right:JSON.parse(b)},null,2)}catch{return "Separate two valid JSON documents with ---DIFF---."}}
function simpleTextDiff(s:string){const [a,b]=s.split(/\n---DIFF---\n/i);if(b===undefined)return "Separate two texts with ---DIFF---.";return a===b?"No differences.":`Different\n\nLeft: ${a}\nRight: ${b}`}
function randomString(n:number,safe=false){const chars=safe?"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789":"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";const bytes=crypto.getRandomValues(new Uint8Array(n));return [...bytes].map(b=>chars[b%chars.length]).join("")}
function httpStatus(s:string){const n=Number(s.trim());const map:Record<number,string>={200:"OK",201:"Created",204:"No Content",301:"Moved Permanently",302:"Found",304:"Not Modified",400:"Bad Request",401:"Unauthorized",403:"Forbidden",404:"Not Found",405:"Method Not Allowed",408:"Request Timeout",409:"Conflict",429:"Too Many Requests",500:"Internal Server Error",502:"Bad Gateway",503:"Service Unavailable",504:"Gateway Timeout"};return map[n]?`${n} ${map[n]}`:"Enter an HTTP status code."}
function queryParse(s:string){const u=new URL(s.includes("?")?s:`https://example.com/?${s.replace(/^\?/,"")}`);return JSON.stringify(Object.fromEntries(u.searchParams.entries()),null,2)}
function queryGenerate(s:string){try{const o=JSON.parse(s);return new URLSearchParams(Object.entries(o).map(([k,v])=>[k,String(v)])).toString()}catch{throw new Error("Enter a JSON object such as {\"page\":2,\"sort\":\"desc\"}.")}}
function domainParse(s:string){const u=new URL(s.includes("://")?s:`https://${s}`);return JSON.stringify({hostname:u.hostname,protocol:u.protocol,port:u.port||null},null,2)}
function colorConvert(s:string){return s.trim().toLowerCase()}
function rgbToHex(s:string){const m=s.match(/\d+/g)?.map(Number)??[];if(m.length<3)throw new Error("Use RGB values such as 255, 128, 0.");return `#${m.slice(0,3).map(n=>Math.max(0,Math.min(255,n)).toString(16).padStart(2,"0")).join("")}`}
function hexToRgb(s:string){const h=s.replace("#","");const x=h.length===3?h.split("").map(c=>c+c).join(""):h;return `rgb(${parseInt(x.slice(0,2),16)}, ${parseInt(x.slice(2,4),16)}, ${parseInt(x.slice(4,6),16)})`}
function nums(s:string){return s.split(/[,\s]+/).map(Number).filter(Number.isFinite)}
function average(s:string){const a=nums(s);return String(a.reduce((x,y)=>x+y,0)/a.length)}
function median(s:string){const a=nums(s).sort((x,y)=>x-y);return String(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2)}
function ratio(s:string){const a=nums(s);if(a.length<2)throw new Error("Enter two numbers.");const g=(x:number,y:number):number=>y?g(y,x%y):Math.abs(x);const d=g(a[0],a[1]);return `${a[0]/d}:${a[1]/d}`}
function percentageChange(s:string){const a=nums(s);if(a.length<2)throw new Error("Enter old and new values.");return `${((a[1]-a[0])/a[0]*100).toFixed(2)}%`}
function age(s:string){const d=new Date(s.trim());if(Number.isNaN(d.getTime()))throw new Error("Enter your birth date.");const now=new Date();return String(now.getFullYear()-d.getFullYear()-((now.getMonth()<d.getMonth()||(now.getMonth()===d.getMonth()&&now.getDate()<d.getDate()))?1:0))}
function dateDiff(s:string){const [a,b]=s.split(/\s*to\s*|\n/);const x=new Date(a),y=new Date(b);if(isNaN(+x)||isNaN(+y))throw new Error("Enter two dates separated by 'to'.");return `${Math.abs(y.getTime()-x.getTime())/86400000} days`}
function duration(s:string){const a=nums(s);if(a.length<2)throw new Error("Enter start and end times in minutes.");return `${Math.abs(a[1]-a[0])} minutes`}
function simpleInterest(s:string){const a=nums(s);if(a.length<3)throw new Error("Enter principal, rate %, time.");return String(a[0]*a[1]*a[2]/100)}
function compoundInterest(s:string){const a=nums(s);if(a.length<3)throw new Error("Enter principal, rate %, periods.");return String(a[0]*Math.pow(1+a[1]/100,a[2]))}
function discount(s:string){const a=nums(s);if(a.length<2)throw new Error("Enter price and discount %.");return String(a[0]*(1-a[1]/100))}
function profitMargin(s:string){const a=nums(s);if(a.length<2)throw new Error("Enter revenue and cost.");return `${((a[0]-a[1])/a[0]*100).toFixed(2)}%`}
function markup(s:string){const a=nums(s);if(a.length<2)throw new Error("Enter cost and selling price.");return `${((a[1]-a[0])/a[0]*100).toFixed(2)}%`}
function breakEven(s:string){const a=nums(s);if(a.length<2)throw new Error("Enter fixed costs and contribution margin.");return String(a[0]/a[1])}
function metaTags(s:string){const [title="",description="",url=""]=s.split(/\n/);return `<title>${escapeHtml(title)}</title>\n<meta name="description" content="${escapeHtml(description)}">\n<link rel="canonical" href="${escapeHtml(url)}">`}
function ogTags(s:string){const [title="",description="",url=""]=s.split(/\n/);return `<meta property="og:title" content="${escapeHtml(title)}">\n<meta property="og:description" content="${escapeHtml(description)}">\n<meta property="og:url" content="${escapeHtml(url)}">`}
function twitterTags(s:string){const [title="",description=""]=s.split(/\n/);return `<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${escapeHtml(title)}">\n<meta name="twitter:description" content="${escapeHtml(description)}">`}
function generic(slug:string,s:string){return `${slug.replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase())}\n\nInput received successfully. This browser-first tool is ready for the next transformation.`}

export function StrategicToolWorkspace({ slug }: { slug: string }) {
  const [input,setInput]=useState(""); const [output,setOutput]=useState(""); const [error,setError]=useState("");
  const run=()=>{try{setError("");setOutput(transform(slug,input))}catch(e){setOutput("");setError(e instanceof Error?e.message:String(e))}};
  useEffect(()=>{setInput("");setOutput("");setError("")},[slug]);
  const placeholder=useMemo(()=>slug.includes("calculator")?"Enter numbers separated by spaces or commas…":"Paste or type your input here…",[slug]);
  return <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-widest text-slate-500">Input</div><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={placeholder} className="min-h-72 w-full resize-y bg-slate-950 p-4 font-mono text-sm text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20" /></section>
      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-widest text-slate-500">Output</div><textarea value={output} readOnly placeholder="Your result will appear here…" className="min-h-72 w-full resize-y bg-slate-950 p-4 font-mono text-sm text-slate-200 outline-none" /></section>
    </div>
    {error&&<div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 font-mono text-xs text-rose-300">{error}</div>}
    <div className="flex flex-wrap gap-2"><button onClick={run} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Run tool</button><button onClick={()=>navigator.clipboard.writeText(output)} disabled={!output} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-40">Copy result</button><button onClick={()=>{setInput("");setOutput("");setError("")}} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Clear</button></div>
    <p className="text-xs text-slate-600">Client-side processing · No signup · Your input is not sent to ElDevo.</p>
  </div>;
}
