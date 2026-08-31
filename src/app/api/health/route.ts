import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    service: "eldevo",
    status: "ok",
    runtime: "v0.1",
    timestamp: new Date().toISOString()
  });
}
