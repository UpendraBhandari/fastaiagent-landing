---
title: An outage should report INVALID, never a green build
date: Aug 28, 2026
tag: Evaluation
minutes: 4
summary: Agent CI has a failure mode most test runners do not: the thing under test can be fine while the infrastructure behind it is down. Here is how the eval gate handles it.
author: FastAIFoundry team
---

A unit test either passes or fails. An agent eval has a third state. When the provider returns a 500 or the request times out, the agent produced nothing scoreable. Marking that case as failed blames the agent for the outage. Marking it passed is worse.

## Errored is its own column

Infra failures are recorded as errored: unscored and counted separately from passed and failed. When a run contains errored cases beyond the threshold, the gate reports INVALID and exits with code 3, distinct from 0 (pass) and 1 (fail). A CI pipeline can retry an INVALID run and block on a failed one.

```bash
fastaiagent eval run  --dataset cases.jsonl --gate 0.9
fastaiagent eval compare --baseline main --candidate HEAD
# exit 0 pass · 1 fail · 3 invalid
```

## Curating from traces respects the same rule

Dataset.from_traces() drops infrastructure-errored runs rather than curating them as gold cases, so AutoLLM optimizes only on agent-attributable failures. The curated set reports how many were dropped through coverage_summary().

Connected to a control plane, each gated run's verdict is also reported, so an organization can see which agents produce eval evidence and treat an agent that produces none as a governance finding. Only metadata travels: aggregates, the gate outcome, thresholds, git provenance, and per-case verdicts with trace IDs. Case inputs and outputs never leave the machine.
