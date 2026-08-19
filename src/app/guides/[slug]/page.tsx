import type { Metadata } from "next";

type Guide = { title: string; description: string; sections: { heading: string; body: string }[] };
const guides: Record<string, Guide> = {
  "format-json": { title: "How to Format JSON", description: "A practical guide to formatting and validating JSON.", sections: [
    { heading: "What formatting does", body: "Formatting changes whitespace and indentation without changing the data represented by valid JSON. It makes nested objects and arrays easier to inspect." },
    { heading: "Common JSON errors", body: "Typical problems include trailing commas, missing quotation marks, unquoted property names, and mismatched braces or brackets. A formatter cannot reliably repair every invalid document, so validation is useful when parsing fails." },
    { heading: "A practical workflow", body: "Start with the smallest failing input, validate it, format it after it parses, then compare the resulting structure with the data your application expects." },
  ] },
  "decode-jwt": { title: "How JWTs Work and How to Decode Them", description: "Understand JWT structure and the difference between decoding and verification.", sections: [
    { heading: "A JWT has three parts", body: "A JSON Web Token normally contains a header, payload, and signature separated by dots. The first two parts are encoded representations of JSON data." },
    { heading: "Decoding is not verification", body: "Anyone who has a JWT can decode its header and payload. That does not prove the token was issued by a trusted party or that its signature is valid." },
    { heading: "Handle secrets carefully", body: "Do not paste production credentials or sensitive tokens into a tool unless you understand exactly how the tool processes them. Client-side processing does not make an exposed credential safe to disclose." },
  ] },
  "base64": { title: "Base64 Explained", description: "Learn what Base64 encoding is and what it is not.", sections: [
    { heading: "Encoding, not encryption", body: "Base64 converts binary data into a text representation using a defined alphabet. It provides no confidentiality and should never be treated as a password or encryption mechanism." },
    { heading: "Where it is useful", body: "Base64 commonly appears in data URLs, MIME content, API payloads, and places where binary data must travel through text-oriented systems." },
    { heading: "Unicode matters", body: "Text should be converted to bytes using an explicit character encoding such as UTF-8 before Base64 encoding. Otherwise non-ASCII characters can produce surprising results." },
  ] },
  "cron-expressions": { title: "Cron Expressions Explained", description: "Understand the fields and patterns used by cron schedules.", sections: [
    { heading: "The five common fields", body: "Traditional cron schedules use minute, hour, day of month, month, and day of week. Different schedulers can add fields or change semantics, so always check the target scheduler." },
    { heading: "Ranges and lists", body: "Ranges express intervals and commas express multiple allowed values. Steps can select repeated intervals, such as every N minutes within a field." },
    { heading: "Test before deploying", body: "A schedule that looks correct can still run at an unexpected time because of timezone, scheduler-specific semantics, or day-of-month/day-of-week rules. Test it against the actual scheduler you use." },
  ] },
};
export function generateStaticParams() { return Object.keys(guides).map((slug) => ({ slug })); }
export function generateMetadata({ params }: { params: { slug: string } }): Metadata { const guide = guides[params.slug]; return { title: guide?.title ?? "Guide", description: guide?.description, alternates: { canonical: `https://eldevo.com/guides/${params.slug}/` } }; }
export default function GuidePage({ params }: { params: { slug: string } }) { const guide = guides[params.slug]; if (!guide) return <div className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-3xl font-bold">Guide not found</h1></div>; return <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6"><a href="/guides/" className="text-sm">← All guides</a><h1 className="mt-6 text-4xl font-bold tracking-tight">{guide.title}</h1><p className="mt-6 text-lg leading-8 text-slate-400">{guide.description}</p><div className="mt-12 space-y-10">{guide.sections.map((section) => <section key={section.heading}><h2 className="text-2xl font-semibold">{section.heading}</h2><p className="mt-3 leading-8 text-slate-400">{section.body}</p></section>)}</div></article>; }
