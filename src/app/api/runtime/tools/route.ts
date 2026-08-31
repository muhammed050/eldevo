import { NextResponse } from "next/server";
import { listTools } from "@/lib/agents/tools";

export async function GET() {
  return NextResponse.json({ tools: listTools() });
}
