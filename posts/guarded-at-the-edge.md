---
title: Guarded at the Edge. Governed from the Plane.
date: Sep 30, 2026
tag: Guardrails
kind: video
minutes: 2
summary: Your agents run in your environment, so their guardrails have to run there too. Author a rule once on the plane, every connected agent enforces it at the edge — and every check it ran is on the record.
author: Upendra Bhandari
cover: ./posts/images/guarded-at-the-edge-cover.jpg
---

Your agents run in your environment. So who controls their guardrails?

If the answer is "each team, in each codebase", you have as many policies as you have agents, and no single place that can tell you what was actually enforced.

## Enforced at the edge

In the FastAIAgent SDK a guardrail is one line — PII detection, model-judged toxicity, a regex on the input. It runs inside your own process, before the request reaches the model. And `connect()` pulls the plane's policy in alongside it.

## Governed from the plane

![Guardrails authored centrally and enforced at the edge](/posts/videos/guarded-at-the-edge.mp4 "Activity, filtered to blocked: the wire-transfer request stopped at the edge by block_wire_requests, before it ever reached the model.")

On the plane, the rules are a catalog: kind, action, severity, fail policy, and where each one is enforced. Author a rule there and every connected agent picks it up. Test it against sample text before it ships — PII masking rewrites the reply and records counts, never the values themselves.

Activity is the record of every check the agents ran: passed, blocked at the edge, or could not run. In the demo, a wire-transfer request is blocked on the input and never reaches the model.

The overview keeps score, and flags what the edge cannot see about itself: a check that could not run on a fail-open rule. That is the case that matters most, because a guardrail that silently stepped aside looks exactly like one that passed.

Author once, enforce everywhere, prove it.

The argument behind this is in [Guardrails that actually block](/blog/guardrails-that-actually-block/), and the four checkpoints a rule can sit at are in [Guardrails aren't just about what goes into your agent](/blog/guardrails-at-every-checkpoint/).
