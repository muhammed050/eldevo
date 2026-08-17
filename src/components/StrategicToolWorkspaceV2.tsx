"use client";

import { UniversalToolWorkspace } from "./UniversalToolWorkspace";

/** Compatibility wrapper. All execution is delegated to the real tool engine. */
export function StrategicToolWorkspaceV2({ slug }: { slug: string }) {
  return <UniversalToolWorkspace slug={slug} />;
}
