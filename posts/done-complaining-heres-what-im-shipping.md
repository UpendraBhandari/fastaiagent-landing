---
title: I'm Done Complaining. Here's What I'm Shipping
date: May 10, 2026
tag: Announcement
minutes: 6
summary: Five articles on what's broken in agent infrastructure. This is the one where I stop complaining and ship: FastAIAgent, open source, Apache 2.0, runs locally.
author: Upendra Bhandari
cover: /posts/images/fastaiagent-launch-cover.jpg
---

You've read five articles about what's broken in agent infrastructure. This is the one where I stop complaining and tell you what I'm shipping.

## If you missed the series

1. [My prompts are held together with duct tape](https://medium.com/@upendra.bhandari/my-prompts-are-held-together-with-duct-tape-326c3994bf18)
2. [My agent works great in demo, fails in production](https://www.linkedin.com/pulse/my-agent-works-great-demo-fails-production-upendra-bhandari-ctooe/)
3. [I built knowledge search for our call center](https://www.linkedin.com/pulse/i-built-knowledge-search-our-call-center-its-still-sending-bhandari-pr0ue/)
4. [My agent needs a human in the loop, it's a nightmare to build](https://www.linkedin.com/pulse/my-agent-needs-human-loop-its-nightmare-build-upendra-bhandari-bskze/)
5. [The agent harness: what it is, why it matters, what the ideal one looks like](https://www.linkedin.com/pulse/agent-harness-what-why-matters-ideal-one-looks-like-upendra-bhandari-z6xse/)

## Why

I got tired of building the same operational stack on every project. Prompts scattered across files. Eval scripts that worked once and rotted. RAG pipelines I rewrote from scratch every time. HITL infrastructure I built from scratch in three different ways. None of that work was differentiating. None of it was AI work. All of it was rebuilt because no library shipped it as a unit.

I built this for me first. Today I'm open-sourcing it because every engineer I know is solving the same problems with the same scaffolding, owning the same brittle code nobody can hand off.

## What it is

It's called FastAIAgent. `pip install fastaiagent`. Apache 2.0. It runs locally — no platform required, no signup, no hosted infrastructure. The SDK is the whole product for what I'm describing here.

Here's the through-line — what each article complained about, and what's in the SDK now.

### Prompts

Article 1 was about prompts held together with duct tape. There's a prompt registry now — versioned, fragmentable, runtime resolution from local files. You write a prompt once, give it a version, compose it from fragments where you want reuse. Rolling back a prompt is a one-line change. Comparing two versions in production is a one-line change. The duct tape comes off.

### Eval

Article 2 was about evaluation being a one-off script that rotted the moment the prompt changed. There's an inner loop now — datasets, scorers, LLM-as-judge, RAG metrics, A/B comparison, online eval policies on production traffic, CI/CD gates. Plus Agent Replay: fork any past execution at any step, modify the input, re-run. The eval pipeline isn't a side project. It's a system.

### Knowledge bases

Article 3 was about three weeks rebuilding a RAG pipeline that quietly degraded after demo day. There's a managed KB layer — ingestion, multi-strategy chunking, hybrid search out of the box, continuous RAG eval. Pluggable backends if you outgrow the defaults. Re-embedding when documents update. The pipeline I kept rebuilding, built once.

### HITL

Article 4 was about HITL being a state machine I rebuilt every project. There's a durable `interrupt()` now — pause any workflow for a human, resume after hours, days, or a server restart. An Approvals UI that lists every paused workflow. Idempotent side effects so replays don't double-charge or double-send. The workflow engine that was harder than the agent — already built.

## Underneath: traces

All five of these ride on the same foundation. Activate the integration once per framework — and from there, every LLM call, tool invocation, KB lookup, guardrail check, HITL pause emits OpenTelemetry spans automatically. No per-call decorators. No wrapping every function. Spans follow the GenAI semantic conventions, viewable in the local UI as span trees you can step through, exportable to any OTel-compatible backend if you already have observability infrastructure.

Replay reads from the trace store. A/B comparisons walk trace pairs. The prompt registry annotates traces with the version that ran. Tracing isn't a feature on the list — it's the substrate everything else stands on.

## What nobody else has

Three things — and one of them is the reason the other two matter.

**The closed loop (Article 5).** Develop → Trace → Feedback → Eval → Optimize → Deploy → Pull from the registry → Trace again. Each piece exists somewhere in the ecosystem. The loop, end-to-end, in one tool, doesn't. This is what the SDK is built around. The two below exist because the loop needs them.

**Agent Replay.** Fork any execution at any step, modify the input, re-run. No other framework I've evaluated can do this end-to-end. Replay is what makes the loop iterable — failing traces become test cases, hypotheses become diffs.

**Durable HITL.** Most "HITL" in other tools is a callback that breaks if your server restarts. This one persists execution state to SQLite or Postgres and resumes from any process — hours, days, or a deploy later. Durable HITL is what keeps the loop running when humans take longer than processes.

## The complete harness

Every working AI agent is a stack of six layers. Guardrails and constraints. Context and memory. Planning and orchestration. Tool management. Model execution. Observability and feedback — with a loop from layer six back to layer one. The harness is whatever wraps all six.

![The six layers of an agent harness](/posts/images/six-layers-agent-harness.png "The six layers of an agent harness, with the feedback loop running from observability back to guardrails.")

The articles in this series each pointed at one or two layers. Prompts sit in context. RAG sits in context. Evals and tracing sit in observability. HITL sits in planning and tool management. Guardrails and model execution didn't get articles yet — they will. The SDK covers all six layers, with the feedback loop closing the system. That's the shape. The rest is implementation detail.

## What it doesn't do

It's Python-only on the SDK side. If your team is on Node, this isn't your tool yet. The visual chain editor is on the hosted platform side, not in the open-source SDK — the SDK ships a local UI for traces, replay, evals, prompt editing, KB browsing, and the approvals page, but the drag-and-drop canvas isn't part of it. And it's new. There are rough edges. We're shipping fixes and new primitives every week. This is just the beginning. Focused and restless, until building agents is easy and adoptable for everyone.

## More coming

And there's more I haven't covered here. Composable memory blocks. Middleware that wraps every model call. Multi-agent orchestration — supervisor-worker patterns and peer-to-peer swarms. Agents that ship as MCP servers in one line. Idempotent side effects that don't double-charge on retry. Each one solves a real pain from a real project. Each will get its own article — same format as the articles that brought us here. Here's the pain. Here's the primitive. Here's why it matters.

## It runs your existing agents

If you've already built on LangChain, LangGraph, CrewAI, or PydanticAI, you don't rewrite them. The operational layer wraps existing agents through thin adapters — most features (tracing, eval, prompts, guardrails, KB, analytics, dependency graphs) work through the wrappers. The deepest primitives (Replay, durable HITL, full checkpointing) need native execution. Your framework underneath stays untouched. The agent's logic stays untouched. Only the wrapping changes when you migrate frameworks.

## A snippet

With `OPENAI_API_KEY` in your environment:

```python
import fastaiagent as fa

llm = fa.LLMClient(provider="openai", model="gpt-4")

@fa.tool()
def search(query: str) -> str:
    return f"Results for: {query}"

agent = fa.Agent(llm=llm, tools=[search])
result = agent.run("What's the weather in Tokyo?")
```

That's the API.

## What I'm asking

Three things. None pushy.

If anything in this resonates — `pip install fastaiagent`, run `fastaiagent ui` locally, build something small. The local UI shows you traces, replays, evals, the prompt editor, the KB browser, the approvals page. Twenty minutes will tell you whether it's worth more time. The package is on [PyPI](https://pypi.org/project/fastaiagent/).

If you hit a bug, a rough edge, anything that breaks — open an issue on [GitHub](https://github.com/fastaifoundry/fastaiagent-sdk). We'll fix it fast.

If it doesn't fit your problem, tell me why. The articles came from real frustration on real projects. The SDK comes from the same place. I'd rather hear what you'd want fixed first than have you nod politely and move on.

That's the series. Thanks for reading it.
