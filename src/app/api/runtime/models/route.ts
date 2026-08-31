import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    models: [
      { id: "mock:default", provider: "mock", label: "Mock (development)", available: true },
      { id: "openai:gpt-5.6", provider: "openai", label: "OpenAI", available: Boolean(process.env.OPENAI_API_KEY) },
    ],
  });
}
