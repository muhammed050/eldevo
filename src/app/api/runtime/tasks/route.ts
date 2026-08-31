import { NextResponse } from "next/server";
import { z } from "zod";
import { executeTask } from "@/lib/agents/runtime";
import type { AgentDefinition } from "@/lib/agents/types";

const schema = z.object({
  organizationId: z.string().min(1),
  goal: z.string().min(3).max(10000),
  agent: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    instructions: z.string(),
    model: z.string().min(1),
    tools: z.array(z.string()),
    permissions: z.array(z.string()),
    budgetCents: z.number().int().nonnegative().default(1000),
    status: z.enum(["draft", "active", "paused", "archived"]).default("active")
  })
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    if (body.agent.status !== "active") {
      return NextResponse.json({ error: "Agent is not active" }, { status: 409 });
    }
    const result = await executeTask(body, body.agent as AgentDefinition);
    return NextResponse.json(result, { status: result.status === "failed" ? 422 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
