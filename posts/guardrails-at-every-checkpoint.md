---
title: Guardrails Aren't Just About What Goes Into Your Agent
date: Aug 27, 2026
tag: Guardrails
kind: video
minutes: 2
summary: It's what comes in, what tools it calls, and what goes out. Three rules created on the Control Plane and blocking live — with zero guardrail code in the agent.
author: Upendra Bhandari
cover: ./posts/images/guardrails-checkpoints-cover.jpg
---

Guardrails aren't just about what goes into your agent — it's what comes in, what tools it calls, and what goes out.

Watch all three rules get created on the FastAIAgent Enterprise Control Plane and then block live: financial advice at the input, `delete_account` before it ever executes, an internal codename before the reply leaves.

Zero guardrail code in the agent.

## One agent, four checkpoints

![Four guardrail checkpoints around one agent: input, tool call, tool result and output](/posts/videos/guardrails-at-every-checkpoint.mp4 "Blocking or parallel at every position — regex, schema, classifier or LLM-judge, authored locally or on the plane.")

The checkpoint that matters most is usually the tool call. An input filter stops a bad request and an output filter stops a bad answer, but only a check between the model and the tool can stop `delete_account` from actually running.

The longer argument is in [Guardrails that actually block](/blog/guardrails-that-actually-block/); the companion demo of a local guardrail blocking PII is in [Guardrails that log violations are just dashboards](/blog/guardrails-block-before-the-provider/). The platform view is on the [Enterprise page](/enterprise.html).
