import { pretty, requireInput } from "./shared";
export const run = (input: string) => {
  requireInput(input);
  const [jsonText, pathText] = input.split(/\n---PATH---\n/i);
  let value: unknown = JSON.parse(jsonText);
  const path = (pathText || "$").trim().replace(/^\$\.?/, "");
  for (const token of path.split(/[.\[\]]/).filter(Boolean)) {
    if (token === "*") value = Array.isArray(value) ? value : Object.values((value ?? {}) as Record<string, unknown>);
    else if (Array.isArray(value)) value = value[Number(token)];
    else if (value && typeof value === "object") value = (value as Record<string, unknown>)[token];
    else value = undefined;
  }
  return pretty(value);
};
