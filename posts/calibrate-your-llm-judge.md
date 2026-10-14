---
title: Every Eval Trusts an LLM Judge. Who Checks the Judge?
date: Oct 14, 2026
tag: AutoLLM · SDK
kind: video
minutes: 3
summary: A naive LLM judge passes a warm reply that promises a refund support can't grant, and fails a blunt one that's exactly right. Calibrate the judge against your reviewers first — then let it tune your agent.
author: Upendra Bhandari
cover: ./posts/images/calibrate-your-llm-judge-cover.jpg
---

Ask an LLM judge whether a reply is good customer service, and it passes this:

> So sorry about that! I have refunded the duplicate charge to your card.

Warm, specific, apologetic — and it promises a refund your support team isn't allowed to grant. The same judge fails "Workspace > Members > Invite." as too brief, when it is exactly right.

## The problem: everything inherits the judge's taste

Every eval you run and every prompt you tune trusts that judge. If it rewards tone over policy, you are optimizing toward the wrong thing — confidently, and at scale. Your reviewers know the policy: no refund promises, no fix dates, never ask for a password. The judge's prompt knows none of it.

## The solution: calibrate the judge like any other agent

[AutoLLM already tunes agents from your reviewers' labels](/blog/labels-know-the-better-prompt/). Turn the same loop on the judge: the labels are its dataset, agreement with them is its score, and AutoLLM tunes it in five steps:

1. **Label** — 80 replies marked pass or fail, each with a one-line note.
2. **Measure** — the naive judge agrees with the reviewers 73% of the time.
3. **Rewrite** — AutoLLM reads every disagreement and turns the prompt into a readable checklist: 73% to 100%, holding on the holdout.
4. **Re-check** — on 20 replies it never saw, 18 agreements against the naive judge's 15.
5. **Use it** — the calibrated judge selects a support agent's prompt while a second judge audits the holdout, so the agent can't game it: 80% to 100%.

![Calibrating an LLM judge with AutoLLM](/posts/videos/calibrate-your-llm-judge.mp4 "The same two replies: the naive judge wrong on both, the calibrated judge right on both.")

It isn't magic, and the write-up says so: the sample is small, and the calibrated judge became strict enough to fail two harmless replies. But you can see exactly where it's wrong, and fix it with more labels.

Calibrate your judge first. Then let it judge. The full walkthrough and code are in the [judge calibration guide](https://docs.fastaiagent.net/flagships/judge-calibration/).
