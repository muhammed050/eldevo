# Eldevo

> **The Operating System for AI Employees**

Eldevo is an AI workforce platform designed to let companies deploy autonomous AI employees and teams that can plan work, use tools, access company knowledge, execute real-world actions under policy controls, request human approval for risky operations, and maintain an auditable history of everything they do.

The long-term goal is not to build another chatbot. Eldevo is intended to become an **Agent Operating System + Marketplace + API**: a platform where companies deploy AI employees, developers publish agents and tools, and applications consume agent capabilities programmatically.

---

## Vision

A company should be able to tell Eldevo what outcome it wants instead of manually operating dozens of AI tools.

Example:

> "Find 100 qualified B2B prospects in Germany, research each company, score them, prepare personalized outreach, ask me before sending, then update the CRM."

Eldevo decomposes the objective, selects an agent and tools, executes steps, enforces permissions and budgets, pauses for approval when required, records usage, and returns a verifiable result.

### Core execution model

```text
USER
  ↓
SUPABASE AUTH
  ↓
ORGANIZATION
  ↓
AGENT FROM DATABASE
  ↓
CREATE TASK
  ↓
PERSIST TASK
  ↓
PLANNER
  ↓
PERSIST TASK STEPS
  ↓
EXECUTOR
  ↓
MODEL / TOOL
  ↓
POLICY ENGINE
  ├── SAFE ─────────────→ EXECUTE
  └── HIGH RISK ────────→ HUMAN APPROVAL
                              ↓
                         APPROVE / REJECT
  ↓
UPDATE TASK
  ↓
USAGE / COST
  ↓
AUDIT LOG
```

---

# Project Status & Roadmap

Legend: **✅ completed** · **🔄 current/next** · **⬜ planned**

## Phase 0 — Product Foundation

- [x] Define Eldevo product vision and positioning.
- [x] Define Eldevo as an AI Workforce / Agent Operating System.
- [x] Define multi-tenant Organization architecture.
- [x] Define Agent → Task → Step execution model.
- [x] Choose Next.js + TypeScript architecture.
- [x] Choose Supabase/PostgreSQL for persistence and Auth.

## Phase 1 — Database Foundation

- [x] Organizations foundation.
- [x] Organization memberships and roles.
- [x] Agent persistence.
- [x] Task persistence.
- [x] Task-step persistence.
- [x] Approval persistence.
- [x] Audit-log persistence.
- [x] Indexes for runtime entities.
- [x] Row Level Security foundation.
- [x] Organization isolation for Agent/Task/Approval/Audit data.

## Phase 2 — Runtime Foundation

- [x] Agent definitions and lifecycle states.
- [x] Task lifecycle states.
- [x] Planner foundation.
- [x] Executor foundation.
- [x] Tool abstraction.
- [x] Tool risk levels: low / medium / high.
- [x] Agent permission checks.
- [x] Agent budget checks.
- [x] Human-approval decision in policy layer.
- [x] Model-provider abstraction.
- [x] Mock model for development.
- [x] OpenAI provider foundation.
- [x] Runtime model registry endpoint.
- [x] Server-side Supabase client.
- [x] Authenticated task endpoint foundation.
- [x] Agent lookup scoped to the user's organization.
- [x] Runtime audit event foundation.

## Phase 3 — Production Execution Engine

- [x] Persist task before execution.
- [x] Persist planned task steps.
- [x] Persist step state transitions.
- [x] Persist execution output/errors.
- [x] Persist token usage.
- [x] Persist execution cost.
- [x] Create approval records from risky steps.
- [x] Approval statuses: pending / approved / rejected / expired.
- [x] Approval decision permissions.
- [x] Resume a paused task after approval.
- [x] Atomic state transitions and idempotency keys.
- [x] Retry policy with exponential backoff.
- [ ] Timeout and cancellation handling.
- [ ] Concurrent step execution where safe.
- [x] Durable background worker/queue.
- [x] Dead-letter handling.
- [ ] Per-step tracing.
- [ ] Complete runtime error taxonomy.
- [ ] Production-grade usage/cost accounting.

## Phase 4 — Tool Registry

