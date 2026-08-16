"use client";

import { useEffect, useMemo, useState } from "react";

const esc=(s:string)=>s.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
const nums=(s:string)=>s.split(/[,\s]+/).map(Number).filter(Number.isFinite);
const lines=(s:string)=>s.split(/\r?\n/);
const rand=(n:number,safe=false)=>{const c=safe?"ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789":"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";const b=crypto.getRandomValues(new Uint8Array(n));return [...b].map(x=>c[x%c.length]).join("")};
const json=(s:string)=>JSON.parse(s);
const sortJson=(v:unknown):unknown=>Array.isArray(v)?v.map(sortJson):v&&typeof v==="object"?Object.fromEntries(Object.entries(v as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,sortJson(x)])):v;
const b64e=(s:string)=>{const b=new TextEncoder().encode(s);let x="";for(const n of b)x+=String.fromCharCode(n);return btoa(x)};
const b64d=(s:string)=>new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0)));
const hex=(b:Uint8Array)=>[...b].map(x=>x.toString(16).padStart(2,"0")).join("");
const hexBytes=(s:string)=>Uint8Array.from(s.replace(/[^0-9a-f]/gi,"").match(/.{1,2}/g)??[],x=>parseInt(x,16));
const simpleDiff=(s:string)=>{const [a,b]=s.split(/\n---DIFF---\n/i);return b===undefined?"Separate two values with ---DIFF---.":a===b?"No differences.":`Left:\n${a}\n\nRight:\n${b}`};
const xmlToJson=(s:string)=>{const d=new DOMParser().parseFromString(s,"application/xml");if(d.querySelector("parsererror"))throw Error("Invalid XML");const walk=(e:Element):unknown=>{const k=[...e.children];if(!k.length)return e.textContent??"";const o:Record<string,unknown>={};for(const x of k){const v=walk(x);o[x.tagName]=o[x.tagName]===undefined?v:Array.isArray(o[x.tagName])?[...(o[x.tagName] as unknown[]),v]:[o[x.tagName],v]}return o};return JSON.stringify({[d.documentElement.tagName]:walk(d.documentElement)},null,2)};
const jsonXml=(v:unknown,r="root"):string=>v===null||typeof v!=="object"?`<${r}>${esc(String(v??""))}</${r}>`:Array.isArray(v)?v.map(x=>jsonXml(x,"item")).join(""):`<${r}>${Object.entries(v as Record<string,unknown>).map(([k,x])=>jsonXml(x,k.replace(/[^\w-]/g,"_")).toString()).join("")}</${r}>`;
const sha=async(s:string,a:"SHA-256"|"SHA-512")=>hex(new Uint8Array(await crypto.subtle.digest(a,new TextEncoder().encode(s))));

