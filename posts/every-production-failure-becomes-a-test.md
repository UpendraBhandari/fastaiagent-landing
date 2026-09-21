---
title: Every Production Failure Should Become a Test. One Click.
date: May 21, 2026
tag: Replay
minutes: 8
summary: Finding the bug is an afternoon. Keeping it dead across every future change by every future contributor is the real cost — and that only works if the failure becomes a permanent test case the moment you fix it.
author: Upendra Bhandari
series: The Agent Debugging Manifesto
part: 1
cover: /posts/images/every-failure-a-test-cover.jpg
---

You fixed the bug. The agent was hallucinating refund policy details because the retrieval step returned the wrong document. You found it with Agent Replay, forked at the failing step, swapped the prompt, confirmed the fix, deployed. Done.

Three weeks later, a junior engineer updates the system prompt. Reasonable change — better tone, clearer instructions. They test it on five examples. Looks good. They deploy.

The hallucination is back.

Not the same hallucination. A cousin. The new prompt is slightly less specific about citing policy sections, and the agent drifts back to the same class of error you fixed three weeks ago. Nobody notices for four days because nobody remembers the original failure well enough to test for it.

This is the real cost of agent debugging. It's not finding the bug — that's an afternoon. It's keeping the bug dead across every future change by every future contributor. And that only works if the original failure becomes a permanent test case the moment you fix it.

## The manual way (what everyone does)

Most teams handle regression testing like this:

1. Agent fails in production
2. Engineer investigates, finds the root cause
3. Engineer fixes the prompt / retrieval / tool
4. Engineer writes a test case: copies the input, writes the expected output, formats it as JSONL, adds it to the eval dataset
5. Engineer runs the eval suite to confirm the fix passes
6. Engineer deploys
7. Time passes. Nobody adds more test cases because step 4 takes 15 minutes per failure and there are always more urgent things

The problem isn't the concept. Everyone agrees that production failures should become test cases. The problem is the friction in step 4. Copying inputs, formatting JSONL, figuring out what the expected output should be — it's just enough overhead that people skip it when they're busy. And they're always busy.

So the eval dataset grows slowly (if at all), mostly from synthetic examples someone wrote during the initial build. The real production edge cases — the ones that actually matter — never make it in.

## The closed loop (what should happen)

What if the debugging workflow had a built-in exit that produces a test case as a natural byproduct of fixing the bug?

Here's the loop:

1. Agent fails → a trace is captured automatically
2. Engineer loads the trace in Replay
3. Engineer forks at the failing step, modifies the prompt, reruns
4. The original output and the fixed output appear side by side
5. Engineer confirms the fix works
6. One click: the original input + correct output is saved as a regression test
7. The eval suite now includes this case permanently
8. Every future change is tested against every past failure

Step 6 is the key. The test case isn't written manually — it's produced directly from the debugging session. The input is the exact production input that failed. The expected output is the output the engineer just verified is correct. No copying, no formatting, no JSONL editing. One click.

Over time, the eval dataset grows organically from real failures. Not synthetic examples. Not a QA team's best guesses. Actual production edge cases, each one captured at the moment it was understood and fixed.

## What this looks like in code

Let's walk through the complete loop with FastAIAgent. Every line below is runnable against the SDK.

### Step 1: The agent runs in production, a trace is captured

```python
from fastaiagent import Agent, LLMClient

agent = Agent(
    name="support-bot",
    system_prompt="You are a support agent. Help customers with refund inquiries.",
    llm=LLMClient(provider="openai", model="gpt-4o"),
    tools=[search_docs, lookup_order],
)

result = agent.run("What's your refund policy for digital purchases?")
print(result.trace_id)  # "b6acf1ef2c2779bbc2fcf80802ae0534"
```

Every `agent.run()` produces a trace. The trace captures every step: the LLM calls, the tool invocations, the retrieval results, the final output. The trace ID is your handle to everything that happened.

### Step 2: Load the trace in Replay, find the problem

