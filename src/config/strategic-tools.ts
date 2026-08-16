import type { ToolMeta } from "./tools.config";
import { strategicTools } from "./seo-tools.catalog";

const faq = (title: string): { q: string; a: string }[] => [
  { q: `Is ${title} free?`, a: `Yes. ${title} is available free in your browser.` },
  { q: "Is my data uploaded?", a: "No. The strategic tools are designed for client-side processing whenever the operation can be performed safely in the browser." },
  { q: "Do I need an account?", a: "No signup is required for the tool." },
  { q: "Can I copy or download the result?", a: "Yes when the selected operation produces text or a downloadable browser file." },
];

export const strategicToolMeta: ToolMeta[] = strategicTools.map((tool) => ({
  slug: tool.slug,
  title: tool.title,
  h1: `Free Online ${tool.title}`,
  category: tool.category,
  primaryKeyword: tool.keyword,
  secondaryKeywords: [`${tool.keyword} online`, `free ${tool.keyword}`, `${tool.keyword} tool`],
  searchIntent: `Use ${tool.title} online for a fast browser-based result.`,
  description: tool.description,
  features: ["Free to use", "Browser-based processing", "No signup required", "Copy or download results"],
  usageSteps: ["Enter or paste your input.", "Choose the available options.", "Run the tool and review the result.", "Copy or download the result."],
  codeExample: { input: "Example input", output: "Example output" },
  faqs: faq(tool.title),
  related: [],
}));

export const strategicToolSlugs = new Set(strategicToolMeta.map((tool) => tool.slug));
