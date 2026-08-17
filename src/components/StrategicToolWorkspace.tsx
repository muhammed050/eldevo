"use client";

import { UniversalToolWorkspace } from "./UniversalToolWorkspace";

/**
 * Backwards-compatible wrapper for older pages.
 * Tool execution must go through the single real execution engine; this component
 * intentionally contains no transformation logic or fallback output.
 */
export function StrategicToolWorkspace({ slug }: { slug: string }) {
  return <UniversalToolWorkspace slug={slug} />;
}
