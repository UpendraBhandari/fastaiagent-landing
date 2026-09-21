---
title: Guardrails That Actually Block
date: Jul 26, 2026
tag: Guardrails
summary: Most guardrails observe and report. A guardrail that cannot stop the action is a log line with good intentions. Policy checked before the agent acts.
author: Upendra Bhandari
series: The Agent Debugging Manifesto
part: 11
cover: ./posts/images/guardrails-cover.jpg
---
Most "AI guardrails" are smoke detectors wired to a notebook: they notice the fire and write it down — after the agent has already sent the reply with the customer's SSN in it. That isn't a guardrail. A guardrail stops the thing before it happens, and stopping something before it happens means standing in the execution path, at the moment of action, with the authority to halt it. A tool that watches your agent from the outside can flag a bad output after the fact; it can never block one, because it was never holding the wheel.

This is about guardrails that hold the wheel.

## Four moments to intervene

An agent turn has only a few points where things go wrong, and a guardrail can sit at each one:

- input — before the model sees the message; catch a prompt injection.
- output — before the reply leaves; catch PII, secrets, or toxicity.
- tool_call — before a tool runs; inspect the arguments and block a URL that isn't on your allowlist.
- tool_result — after a tool returns, before the agent acts on what came back.

You declare where each guardrail runs; the runtime calls it at exactly that moment.

```python
from fastaiagent import Agent, LLMClient, no_pii, no_prompt_injection, json_valid

agent = Agent(
    name="support-bot",
    llm=LLMClient(provider="openai", model="gpt-4o"),
    guardrails=[no_prompt_injection(), no_pii(), json_valid()],
)
```

## Block, or just flag — you choose

When a guardrail runs it returns pass or fail; what a failure does is one flag. A blocking guardrail — the default — raises GuardrailBlockedError and halts the run the instant it fails: the reply is never sent, the tool never called. A non-blocking one records that it fired and lets the run continue — what you want while you're still measuring how often a check would trip before you enforce it (toxicity_check(blocking=False)).

One honest detail: a block terminates the run. There's no silent retry behind your back — control returns to you to decide what happens next. A guardrail that quietly retried around itself would be one you couldn't trust.

You rarely write these from scratch. FastAIAgent ships the common checks as one import — no_pii(), no_secrets(), no_prompt_injection(), json_valid(), allowed_domains(...), toxicity_check(), grounded(...), and the responsible_ai(...) bundle. The deterministic ones — PII, secrets, JSON — are pure rules (a regex, a checksum, a parse), so they can't time out or degrade. When none fit, a custom guardrail is just a callable: return falsy to block, truthy to pass.

## See every guardrail fire

A guardrail you can't observe is one you can't trust. Every evaluation — pass and block — emits its own trace span, and the Local UI has a dedicated Guardrail Events view: every rule that fired, with its type, position, outcome, and agent, plus a detail that ties each event back to the span that triggered it. When someone asks whether your PII guard is actually catching anything, you look instead of guess.

![Guardrails in the FastAIAgent Local UI](./posts/images/guardrails-1.png)

![Guardrails in the FastAIAgent Local UI](./posts/images/guardrails-2.png)

## The failure mode nobody advertises

Here's the part most guardrail libraries leave off the box: the check itself can fail. A model-judged guardrail — "is this toxic?", "is this grounded?" — isn't a rule, it's an LLM call, and LLM calls time out, rate-limit, and throw 401s when a key rotates. When that call fails, the check didn't pass and didn't block. It errored. For years the result was silent: some checks failed open, some failed closed, none of it configurable — and a fail-open looked exactly like a clean pass in your logs. Your moderation API could be down for an hour, every reply sailing through unchecked, and your dashboard would show a wall of green.

FastAIAgent 1.44 makes you answer the question on purpose:

```
toxicity_check(mode="llm", on_error="block")   # fail closed — an errored check blocks
toxicity_check(mode="llm", on_error="allow")   # fail open  — an errored check passes through
```

