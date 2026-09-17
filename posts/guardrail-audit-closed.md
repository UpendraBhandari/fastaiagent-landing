---
title: Closing the guardrail audit: three silences and three verdicts
date: Sep 10, 2026
tag: Guardrails
minutes: 5
summary: Release 1.64.0 closes the cross-repo guardrail audit. Each of the six findings was a control reporting a verdict it had not earned.
author: FastAIFoundry team
---

On 2026-09-10 we closed the cross-repo guardrail audit. After this release no new findings go on the shared board; anything found later is an ordinary bug in an ordinary backlog. Here is what the last six findings had in common.

## A verdict that was never earned

Every builtin guardrail is a code rule, and code cannot be serialized into a checkpoint. So Replay.fork_at(...).rerun() re-ran incidents with every guardrail disarmed, and wrote green passed rows for checks that never executed. The replay looked cleaner than the original run because nothing was checking it.

A second silence: a rule with an empty pattern matched at position 0 of every payload, so it failed everything, and it failed as a verdict rather than an error. on_error="allow" could not rescue it because nothing had errored.

## The control that stores what it inspects

Two LLM judges were recording model output into result_detail. That column is durable, tenant-visible, and aggregated by the analytics endpoint. A judge that refused in prose while quoting the payload, or one that was prompt-injected into echoing its input, wrote customer content there permanently. The PII detector already followed the right rule: record counts, never values. The judges now follow it too.

> The control that inspects sensitive data must not become a place that stores it.

Both fixes were re-mirrors of the plane's own detector modules rather than redesigns. The plane fixed its copies first; the SDK adopted the wording verbatim. Direction matters when two copies drift.
