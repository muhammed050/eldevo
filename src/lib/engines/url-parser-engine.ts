import { pretty, requireInput } from "./shared";
export const run = (input: string) => { requireInput(input); const url = new URL(input); return pretty({ href: url.href, protocol: url.protocol, hostname: url.hostname, port: url.port || null, pathname: url.pathname, search: url.search, hash: url.hash, params: Object.fromEntries(url.searchParams.entries()) }); };