```python
from fastaiagent.trace.replay import Replay

replay = Replay.load("b6acf1ef2c2779bbc2fcf80802ae0534")
print(replay.summary())

# Trace: b6acf1ef2c2779bbc2fcf80802ae0534
# Name: agent.support-bot
# Status: OK
# Spans: 4
#
# Steps:
#   [0] agent.run
#   [1] llm.chat_completion
#   [2] tool.search_docs        ← retrieval returned wrong document
#   [3] llm.chat_completion     ← LLM hallucinated from wrong context
```

Step through and inspect:

```python
step = replay.inspect(2)
print(step.span_name)   # "tool.search_docs"
print(step.output)      # {"documents": ["shipping-policy.md", ...]}
# ← Should have returned refund-policy.md, got shipping-policy.md instead
```

Found it. The retrieval step returned the shipping policy instead of the refund policy. The LLM did its best with the wrong context and hallucinated.

### Step 3: Fork, fix, rerun

```python
forked = (
    replay.fork_at(step=3)
    .modify_prompt(
        "You are a support agent. Help customers with refund inquiries. "
        "Always cite the exact policy section number. If the retrieved documents "
        "don't contain refund information, say so — never guess."
    )
    .rerun()
)

print(forked.new_output)
# "I don't see specific refund policy information in the documents I found.
#  Let me search more specifically for our digital purchase refund policy..."
```

The fixed prompt makes the agent honest about what it doesn't know instead of hallucinating. That's the fix. But it's worthless if it doesn't survive the next prompt change.

### Step 4: Compare and confirm

```python
comparison = replay.fork_at(step=3).modify_prompt("...").rerun()
comp = replay.fork_at(step=3).compare(comparison)

print(f"Diverged at step: {comp.diverged_at}")  # 3
print(f"Original output: {comparison.original_output}")
print(f"Fixed output: {comparison.new_output}")
```

Side by side. The original hallucinated. The fix is honest. Confirmed.

### Step 5: Save as regression test — one click

In the Local UI at `http://127.0.0.1:7842/traces/<trace_id>/replay`, the comparison view has a "Save as regression test" button. Click it. The case is appended to `./.fastaiagent/regression_tests.jsonl`:

```json
{"input": "What's your refund policy for digital purchases?", "expected": "I don't see specific refund policy information...", "metadata": {"source_trace": "b6acf1ef2c27...", "fork_step": 3, "created": "2026-05-10T14:30:00Z"}}
```

That's it. The production failure is now a permanent test case. The input is the exact customer message. The expected output is the response the engineer verified as correct. The metadata links back to the original trace for audit.

### Step 6: Run the eval suite — the failure is now guarded

```python
from fastaiagent.eval import evaluate

results = evaluate(
    agent_fn=agent.run,
    dataset="regression_tests.jsonl",
    scorers=["correctness", "relevance"],
)
print(results.summary())
# correctness: 100% | relevance: 100%
# Cases: 1 passed, 0 failed
```

One case today. But next week there will be three. Next month, twenty. Each one a real production failure that was understood, fixed, and preserved.

### Step 7: Three weeks later, the junior engineer changes the prompt

```python
agent = Agent(
    name="support-bot",
    system_prompt="You are a friendly support agent. Be warm and helpful!",  # ← new prompt
    llm=LLMClient(provider="openai", model="gpt-4o"),
    tools=[search_docs, lookup_order],
)

# Before deploying, run the regression suite
results = evaluate(
    agent_fn=agent.run,
    dataset="regression_tests.jsonl",
    scorers=["correctness"],
)
print(results.summary())
# correctness: 0% | Cases: 0 passed, 1 failed
# FAILED: "What's your refund policy for digital purchases?"
#   Expected: honest acknowledgment of missing information
#   Actual: hallucinated refund details from shipping policy context
```

The regression test caught it. The new prompt removed the "cite exact policy section" instruction, and the agent drifted back to the old failure mode. The junior engineer sees the failure, reads the test case metadata, opens the original trace, understands why the test exists, and adjusts the new prompt to preserve the safety behavior.

The bug stays dead.

