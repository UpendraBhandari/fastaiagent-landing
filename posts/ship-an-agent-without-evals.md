---
title: You Wouldn't Ship Code Without Tests. Why Ship an Agent Without Evals?
date: Jun 24, 2026
tag: Evaluation
summary: Nobody ships a payment service on three manual clicks, yet that is exactly how most agents reach production. Datasets, scorers and a gate that actually blocks.
author: Upendra Bhandari
series: The Agent Debugging Manifesto
part: 7
cover: ./posts/images/evals-cover.jpg
---
Picture the last change you made that actually mattered — a payment path, an auth check, a schema migration. You didn't eyeball it and push. You wrote a test, watched CI go green, and merged with a clear conscience. That green check is what lets you change a system you don't fully hold in your head and still sleep at night.

Now picture how you shipped your last agent change. You tweaked the prompt, ran it three or four times, the answers looked fine, and you pushed. No test. No gate. No green check. Just vibes.

Same engineer. Two completely different standards. Why?

Because the tools we trust for code don't fit agents. assertEqual(output, "Refund approved.") is useless when the model says "Sure — your refund's been approved!" on the next run. The output is fuzzy and non-deterministic, the assertion breaks, so we quietly gave up and reverted to a 2005 workflow: run it, read it, ship it. We dropped twenty years of testing discipline the moment the output stopped being a fixed string.

Evals are how you get that discipline back. An eval is just a test for a system that doesn't return the same string twice. FastAIAgent ships a full one — scorers, datasets, a CI gate, and a local UI — so "it works" can go back to being something you prove instead of something you feel. Here's the overview.

## An eval, in one shape

Three things: an agent function, a dataset, and the scorers that grade it.

```python
from fastaiagent.eval import evaluate

results = evaluate(
    agent_fn=my_agent.run,
    dataset="support_cases.jsonl",        # {"input": ..., "expected_output": ...} per line
    scorers=["semantic_similarity", "contains"],
)
print(results.summary())
```

Arrange, act, assert — the rhythm you already know. The only new idea is the assertion: a scorer, which returns a score, a pass/fail, and a reason, and is allowed to be fuzzy.

## What you can assert: the scorer catalog

This is where agent eval earns its keep. FastAIAgent ships scorers in four families, so you can match the check to the question instead of forcing everything through string equality.

Deterministic — free, instant, no LLM call. exact_match, contains, json_valid, regex_match, length_between, latency, cost_under. The mechanical guarantees: valid JSON, under budget, under a latency bar. This is your old assertEqual, still perfect where the answer really is exact.

Similarity — semantic_similarity, bleu, rouge, levenshtein. For "doesn't have to match word-for-word, but should mean the same thing." The fuzzy assertion that used to break, made to work.

LLM-as-judge — for the qualities only a model can read. A RAG set (faithfulness, answer_relevancy, context_precision, context_recall), a safety set (toxicity, bias, pii_leakage, prompt_injection, moderation), and agent-quality metrics (task_completion, hallucination, reflection_quality).

Your own rubric — when you want to grade your definition of good. GEval reasons step-by-step over a rubric you write, then returns a normalized, thresholded score:

```python
from fastaiagent.eval import GEval

GEval(name="tone",
      criteria="Professional and empathetic, never dismissive.",
      threshold=0.7)
```

And when none of those fit, a scorer is just a function — anything you can express in Python becomes one with @Scorer.code:

```python
from fastaiagent.eval import Scorer, ScorerResult

@Scorer.code(name="cites_policy")
def cites_policy(input, output, expected=None, **kwargs):
    ok = "Policy" in output
    return ScorerResult(score=1.0 if ok else 0.0, passed=ok)
```

Deterministic and similarity scorers go in by name; configured judges like GEval(...) and your custom functions go in as objects. Mix them freely in one run.

## Grading the path, not just the answer

Here's the part with no equivalent in ordinary testing — and the reason evaluating an agent is different from evaluating a model.

A function has one thing to check: its return value. An agent has a path — which tools it called, in what order, with what arguments, how many loops it took to get there. And the path can be wrong even when the answer is right: the agent that booked the correct flight but called the payment API twice on the way gave you the right answer over a broken process. Grade only the output and you'd never see it.

FastAIAgent ships scorers for the path itself — ToolUsageAccuracy (the right tools?), ToolCallCorrectness (with the right arguments?), PathCorrectness (in the right order?), and StepEfficiency / CycleEfficiency (without spinning in loops?). One honest note: these are a standalone API — you pull the tool calls off a run and score them, rather than evaluate() inferring the trajectory for you.

## Where the cases come from

A test suite is only as good as its cases, and the worst eval is fifty examples someone imagined before launch and never touched again. Two ways to keep yours honest:

- Curate from production. Every run is traced; turn the interesting and failing ones into a dataset with fastaiagent eval curate. Your cases become a record of what the agent actually met, not what you guessed it might.
- Promote every fixed bug. When a failure is debugged in Replay, save the corrected run as a regression case. The bug that reached production becomes a permanent test — it can't slip back in quietly.

The set grows from reality, exactly the way a good test suite grows from every postmortem.

## How it runs: the CI you already have

Discipline that doesn't fire automatically decays back to vibes. Two honest paths, no new infrastructure:

```python
# pytest — a failing scorer fails the test, so CI goes red like any other test
from fastaiagent import Agent, LLMClient
from fastaiagent.eval import case

@case(input="What's your refund policy for digital goods?",
      expected="Digital purchases are final sale and not eligible for refund.")
def test_refund_policy(evaluate_one):
    agent = Agent(name="support", llm=LLMClient(provider="openai", model="gpt-4.1"))
    evaluate_one(agent.run, scorers=["semantic_similarity"])
```

Or gate a script explicitly — run evaluate(), check Scorecard.from_eval_results(results).overall_pass_rate, and sys.exit(1) below your bar. Either way a regression turns the build red and the bad change doesn't merge. The green check, restored.

## You can see all of it

Every run persists to a local SQLite DB, and the bundled UI reads straight from it (fastaiagent ui start) — no cloud account, nothing to configure.

![Evaluation in the FastAIAgent Local UI](./posts/images/evals-1.png)

Every run shows up — quality as a line over time, not a launch-day screenshot.

![Evaluation in the FastAIAgent Local UI](./posts/images/evals-2.png)

Click into a run: every case, its expected vs. actual output, and a pass/fail from each scorer

![Evaluation in the FastAIAgent Local UI](./posts/images/evals-3.png)

Compare two runs and the regression surfaces by itself — the exact input and the exact scorer that broke. And it isn't only a viewer — it's where you build the suite too:

![Evaluation in the FastAIAgent Local UI](./posts/images/evals-4.png)

Your datasets, created here or dropped in by eval curate.

![Evaluation in the FastAIAgent Local UI](./posts/images/evals-5.png)

Fill in a curated case's expected answer and hit Run eval — no script-edit-rerun loop. (Two cases here are still waiting for a gold answer.)

## Honest scope

- Offline. Eval runs against a dataset — there's no scoring of live traffic in the SDK. Continuous, online eval is a Platform layer.
- No turnkey CI gate. No shipped GitHub Action; you wire eval in via pytest or the exit-code script above.
- Trajectory scoring is standalone — applied to a run's tool calls, not auto-wired into evaluate().

## The point

None of this is a new discipline. It's the one you already trust for code — tests, a regression suite, a green check before merge — finally fitted to systems whose output is fuzzy and whose behavior is a path, not a value.

The agent that shipped on vibes can't tell you whether it still works. The one with an eval that grows from every failure and runs on every change can. That's the difference between a demo and software.

Every capability above has a runnable example:

- Core scorers - exact/contains/json/latency/cost => [75_core_scorers.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/75_core_scorers.py)
- Multiple scorers, end to end => [07_eval_pipeline.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/07_eval_pipeline.py)
- Similarity & NLP - semantic, BLEU, ROUGE, Levenshtein => [26_similarity_eval.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/26_similarity_eval.py)
- LLM-as-judge + rubric (G-Eval) => [81_g_eval.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/81_g_eval.py)
- RAG - faithfulness, relevancy, context precision/recall => [24_rag_eval.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/24_rag_eval.py)
- Safety - PII, injection, toxicity, bias, moderation => [25_safety_eval.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/25_safety_eval.py)
- Trajectory - tool path, order, arguments [76_trajectory_eval.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/76_trajectory_eval.py)
- Multi-turn / session quality => [77_session_eval.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/77_session_eval.py)
- Multimodal (vision) => [78_multimodal_eval.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/78_multimodal_eval.py)
- pytest integration =>  [61_eval_pytest.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/61_eval_pytest.py)
- Compare before / after =>  [40_evals_compare.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/40_evals_compare.py)
- Curate a dataset from traces =>  [80_curate_from_traces.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/80_curate_from_traces.py)
- Failure → regression test => [62_replay_to_regression.py](https://github.com/fastaifoundry/fastaiagent-sdk/blob/main/examples/62_replay_to_regression.py)

FastAIAgent is an open-source agent harness with Agent Replay, crash-proof durability, and a local-first UI. pip install fastaiagent → [github.com/fastaifoundry/fastaiagent-sdk](https://github.com/fastaifoundry/fastaiagent-sdk)