Which one is correct depends on the agent: a compliance bot would rather block than guess; a high-traffic assistant would rather keep serving than let a flaky API take it offline. Only you know which. And the failure is never silent again — a check that couldn't run is flagged errored, a distinct outcome rather than a pass, with its own span signal and its own row in the Local UI. The fail-open that used to hide in the green now shows up as exactly what it is.

![Guardrails in the FastAIAgent Local UI](./posts/images/guardrails-3.png "SDK UI : Provides detail information on the Guardrail.")

## Who actually blocks? The runtime does

When a guardrail blocks, what blocks it? For a connected agent, always the local runtime — in-process, in the execution path, before the action proceeds. That's the split every mature policy system uses: policy is authored centrally and enforced at the edge. A centrally-defined guardrail (its on_error mode included) is pulled once over a version-hashed endpoint and cached — never asked per request, because at enforcement time there's nothing to ask.

![Guardrails in the FastAIAgent Local UI](./posts/images/guardrails-4.png "Authored centrally, enforced at the edge. Policy is pulled once and cached; the guardrail blocks in-process before the action; evidence flows back up.")

It runs in both directions. A guardrail an admin creates on the plane — with no code in your agent — is pulled on connect and enforced by that same runtime; a connected agent with no local guardrails still blocks on it. So the control plane's job is author, distribute, and detect — never a kill switch. Where it can't guarantee local enforcement happened, it doesn't pretend to have blocked — it records a violation after the fact. For an auditor, that detective control is stronger than a claimed plane-side block: it proves the control operated when it did, and flags precisely when it didn't.

## From a failed check to compliance evidence

Connect to the Enterprise plane and these signals ride the wire you already have. Every run arrives as a trace, and every guardrail evaluation arrives as a span inside it — the same record that shows the LLM and tool calls shows each guardrail that fired, pass or block.

![Guardrails in the FastAIAgent Local UI](./posts/images/guardrails-5.png "On the Enterprise plane: the guardrail spans (no_pii, toxicity, moderation) sit right beside the LLM call.")

From there, the plane persists and distributes each guardrail's on_error policy, surfaces errored as a queryable feed instead of raw span JSON, and turns it into regulatory evidence: an errored-and-fail-open event on a system registered as high-risk becomes a control-non-operational finding under the EU AI Act — severity scaled by the system's risk tier — written to a hash-chained, tamper-evident ledger on a Compliance → Violations page. A scheduled job derives it automatically.

![Guardrails in the FastAIAgent Local UI](./posts/images/guardrails-6.png "Enterprise Plane : Violations based on EU AI Act.")

What that hands a compliance officer isn't a claim ("we have guardrails") but a dated, tamper-evident record that a required safety control went non-operational for this system, at this time, at this severity — and, when it operated correctly, that too. Only agents registered as compliance AI systems, with post-market monitoring, are evaluated this way; an ordinary agent doesn't manufacture violations out of a transient error.

![Guardrails in the FastAIAgent Local UI](./posts/images/guardrails-7.png "Enterprise Plane : AI Compliance Dashboard based on EU AI Act.")

## The point

A guardrail earns the name by doing three things a logger can't: it runs inside the agent at the moment of action, it stops the thing rather than noting it, and it tells you the truth about its own health — including the moment it couldn't run. Watching is easy; a dozen tools do it. Blocking requires being the runtime. Your agent is about to say something, call something, do something — and the only guardrail worth having is the one standing in the doorway, not the one writing the incident report

![Guardrails in the FastAIAgent Local UI](./posts/images/guardrails-8.png "Enterprise +SDK = A Complete Agent Harness.")

FastAIAgent is an open-source agent harness. pip install fastaiagent → [github.com/fastaifoundry/fastaiagent-sdk](http://github.com/fastaifoundry/fastaiagent-sdk)
