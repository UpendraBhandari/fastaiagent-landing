---
title: A Prompt Change Is About to Ship. Should It?
date: Oct 8, 2026
tag: Evaluation
kind: video
minutes: 3
summary: Part 1 of a three-part series on evaluation. Most agent changes ship on a hand test and an LLM judge's approval. Here is why that misses the regressions that matter, and what a real release gate looks like.
author: Upendra Bhandari
series: The Evaluation Series
part: 1
parts: 3
cover: ./posts/images/evaluation-part1-cover.jpg
---

Most prompt changes ship the same way: someone tries a few questions, the answers look right, and it goes out. If there is an eval at all, it is a single LLM judge asking "is this answer good?"

This is part 1 of three: before a change ships, after it ships, and the instruments behind both.

## The problem: right answers can still break things

A judge grades quality. It is blind to anything it was never asked about — and that is where most real regressions live.

Rewrite a prompt to sound friendlier, and an agent that used to answer "Paris" now answers "The capital of France is Paris." Every answer is still correct, so the judge passes all of them. But whatever consumed that answer expected one word, and now it breaks — in production, after the change has shipped.

And a pass in a CI log is gone the moment someone needs to prove what was tested, or why a change was allowed through.

## The solution: a gate with more than one instrument

FastAIAgent runs the eval suite where the agent runs — in your CI, against a dataset and judge governed centrally on the plane. No agent code leaves your environment; only the verdict comes back.

Every case is scored by several instruments at once — a judge for quality beside deterministic checks like exact match. When they disagree, that is the finding. The candidate is compared to the last good run, and a failing gate turns the pipeline red.

![Evaluation before a change ships](/posts/videos/evaluation-part1-before-it-ships.mp4 "A candidate prompt at 67% against a baseline of 100%: the judge passed every answer, exact match failed four, and the gate stopped the change.")

In the film, the judge passes every answer, exact match fails four, and the change never ships. The plane keeps the verdict and the evidence, so "why was this blocked?" has an answer months later.

**Part 2** follows the change into production, where the suite can no longer see it. **Part 3** opens up the instruments themselves.
