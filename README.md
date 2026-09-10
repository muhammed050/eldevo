# Eldevo

> **The Operating System for AI Employees**

Eldevo is an AI workforce platform for deploying autonomous AI employees and teams that plan work, use tools, access company knowledge, execute real-world actions under policy controls, request human approval for risky operations, and maintain an auditable history.

## Project Status & Roadmap

Legend: **✅ completed** · **🔄 current/next** · **⬜ planned**

### Phase 0 — Product Foundation

- [x] Define Eldevo product vision and positioning.
- [x] Define Eldevo as an AI Workforce / Agent Operating System.
- [x] Define multi-tenant Organization architecture.
- [x] Define Agent → Task → Step execution model.
- [x] Choose Next.js + TypeScript architecture.
- [x] Choose Supabase/PostgreSQL for persistence and Auth.

### Phase 1 — Database Foundation

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

### Phase 2 — Runtime Foundation

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

### Phase 3 — Production Execution Engine

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
- [x] Timeout and cancellation handling.
- [ ] Concurrent step execution where safe.
- [x] Durable background worker/queue.
- [x] Dead-letter handling.
- [x] Per-step tracing.
- [x] Complete runtime error taxonomy.
- [ ] Production-grade usage/cost accounting.

### Phase 4 — Tool Registry

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

### Phase 5 — Eldevo Memory / Brain

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

### Phase 6 — Model Router

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

### Phase 7 — Agent Runtime Intelligence

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

### Phase 8 — Multi-Agent Teams

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

### Phase 9 — Eldevo Sales Team

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

### Phase 10 — Integrations

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

### Phase 11 — Security & Governance

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

### Phase 12 — Developer Platform & API

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

### Phase 13 — Agent Marketplace

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

### Phase 14 — Enterprise

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

### Phase 15 — Billing & Economics

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

### Phase 16 — Observability & Reliability

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

### Phase 17 — Scale

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

### Phase 18 — Growth / SEO / Acquisition

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

## Current Runtime Status

The repository contains the initial Agent runtime with planner, policy, runtime, tools, model abstractions, durable queue/worker support, retry backoff, dead-letter handling, approval-driven resumption, timeout/cancellation handling, per-step tracing, and typed runtime error persistence.

## Development Rule

Build in this order:

```text
Production Runtime → Tool Registry → Memory / Brain → Model Router → Agent Intelligence → Teams → Sales Team → Integrations → Security → API → Marketplace → Enterprise → Scale
```

Every phase must have tests, security review, README synchronization, and a working vertical slice before moving to the next major phase.