- [ ] Database-backed tool registry.
- [ ] Tool versions.
- [ ] Tool schemas using Zod/JSON Schema.
- [ ] Tool configuration and secrets references.
- [ ] Organization-specific tools.
- [ ] Global platform tools.
- [ ] Tool permissions and scopes.
- [ ] Tool risk classification.
- [ ] Tool execution logs.
- [ ] Tool health checks.
- [ ] Tool timeouts and retries.
- [ ] Tool sandboxing.
- [ ] Tool marketplace publishing.

## Phase 5 — Eldevo Memory / Brain

- [ ] Working memory for the current task.
- [ ] Conversation/task history.
- [ ] Episodic memory.
- [ ] Semantic memory.
- [ ] Organization knowledge base.
- [ ] Document ingestion.
- [ ] Chunking and metadata.
- [ ] Embeddings/vector search.
- [ ] Hybrid retrieval.
- [ ] Permission-aware retrieval.
- [ ] Memory relevance scoring.
- [ ] Memory expiration/retention policies.
- [ ] User-controlled memory deletion.
- [ ] Source citations/provenance.

## Phase 6 — Model Router

- [ ] Unified model interface.
- [ ] OpenAI models.
- [ ] Anthropic models.
- [ ] Google models.
- [ ] Open-source/local models.
- [ ] Automatic model selection.
- [ ] Cost-aware routing.
- [ ] Latency-aware routing.
- [ ] Fallback providers.
- [ ] Context-window management.
- [ ] Token budgets.
- [ ] Provider health monitoring.
- [ ] Model usage analytics.

## Phase 7 — Agent Runtime Intelligence

- [ ] LLM-powered planner.
- [ ] Structured plans.
- [ ] Dynamic replanning.
- [ ] Tool selection by the model.
- [ ] Tool-call validation.
- [ ] Result validation.
- [ ] Self-correction loops.
- [ ] Goal completion evaluator.
- [ ] Agent stop conditions.
- [ ] Maximum-step limits.
- [ ] Context compression.
- [ ] Agent state machine.

## Phase 8 — Multi-Agent Teams

- [ ] Team entity.
- [ ] Team manager / orchestrator.
- [ ] Specialist agents.
- [ ] Agent-to-agent delegation.
- [ ] Shared team context.
- [ ] Agent handoffs.
- [ ] Parallel research.
- [ ] Team budgets.
- [ ] Team-level approvals.
- [ ] Team observability.
- [ ] Team templates.

Example:

```text
AI CEO / Manager
├── Researcher
├── Market Analyst
├── Sales Agent
├── SEO Agent
├── Financial Analyst
└── Reviewer
```

## Phase 9 — First Commercial Product: Eldevo Sales Team

- [ ] Sales workspace.
- [ ] Prospect research.
- [ ] Company enrichment.
- [ ] Lead qualification.
- [ ] Lead scoring.
- [ ] Personalized outreach drafts.
- [ ] Human approval before sending.
- [ ] Follow-up planning.
- [ ] CRM synchronization.
- [ ] Meeting booking workflow.
- [ ] Sales analytics.
- [ ] Outcome-based pricing experiments.

Target outcome:

> Sell qualified leads / meetings / pipeline outcomes rather than selling "AI messages".

## Phase 10 — Integrations

- [ ] Gmail.
- [ ] Calendar.
- [ ] Slack.
- [ ] Microsoft Teams.
- [ ] Notion.
- [ ] Google Drive.
- [ ] GitHub.
- [ ] CRM providers.
- [ ] Webhooks.
- [ ] Generic REST API tools.
- [ ] OAuth connection management.

## Phase 11 — Security & Governance

- [ ] RBAC.
- [ ] Fine-grained permissions.
- [ ] Agent capability policies.
- [ ] Spending limits.
- [ ] Domain allowlists/blocklists.
- [ ] API scope restrictions.
- [ ] Human approval policies.
- [ ] Immutable audit events.
- [ ] Secret isolation.
- [ ] Prompt-injection defenses.
- [ ] Tool-output sanitization.
- [ ] SSRF protections.
- [ ] Sandbox execution.
- [ ] Data retention controls.
- [ ] Enterprise security controls.

## Phase 12 — Developer Platform & API

