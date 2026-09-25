---
title: Every Agent Run Has a Flight Recorder
date: Sep 25, 2026
tag: Observability
kind: video
minutes: 2
summary: Every run the SDK pushes lands on the plane as a trace — every model call, tool call, retrieval and guardrail verdict, in order, with what it cost. Including the runs that failed, and exactly why.
author: Upendra Bhandari
cover: ./posts/images/traces-flight-recorder-cover.jpg
---

When an agent gets something wrong, "the model said something odd" is not a diagnosis. You need the record of what actually happened.

Every agent run lands on the FastAIAgent plane as a trace — think of it as the flight recorder. Every run the SDK pushed is there with its status and its input, including the ones that failed.

## One run, every step

![Traces on the FastAIAgent plane](/posts/videos/traces-flight-recorder.mp4 "One run, eight spans in order: the agent, a model call, two tool calls, a knowledge-base retrieval, a second model call and two guardrails — with tokens, latency and cost rolled up.")

Open a trace and the run unfolds in order. Click any span for its record: the model call with the messages it saw and what it cost, each tool call with its arguments and result, the retrieval with the document it matched, and each guardrail's verdict.

When a guardrail blocks, the trace says so. In the demo, a run asking about competitor pricing is stopped at the output — the run failed, and the record shows why.

From there you can score any trace with the plane's judge for tone, relevance and faithfulness, or replay it centrally under a different prompt, without touching the agent, and see exactly where the answer diverges.

Every step, every call, every check — on the record.

The same traces run locally too: see [I see everything my agent does](/blog/see-everything-your-agent-does/). For turning a failed run into a permanent test, see [Every production failure should become a test](/blog/every-production-failure-becomes-a-test/).
