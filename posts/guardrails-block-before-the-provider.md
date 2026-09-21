---
title: Guardrails That Log Violations After the Fact Are Just Dashboards
date: Aug 20, 2026
tag: Guardrails
kind: video
minutes: 2
summary: FastAIAgent guardrails block before the provider ever sees the data. Define one in code, or author it once on the Control Plane and every connected agent enforces it.
author: Upendra Bhandari
cover: ./posts/images/guardrails-block-cover.jpg
---

Guardrails that log violations after the fact are just dashboards.

FastAIAgent guardrails block — before the provider ever sees the data. Define it in code, or author it once on the FastAIAgent Control Plane and every connected agent enforces it.

## Blocked, and tied to the trace

![A PII guardrail blocking a request before it reaches the model provider](/posts/videos/guardrails-block-before-the-provider.mp4 "The guardrail span shows exactly where the run stopped: no_pii BLOCKED, with credit_card, email and ssn detected in the agent input.")

The blocked run is not a separate alert to go and correlate later. The guardrail is a span on the trace, so the record of what was stopped sits with the record of what the agent was doing at the time.

More: the [SDK on GitHub](https://github.com/fastaifoundry/fastaiagent-sdk) and the [documentation](https://docs.fastaiagent.net/). The longer argument is in [Guardrails that actually block](/blog/guardrails-that-actually-block/), and the platform view is on the [Enterprise page](/enterprise.html).