- [ ] API keys.
- [ ] API authentication.
- [ ] Task API.
- [ ] Agent API.
- [ ] Team API.
- [ ] Tool API.
- [ ] Memory API.
- [ ] Webhooks.
- [ ] SDKs.
- [ ] Rate limiting.
- [ ] Usage metering.
- [ ] Developer dashboard.
- [ ] API documentation.

Example future API:

```http
POST /v1/tasks
```

```json
{
  "goal": "Find 50 qualified B2B leads in Germany",
  "budget": 20,
  "deadline": "2h"
}
```

## Phase 13 — Agent Marketplace

- [ ] Agent publishing.
- [ ] Agent profiles.
- [ ] Versioning.
- [ ] Reviews and ratings.
- [ ] Install/deploy flow.
- [ ] Paid agents.
- [ ] Creator payouts.
- [ ] Eldevo platform commission.
- [ ] Tool marketplace.
- [ ] Team marketplace.
- [ ] Enterprise/private agents.

Long-term marketplace flow:

```text
Developer
   ↓
Build Agent
   ↓
Publish on Eldevo
   ↓
Companies Install
   ↓
Agent Performs Work
   ↓
Creator Earns
   ↓
Eldevo Takes Platform Fee
```

## Phase 14 — Enterprise

- [ ] Enterprise organizations.
- [ ] SSO/SAML.
- [ ] SCIM.
- [ ] Advanced RBAC.
- [ ] Private agents.
- [ ] Private tools.
- [ ] Private knowledge bases.
- [ ] Dedicated infrastructure options.
- [ ] Advanced audit exports.
- [ ] Compliance program.
- [ ] SLA/uptime monitoring.
- [ ] Enterprise billing.

## Phase 15 — Billing & Economics

- [ ] Subscription plans.
- [ ] Usage billing.
- [ ] Agent billing.
- [ ] Team billing.
- [ ] API metering.
- [ ] Credit system.
- [ ] Cost attribution per task.
- [ ] Cost attribution per agent.
- [ ] Cost attribution per organization.
- [ ] Marketplace commissions.
- [ ] Creator payouts.
- [ ] Enterprise contracts.

Potential model:

```text
SaaS subscription
       +
AI employee usage
       +
API usage
       +
Marketplace commission
       +
Enterprise contracts
```

## Phase 16 — Observability & Reliability

- [ ] Runtime dashboard.
- [ ] Agent health.
- [ ] Task tracing.
- [ ] Tool tracing.
- [ ] Model latency.
- [ ] Token/cost analytics.
- [ ] Error analytics.
- [ ] Success-rate analytics.
- [ ] Queue monitoring.
- [ ] Alerts.
- [ ] Incident tooling.
- [ ] SLOs/SLIs.

## Phase 17 — Scale

- [ ] Background workers.
- [ ] Queue architecture.
- [ ] Horizontal scaling.
- [ ] Caching.
- [ ] Rate limiting.
- [ ] Multi-region strategy.
- [ ] Database scaling.
- [ ] Vector-store scaling.
- [ ] Provider failover.
- [ ] Disaster recovery.
- [ ] Backups and restore tests.

## Phase 18 — Growth / SEO / Acquisition

- [ ] Marketing website.
- [ ] Agent landing pages.
- [ ] Tool landing pages.
- [ ] Programmatic SEO where valuable.
- [ ] Documentation SEO.
- [ ] Free agent templates.
- [ ] Product-led onboarding.
- [ ] Referral program.
- [ ] Creator acquisition.
- [ ] Sales-led enterprise acquisition.

---

# Architecture

```text
                    ┌──────────────────────┐
                    │       Eldevo         │
                    │ AI Workforce Platform│
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
          Dashboard           API           Marketplace
              │                │                │
              └────────────────┼────────────────┘
                               ↓
                         Auth / Tenant
                               ↓
                        Agent Runtime
                               │
             ┌─────────────────┼─────────────────┐
             ↓                 ↓                 ↓
          Planner         Model Router       Memory
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ↓
                         Tool Registry
                               ↓
                         Policy Engine
                         /           \
                      Safe          Risky
                       ↓               ↓
                   Execute         Approval
                       \               /
                        └──────┬──────┘
                               ↓
                          Task Result
                               ↓
                    Usage / Audit / Analytics
```