async function transform(slug:string,s:string):Promise<string>{
  switch(slug){
    case "json-beautifier":case "json-formatter":return JSON.stringify(json(s),null,2);
    case "json-minifier":return JSON.stringify(json(s));
    case "json-viewer":return JSON.stringify(json(s),null,2);
    case "json-validator":json(s);return "Valid JSON";
    case "json-sorter":return JSON.stringify(sortJson(json(s)),null,2);
    case "json-escape":return JSON.stringify(s).slice(1,-1);
    case "json-unescape":return JSON.parse(`"${s}"`);
    case "json-diff":return simpleDiff(s);
    case "json-to-csv":{const a=json(s) as Record<string,unknown>[];if(!Array.isArray(a)||!a.length)throw Error("Enter a JSON array of objects.");const k=[...new Set(a.flatMap(x=>Object.keys(x)))];return [k.join(","),...a.map(x=>k.map(y=>JSON.stringify(x[y]??"")).join(","))].join("\n")}
    case "json-to-xml":return jsonXml(json(s));
    case "xml-to-json":return xmlToJson(s);
    case "json-to-javascript":return `const data = ${JSON.stringify(json(s),null,2)};`;
    case "json-to-typescript-interface":return jsonTs(json(s));
    case "jsonpath-tester":return jsonPath(json(s));
    case "json-schema-generator":return JSON.stringify(schema(json(s)),null,2);
    case "base64-encoder":return b64e(s); case "base64-decoder":return b64d(s);
    case "url-encoder":return encodeURIComponent(s); case "url-decoder":return decodeURIComponent(s);
    case "html-encoder":return esc(s); case "html-decoder":{const e=document.createElement("textarea");e.innerHTML=s;return e.value}
    case "unicode-escape":return [...s].map(c=>`\\u${c.charCodeAt(0).toString(16).padStart(4,"0")}`).join("");
    case "unicode-decoder":return s.replace(/\\u([0-9a-f]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16)));
    case "hex-encoder":return hex(new TextEncoder().encode(s)); case "hex-decoder":return new TextDecoder().decode(hexBytes(s));
    case "binary-to-text":return new TextDecoder().decode(Uint8Array.from(s.trim().split(/\s+/),x=>parseInt(x,2)));
    case "text-to-binary":return [...new TextEncoder().encode(s)].map(x=>x.toString(2).padStart(8,"0")).join(" ");
    case "ascii-converter":return [...s].map(c=>`${c}: ${c.charCodeAt(0)}`).join("\n");
    case "jwt-generator":return jwtGen(s); case "password-generator":return rand(24,true); case "random-string-generator":return rand(24); case "uuid-generator-v4":return crypto.randomUUID();
    case "api-key-generator":return `eld_${rand(40,true)}`; case "secret-key-generator":return rand(64,true);
    case "md5-generator":return "MD5 is not provided by the browser Web Crypto API. Use SHA-256 or SHA-512 for modern security.";
    case "sha256-generator":return await sha(s,"SHA-256"); case "sha512-generator":return await sha(s,"SHA-512");
    case "hmac-generator":return await hmac(s);
    case "regex-generator":return regexGen(s); case "regex-explainer":return regexExplain(s); case "regex-escape":return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    case "email-regex-tester":return regexTest(s,/^[^\s@]+@[^\s@]+\.[^\s@]+$/); case "url-regex-tester":return regexTest(s,/^https?:\/\/[^\s]+$/i);
    case "html-minifier":return s.replace(/<!--[\s\S]*?-->/g,"").replace(/>\s+</g,"><").trim(); case "html-validator":return htmlValidate(s);
    case "html-to-markdown":return htmlMd(s); case "markdown-to-html":return mdHtml(s);
    case "css-formatter":return cssFormat(s); case "css-minifier":return s.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\s+/g," ").replace(/\s*([{}:;,])\s*/g,"$1").trim();
    case "css-gradient-generator":return `background: linear-gradient(135deg, #06b6d4, #8b5cf6);`; case "css-box-shadow-generator":return `box-shadow: 0 10px 30px rgba(0,0,0,.2);`;
    case "css-border-radius-generator":return `border-radius: 16px;`; case "css-flexbox-generator":return `.container { display:flex; gap:16px; justify-content:center; align-items:center; }`;
    case "css-grid-generator":return `.container { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }`;
    case "javascript-formatter":return jsFormat(s); case "javascript-minifier":return s.replace(/\/\/.*$/gm,"").replace(/\s+/g," ").trim(); case "javascript-escape":return JSON.stringify(s);
    case "cron-parser":case "cron-humanizer":return cron(s); case "http-status-code-checker":return status(s); case "user-agent-parser":return ua(s);
    case "query-string-parser":return queryParse(s); case "query-string-generator":return queryGen(s); case "domain-parser":return domain(s);
    case "email-extractor":return [...new Set(s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)??[])].join("\n"); case "url-extractor":return [...new Set(s.match(/https?:\/\/[^\s"'<>]+/gi)??[])].join("\n");
    case "word-counter":return `Words: ${s.trim()?s.trim().split(/\s+/).length:0}\nCharacters: ${s.length}`; case "character-counter":return String(s.length); case "sentence-counter":return String(s.trim()?(s.match(/[.!?]+(?=\s|$)/g)?.length??1):0);
    case "reading-time-calculator":return `${Math.max(1,Math.ceil((s.trim()?s.trim().split(/\s+/).length:0)/200))} minute(s)`; case "remove-duplicate-lines":return [...new Set(lines(s))].join("\n"); case "sort-lines":return lines(s).sort((a,b)=>a.localeCompare(b)).join("\n");
    case "reverse-text":return [...s].reverse().join(""); case "remove-extra-spaces":return s.replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim(); case "remove-empty-lines":return lines(s).filter(x=>x.trim()).join("\n"); case "text-diff":case "text-compare":return simpleDiff(s); case "slug-generator":return s.trim().toLowerCase().replace(/[^a-z0-9\s-]/gi,"").replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"");
    case "lorem-ipsum-generator":return "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."; case "random-number-generator":return String(Math.floor(Math.random()*1000000)); case "timestamp-generator":return String(Math.floor(Date.now()/1000));
    case "meta-tag-generator":return meta(s); case "open-graph-generator":return og(s); case "twitter-card-generator":return twitter(s); case "schema-markup-generator":case "article-schema-generator":case "breadcrumb-schema-generator":return genericSchema(slug,s); case "faq-schema-generator":return faqSchema(s);
    case "canonical-url-generator":return `<link rel="canonical" href="${esc(s.trim())}" />`; case "serp-snippet-preview":return serp(s); case "keyword-density-checker":return density(s); case "heading-analyzer":return headings(s); case "internal-link-analyzer":return links(s);
    case "percentage-calculator":return String(nums(s)[0]*nums(s)[1]/100); case "percentage-change-calculator":{const a=nums(s);return `${((a[1]-a[0])/a[0]*100).toFixed(2)}%`}; case "ratio-calculator":return ratio(s); case "average-calculator":return String(nums(s).reduce((a,b)=>a+b,0)/nums(s).length); case "median-calculator":return median(s); case "standard-deviation-calculator":return std(s);
    case "age-calculator":return age(s); case "date-difference-calculator":return dateDiff(s); case "time-duration-calculator":return `${Math.abs(nums(s)[1]-nums(s)[0])} minutes`; case "compound-interest-calculator":{const a=nums(s);return String(a[0]*Math.pow(1+a[1]/100,a[2]))}; case "simple-interest-calculator":{const a=nums(s);return String(a[0]*a[1]*a[2]/100)};
    case "discount-calculator":{const a=nums(s);return String(a[0]*(1-a[1]/100))}; case "profit-margin-calculator":{const a=nums(s);return `${((a[0]-a[1])/a[0]*100).toFixed(2)}%`}; case "markup-calculator":{const a=nums(s);return `${((a[1]-a[0])/a[0]*100).toFixed(2)}%`}; case "break-even-calculator":{const a=nums(s);return String(a[0]/a[1])};
    case "image-to-base64":case "base64-to-image":case "image-resizer":case "image-cropper":case "image-compressor":case "jpg-to-png":case "png-to-jpg":case "webp-converter":case "favicon-generator":return "Image processing requires a file input. Use the file controls on this tool page; text input is not supported for this operation.";
    case "qr-code-generator":return `QR payload:\n${s.trim()}\n\nUse a QR-capable browser extension/library to render this payload.`; case "color-picker":return s.trim()||"#06b6d4"; case "hex-color-converter":return s.trim(); case "rgb-to-hex":return rgbHex(s); case "hex-to-rgb":return hexRgb(s);
    case "gitignore-generator":return `# Node / Next.js\nnode_modules/\n.next/\nout/\n.env*\n.DS_Store\n`; case "robots-txt-generator":return "User-agent: *\nAllow: /\n\nSitemap: https://eldevo.com/sitemap.xml"; case "sitemap-generator":return `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://eldevo.com/</loc></url>\n</urlset>`; case "env-generator":return `NODE_ENV=production\nNEXT_PUBLIC_SITE_URL=https://eldevo.com\n`; case "dockerfile-generator":return `FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\nCMD ["npm","start"]`; case "docker-compose-generator":return `services:\n  app:\n    build: .\n    ports:\n      - "3000:3000"`;
    default:throw Error(`This tool is not implemented yet. Please report: ${slug}`);
  }
}

function jsonTs(v:unknown,name="Root"){if(!v||typeof v!=="object"||Array.isArray(v))throw Error("Enter a JSON object.");return `export interface ${name} {\n${Object.entries(v as Record<string,unknown>).map(([k,x])=>`  ${/^\w+$/.test(k)?k:JSON.stringify(k)}: ${Array.isArray(x)?"unknown[]":typeof x==="object"&&x?"Record<string, unknown>":typeof x};`).join("\n")}\n}`}
function jsonPath(v:unknown){return JSON.stringify(v,null,2)+"\n\nTip: enter a JSONPath such as $.users[0].name after the JSON, separated by ---PATH---."}
function schema(v:unknown):unknown{if(Array.isArray(v))return {type:"array",items:v.length?schema(v[0]):{}};if(v&&typeof v==="object")return {type:"object",properties:Object.fromEntries(Object.entries(v as Record<string,unknown>).map(([k,x])=>[k,schema(x)]))};if(typeof v==="string")return {type:"string"};if(typeof v==="number")return {type:"number"};if(typeof v==="boolean")return {type:"boolean"};return {type:"null"}}
function jwtGen(s:string){let p={sub:"1234567890",name:"ElDevo User",iat:Math.floor(Date.now()/1000)};try{p=JSON.parse(s||"{}") }catch{};return `${b64e(JSON.stringify({alg:"none",typ:"JWT"})).replaceAll("=","")}.${b64e(JSON.stringify(p)).replaceAll("=","")}.`}
async function hmac(s:string){const [key,msg]=s.split(/\n---KEY---\n/i);if(!key||!msg)throw Error("Enter message then ---KEY--- then secret key.");const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(msg),{name:"HMAC",hash:"SHA-256"},false,["sign"]);return hex(new Uint8Array(await crypto.subtle.sign("HMAC",k,new TextEncoder().encode(key))))}
function regexGen(s:string){return `/${s.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}/g`}
function regexExplain(s:string){return [...s].map((c,i)=>`${i+1}. ${c}`).join("\n")||"Enter a regex pattern."}
function regexTest(s:string,r:RegExp){return r.test(s.trim())?"Match: valid":"No match: invalid"}
function htmlValidate(s:string){const d=new DOMParser().parseFromString(s,"text/html");return d.documentElement?"HTML parsed successfully":"Invalid HTML"}
function htmlMd(s:string){return s.replace(/<h([1-6])>(.*?)<\/h\1>/gi,(_,n,t)=>`${"#".repeat(Number(n))} ${t}\n`).replace(/<strong>(.*?)<\/strong>/gi,"**$1**").replace(/<em>(.*?)<\/em>/gi,"*$1*").replace(/<p>(.*?)<\/p>/gi,"$1\n\n").replace(/<[^>]+>/g,"").trim()}
function mdHtml(s:string){return s.replace(/^### (.*)$/gm,"<h3>$1</h3>").replace(/^## (.*)$/gm,"<h2>$1</h2>").replace(/^# (.*)$/gm,"<h1>$1</h1>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n\n/g,"<p></p>")}
function cssFormat(s:string){return s.replace(/\{/g," {\n  ").replace(/;/g,";\n  ").replace(/\}/g,"\n}\n").replace(/\n\s*\n/g,"\n")}
function jsFormat(s:string){return s.replace(/\{/g,"{\n  ").replace(/;/g,";\n").replace(/\}/g,"\n}\n")}
function cron(s:string){const p=s.trim().split(/\s+/);if(p.length<5)throw Error("Enter 5 cron fields: minute hour day month weekday.");return `Cron fields:\nMinute: ${p[0]}\nHour: ${p[1]}\nDay: ${p[2]}\nMonth: ${p[3]}\nWeekday: ${p[4]}`}
function status(s:string){const n=Number(s.trim());const m:Record<number,string>={200:"OK",201:"Created",204:"No Content",301:"Moved Permanently",302:"Found",304:"Not Modified",400:"Bad Request",401:"Unauthorized",403:"Forbidden",404:"Not Found",405:"Method Not Allowed",408:"Request Timeout",409:"Conflict",429:"Too Many Requests",500:"Internal Server Error",502:"Bad Gateway",503:"Service Unavailable",504:"Gateway Timeout"};return m[n]?`${n} ${m[n]}`:"Enter a valid HTTP status code."}
function ua(s:string){return JSON.stringify({browser:s.match(/(Chrome|Firefox|Safari|Edge|Opera)/i)?.[1]??"Unknown",os:s.match(/(Windows|Mac OS X|Android|iPhone|Linux)/i)?.[1]??"Unknown",mobile:/Mobile|Android|iPhone/i.test(s)},null,2)}
function queryParse(s:string){const u=new URL(s.includes("?")?s:`https://example.com/?${s.replace(/^\?/,"")}`);return JSON.stringify(Object.fromEntries(u.searchParams.entries()),null,2)}
function queryGen(s:string){const o=json(s) as Record<string,unknown>;return new URLSearchParams(Object.entries(o).map(([k,v])=>[k,String(v)])).toString()}
function domain(s:string){const u=new URL(s.includes("://")?s:`https://${s}`);return JSON.stringify({hostname:u.hostname,protocol:u.protocol,port:u.port||null,path:u.pathname},null,2)}
function ratio(s:string){const a=nums(s);if(a.length<2)throw Error("Enter two numbers.");const g=(x:number,y:number):number=>y?g(y,x%y):Math.abs(x);const d=g(a[0],a[1]);return `${a[0]/d}:${a[1]/d}`}
function median(s:string){const a=nums(s).sort((x,y)=>x-y);return String(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2)}
function std(s:string){const a=nums(s);const m=a.reduce((x,y)=>x+y,0)/a.length;return String(Math.sqrt(a.reduce((x,y)=>x+(y-m)**2,0)/a.length))}
function age(s:string){const d=new Date(s);if(isNaN(+d))throw Error("Enter a valid birth date.");const n=new Date();return String(n.getFullYear()-d.getFullYear()-((n.getMonth()<d.getMonth()||n.getMonth()===d.getMonth()&&n.getDate()<d.getDate())?1:0))}
function dateDiff(s:string){const [a,b]=s.split(/\s*to\s*|\n/);const x=new Date(a),y=new Date(b);if(isNaN(+x)||isNaN(+y))throw Error("Enter two dates separated by 'to'.");return `${Math.abs(y.getTime()-x.getTime())/86400000} days`}
function meta(s:string){const [t="",d="",u=""]=s.split(/\n/);return `<title>${esc(t)}</title>\n<meta name="description" content="${esc(d)}">\n<link rel="canonical" href="${esc(u)}">`}
function og(s:string){const [t="",d="",u=""]=s.split(/\n/);return `<meta property="og:title" content="${esc(t)}">\n<meta property="og:description" content="${esc(d)}">\n<meta property="og:url" content="${esc(u)}">`}
function twitter(s:string){const [t="",d=""]=s.split(/\n/);return `<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${esc(t)}">\n<meta name="twitter:description" content="${esc(d)}">`}
function genericSchema(slug:string,s:string){return JSON.stringify({"@context":"https://schema.org","@type":slug.includes("article")?"Article":slug.includes("breadcrumb")?"BreadcrumbList":"WebPage",name:s||"Example",url:s||"https://example.com"},null,2)}
function faqSchema(s:string){const q=s.split(/\n---FAQ---\n/i);return JSON.stringify({"@context":"https://schema.org","@type":"FAQPage",mainEntity:q.map((x,i)=>({"@type":"Question",name:x.split("\n")[0]||`Question ${i+1}`,acceptedAnswer:{"@type":"Answer",text:x.split("\n").slice(1).join("\n")||"Answer"}}))},null,2)}
function serp(s:string){const [t="",d="",u=""]=s.split(/\n/);return `${t.slice(0,60)}\n${d.slice(0,160)}\n${u}`}
function density(s:string){const [text,key]=s.split(/\n---KEYWORD---\n/i);const words=text.trim().toLowerCase().split(/\s+/).filter(Boolean);const k=(key||"").trim().toLowerCase();return `${words.length?((words.filter(w=>w.replace(/[^\w]/g,"")===k).length/words.length)*100).toFixed(2):0}%`}
function headings(s:string){return [...s.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/gi)].map(m=>`H${m[1]}: ${m[2].replace(/<[^>]+>/g,"")}`).join("\n")||"No HTML headings found."}
function links(s:string){return `Links found: ${(s.match(/<a\b/gi)||[]).length}\nUnique hrefs: ${new Set([...s.matchAll(/href=["']([^"']+)/gi)].map(m=>m[1])).size}`}
function rgbHex(s:string){const a=nums(s);if(a.length<3)throw Error("Use RGB values such as 255,128,0.");return `#${a.slice(0,3).map(x=>Math.max(0,Math.min(255,x)).toString(16).padStart(2,"0")).join("")}`}
function hexRgb(s:string){const h=s.replace("#","");const x=h.length===3?h.split("").map(c=>c+c).join(""):h;return `rgb(${parseInt(x.slice(0,2),16)}, ${parseInt(x.slice(2,4),16)}, ${parseInt(x.slice(4,6),16)})`}

export function StrategicToolWorkspace({slug}:{slug:string}){
 const [input,setInput]=useState("");const [output,setOutput]=useState("");const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 const run=async()=>{setBusy(true);setError("");try{setOutput(await transform(slug,input))}catch(e){setOutput("");setError(e instanceof Error?e.message:String(e))}finally{setBusy(false)}};
 useEffect(()=>{setInput("");setOutput("");setError("")},[slug]);
 const placeholder=useMemo(()=>slug.includes("calculator")?"Enter numbers separated by spaces or commas…":slug.includes("generator")?"Enter optional input or configuration…":"Paste or type your input here…",[slug]);
 return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-widest text-slate-500">Input</div><textarea value={input} onChange={e=>setInput(e.target.value)} placeholder={placeholder} className="min-h-72 w-full resize-y bg-slate-950 p-4 font-mono text-sm text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/20" /></section><section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 px-3 py-2 text-xs uppercase tracking-widest text-slate-500">Output</div><textarea value={output} readOnly placeholder="Your result will appear here…" className="min-h-72 w-full resize-y bg-slate-950 p-4 font-mono text-sm text-slate-200 outline-none" /></section></div>{error&&<div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 font-mono text-xs text-rose-300">{error}</div>}<div className="flex flex-wrap gap-2"><button onClick={run} disabled={busy} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50">{busy?"Running…":"Run tool"}</button><button onClick={()=>navigator.clipboard.writeText(output)} disabled={!output} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 disabled:opacity-40">Copy result</button><button onClick={()=>{setInput("");setOutput("");setError("")}} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300">Clear</button></div><p className="text-xs text-slate-600">Client-side processing · No signup · Your input is not sent to ElDevo.</p></div>;
}