## Why this works and manual testing doesn't

Three properties make this loop different from "just write tests":

**The test case is a byproduct, not a chore.** The engineer was already in the Replay view, already looking at the fix, already confirming it worked. The "Save as regression test" button is one click at the end of a workflow they were already doing. There's no context switch, no format conversion, no separate test-writing session.

**The input is real, not synthetic.** The test case uses the exact customer message that exposed the failure. Not a simplified version. Not a best-guess approximation. The actual input that broke the agent in production. This means the test covers the exact edge case, with the exact phrasing, that caused the problem.

**The expected output is verified, not assumed.** The engineer didn't write the expected output from scratch — they generated it by fixing the agent, running it through Replay, and confirming it's correct. The expected output has been through human review as part of the debugging process. It's not a guess at what the right answer should be.

## The eval dataset as a living artifact

Think about what happens over six months of this loop:

**Month 1: 5 test cases.** All from the first week of production failures. Basic coverage.

**Month 2: 15 test cases.** The agent hit edge cases around multilingual queries and partial refunds. Each one caught in Replay, fixed, saved.

**Month 3: 30 test cases.** A model upgrade (GPT-4o to a newer version) caused three regressions. The eval suite caught all three before deployment. Three more cases added from the investigation.

**Month 6: 80 test cases.** The eval suite is now a comprehensive map of every failure mode the agent has ever encountered. New team members run the suite to understand what the agent is supposed to handle. Prompt changes are tested against 80 real edge cases before deployment. The agent is measurably more reliable than it was six months ago, and you can prove it.

None of those 80 test cases were written in a planning session. None were generated synthetically. Every single one came from a production failure that a real engineer fixed and preserved. That's an eval dataset that reflects reality, not imagination.

## The same loop, in the browser

Everything above works in the Local UI too. No code required for the debugging-to-test flow.

**1. Traces page** — find the failing trace, click to open.

![Local UI traces list](/posts/images/replay-loop-1-traces.png "Traces page: every run with status, spans, duration, tokens and cost.")

**2. Replay view** — click the failing span, then Fork here.

![Replay view with a span selected](/posts/images/replay-loop-2-fork-span.png "Replay view: step through the span tree and fork at the step that went wrong.")

**3. Fork dialog** — edit the prompt (or input, or tool response, or LLM params), then rerun from this step.

![Fork dialog](/posts/images/replay-loop-3-fork-dialog.png "Fork dialog: change the prompt, the input, the tool response or the model params, then rerun from that step.")

**4. Comparison view** — original vs fixed output, side by side, with "diverged at step N".

![Comparison view](/posts/images/replay-loop-4-comparison.png "Comparison view: original and fixed output side by side, with the divergence point marked.")

**5. Save as regression test** — one button, appended to the regression dataset.

![Save as regression test](/posts/images/replay-loop-5-save-test.png "One button turns the verified fix into a permanent case in the regression dataset.")

**6. Eval Runs page** — run the eval, see the new case.

![Eval runs page](/posts/images/replay-loop-6-eval-runs.png "Eval Runs: the regression suite with its pass rate and quality trend over time.")

The whole flow is visual, interactive, and produces a permanent artifact. An engineer who has never written a JSONL line in their life can contribute to the regression suite.

## What this means for your team

The difference between "we test our agents" and "our agents get better from every failure" is the automation of step 4 — turning a debugging session into a test case without friction.

Most teams have the first part. They test before shipping. They run evals. They have a dataset.

Few teams have the second part. The feedback loop where production failures feed back into the test suite, where every fix includes a test, where the eval dataset grows from experience rather than imagination.

The closed loop is: develop → trace → replay → fix → regression test → eval. Every step flows into the next. No manual conversion. No context switching. No overhead that makes people skip it when they're busy.

The result: an agent that gets measurably better over time, with proof.

> FastAIAgent is an open-source agent harness with Agent Replay, crash-proof durability, and a local-first UI. `pip install fastaiagent` — the SDK is on [GitHub](https://github.com/fastaifoundry/fastaiagent-sdk).