---

# Core Domain Objects

## Organization

Tenant boundary for users, agents, tasks, tools, memory, billing and audit data.

## Membership

Connects a user to an organization and determines their role.

## Agent

An AI employee definition containing instructions, model, tools, permissions, budget and lifecycle state.

## Task

A concrete objective assigned to an Agent.

## Task Step

A durable unit of work inside a Task.

## Tool

A capability an Agent can invoke. Every tool has a schema, permissions and risk classification.

## Approval

A human decision gate for sensitive operations.

## Memory

Persistent context that lets an Agent remember useful information and retrieve organization knowledge.

## Audit Log

Historical record of security-sensitive and business-relevant actions.

## Team

A coordinated collection of specialized Agents working toward one objective.

---

# Security Principles

Eldevo must never trust an Agent definition, permission, budget or organization identifier supplied directly by an untrusted client.

The server must derive authorization from authenticated identity and database state.

High-risk operations must be able to stop execution and request human approval.

Every organization is isolated through authorization and PostgreSQL Row Level Security.

Secrets should never be exposed to model context unless explicitly required and policy-approved.

Tool outputs must be treated as untrusted data.

All external actions should be observable and auditable.

---

# Current Runtime Status

The repository already contains the initial Agent runtime layer with planner, policy, runtime, tools and model abstractions. The Agent type currently includes model, tools, permissions, budget and lifecycle state; the Task type includes execution state and usage information.

The planner currently creates the initial execution stages, while the policy layer checks permissions, budget and high-risk approval requirements.

The initial tool system supports risk levels and registration, with an `echo` development tool available for runtime verification.

The Production Execution Engine now also supports approval-driven task resumption, atomic state transitions/idempotency, durable task queueing, retry backoff, dead-letter handling, and a protected worker execution endpoint.

---

# Technology Direction

- **Frontend:** Next.js + React + TypeScript
- **Backend:** Next.js server-side APIs / runtime services
- **Database:** PostgreSQL through Supabase
- **Authentication:** Supabase Auth
- **AI orchestration:** Vercel AI SDK / provider adapters
- **Validation:** Zod
- **Vector / Memory:** PostgreSQL + pgvector initially, with the option to introduce a specialized vector store later
- **Jobs:** Durable queue/worker architecture as execution volume grows
- **Deployment:** Vercel for web/API surfaces with separate workers where durable background execution requires them

---

# Product Strategy

Eldevo should not compete by being another generic chat interface.

The product moat should come from:

1. **Execution** — Agents actually perform work.
2. **Memory** — Eldevo understands the company's context.
3. **Tools** — Agents can interact with real systems.
4. **Governance** — Companies can safely control autonomous actions.
5. **Teams** — Multiple specialists can collaborate.
6. **Outcomes** — Customers pay for business results, not just generated text.
7. **Marketplace** — Developers can create and monetize AI employees.
8. **API** — Other products can build on Eldevo's runtime.

---

# First Commercial Wedge

The first serious commercial product should be **Eldevo Sales Team**.

A customer provides a target market and sales goal. Eldevo researches prospects, enriches and qualifies them, scores opportunities, creates personalized outreach, requests approval for outbound actions, follows up and updates the CRM.

The commercial message should focus on measurable outcomes:

> **Get more qualified meetings and pipeline with an AI sales team.**

Not:

> "Get 10 AI agents."

---

# Long-Term Business Model

Eldevo can eventually have several revenue streams:

- SaaS subscriptions.
- AI employee usage.
- Task/API usage.
- Marketplace commissions.
- Enterprise contracts.
- Premium private agents and teams.
- Managed/private infrastructure.

The long-term vision is to make Eldevo the infrastructure layer through which companies deploy, govern and purchase AI labor.

---

# Development Rule

Do not build all features simultaneously.

The recommended order is:

```text
Production Runtime
      ↓
Tool Registry
      ↓
Memory / Brain
      ↓
Model Router
      ↓
First Sales Agent
      ↓
Sales Team
      ↓
Integrations
      ↓
Security Hardening
      ↓
API
      ↓
Marketplace
      ↓
Enterprise
      ↓
Scale
```

Every phase should have tests, security review and a working vertical slice before moving to the next major phase.
