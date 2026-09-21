---
title: Evidence, not attestation
date: Sep 6, 2026
tag: Compliance
summary: An auditor does not want a signed claim that a control exists. They want the record that it ran. Compliance evidence produced by the system rather than asserted about it.
author: Upendra Bhandari
cover: ./posts/images/evidence-cover.jpg
---
## EU AI Act obligations bound to the agents actually running

When a supervisor asks "show me that this control was operating on 14 March", most AI Act compliance programme cannot answer. Not because nobody did the work — because the work lives in documents that were never connected to the systems they describe.

We solved this once already. In 2013 data lineage was a Visio diagram and control attestations were a spreadsheet: complete, signed off, and connected to nothing. BCBS 239 was not fixed with better documents. It was fixed by binding them to the systems — lineage from real metadata, controls pointed at real pipelines, evidence produced by the estate rather than describing it.

The AI Act makes it harder still, because Articles 12, 14 and 72 do not ask for descriptions. Record-keeping, human oversight and post-market monitoring are runtime properties. You cannot document human oversight into existence: either a run paused, a named person decided, and there is a record of it — or it did not happen.

## How it works

An agent runs, and its traces, guardrail checks, evaluation runs and human approvals arrive in the plane — the same telemetry your platform team already uses for debugging. That agent belongs to a registered AI system, classified once, and the classification decides which obligations apply. A compliance lead records a verdict on each and attaches the runs behind it.

![Compliance evidence in the FastAIAgent console](./posts/images/evidence-1.png)

## 1 · The register is the running system

Not a spreadsheet row that may no longer correspond to anything. An AI system is a named group of the agents and chains that actually run — here the whole Hiring project, so new agents added to it follow automatically. One agent belongs to exactly one system, enforced by a database constraint.

![Compliance evidence in the FastAIAgent console](./posts/images/evidence-2.png "Member chips are live agents and chains; dashed chips follow via a project scope.")

## 2 · Obligations are derived, and the derivation is on the record

The classification comes from a deterministic rule engine — keyword matching plus a five-question assessment, no model, no LLM — so it re-runs to the same answer in front of a regulator. Stored with it: the tier, the confidence, and the reasoning in plain words. That classification then decides the obligation set — 58 of 65 controls for a high-risk provider, 22 for a deployer, 10 for limited-risk.

![Compliance evidence in the FastAIAgent console](./posts/images/evidence-3.png "Classification, reasoning and confidence; the derived obligation count; the members it applies to.")

## 3 · Evidence is the actual run

Left: every runtime record the plane ingested from this system's own members, not a global list to search. Right: what is attached, grouped by the obligation it backs — Article 14 human oversight backed by an actual human-in-the-loop approval, Article 13 by a real prompt approval. Each item says "snapshot frozen at tag time": the record is copied server-side by re-reading the source, so a browser can never assert what a run said.

![Compliance evidence in the FastAIAgent console](./posts/images/evidence-4.png "The member-scoped signal feed on the left, obligations and their attached records on the right.")

Evidence is also protected. Deleting a record that backs an obligation is refused, and the refusal names what it would break — this is the live response:

```
DELETE /api/v1/agents/{agent_id}/eval-runs/{run_id}   →  HTTP 409

{ "error": "compliance_evidence_attached",
  "message": "1 eval run attached as compliance evidence on
              Hiring Assistant (ARTICLE15-044)." }
```

Forced through anyway, or expired by retention? The sweep detects it, stamps the item, writes an evidence_source_deleted entry to the ledger and raises a critical card on the home page. The frozen snapshot survives. Evidence cannot quietly disappear.

## 4 · Breaches surface on their own

The SDK enforces guardrails locally — the plane never sits in the request path — then reports what happened. Here is a model-judged check set to fail open, so a judge outage cannot take hiring offline:

```
bias = Guardrail(
    name="bias-language",
    guardrail_type=GuardrailType.llm_judge,
    position="output",
    on_error="allow",          # fail open if the judge call raises
)
```

Months later the judge call starts timing out. Nothing throws, nothing pages anyone, and the agent keeps answering. What reaches the plane is errored = True and passed = True — passed only because the policy says allow.

The trace says passed. Only errored reveals that nothing was actually checked while output kept going to candidates. Any dashboard reading the verdict alone shows green. The plane joins errored to the guardrail's registered on_error policy, and that combination — degraded check, fail-open policy, traffic still flowing — becomes the finding below.

Nothing on this screen was typed by a person. A sweep runs every fifteen minutes, and severity is scaled by the system's own risk tier — which is why the same class of failure is critical on the high-risk Hiring Assistant and medium on the limited-risk Support Desk. A guardrail that blocks is the control working and produces no finding; only a degraded one does.

![Compliance evidence in the FastAIAgent console](./posts/images/evidence-5.png "Two findings, neither filed by a human, each naming its system, article and control.")

## 5 · The record itself is verifiable

Every compliance act — registration, classification, each verdict, each evidence attach or detach, each finding — is appended to a per-tenant SHA-256 hash chain, in the same database transaction as the act itself. You cannot do the thing without creating the record.

![Compliance evidence in the FastAIAgent console](./posts/images/evidence-6.png "The ledger, with the integrity check re-run on load.")

The integrity check is an endpoint, not a claim in a brochure. It walks the chain and reports the first row where a hash or a link fails — catching an edit, a deletion or a reordering:

```
GET /api/v1/compliance/event-log/verify
  →  {"valid": true, "total": 293, "broken_at": null}
```

Stated precisely: this is tamper-evident, not tamper-proof. Nothing physically stops a database administrator from editing a row — the chain is what makes it impossible to do so undetected, which is what an auditor actually needs.

## What this does not do

![Compliance evidence in the FastAIAgent console](./posts/images/evidence-7.png)

What a compliance officer can demonstrate here that a spreadsheet cannot: that the thing being assessed is the thing that runs; that the obligation set was derived rather than chosen; that the evidence is the actual record, linked and frozen; that evidence cannot vanish unnoticed; that some breaches surface without anyone looking; and that the record of all of it is verifiable.

FastAIAgent Enterprise — a control plane for governing AI agents, deployable on-premises or as managed SaaS.

Check out : [https://fastaiagent.net/](https://fastaiagent.net/)

If you're working through AI Act readiness, get in touch — happy to show you what the evidence layer looks like against a real agent.
