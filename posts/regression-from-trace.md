---
title: Turn every production failure into a regression test
date: Sep 12, 2026
tag: Replay
minutes: 6
summary: A customer reports the agent did something wrong. Here is the five-script loop that captures the failing trace, fixes it, and makes sure it never comes back.
author: FastAIFoundry team
---

When an agent misbehaves in production, most teams start from zero: re-read logs, guess at the prompt, reproduce by hand. The failing run already contains everything you need. The problem is that nothing lets you pick it up and run it again.

## Capture, analyze, fix, save, verify

The regression-from-trace template ships with a deliberately broken lookup_order tool. Its failure mode is silent: it returns a fallback record stamped with the requested ID, so the agent confidently answers about an order that does not exist. This is exactly the class of bug only trace replay catches.

```bash
cd examples/regression-from-trace
pip install -r requirements.txt
python capture.py && python analyze.py && python fix.py \
  && python save_test.py && python verify.py
```

capture.py runs the agent and records the trace. analyze.py steps through it span by span and points at step 3, where the tool returned a record that never existed. fix.py forks the trace at that step, swaps in the corrected tool, and reruns from there. save_test.py appends the input and the corrected output to regression_dataset.jsonl. verify.py runs evaluate() over the dataset with an LLM judge.

> Every production failure becomes a permanent test that future eval runs will catch.

## Why forking matters

Rerunning from the start would call the model again with a fresh context and might not reproduce the bug. Forking at the failing step keeps every earlier span exactly as it was, so the only variable is the thing you changed. The same mechanism powers the fork-and-rerun button in the Local UI and on the platform.

The regression case stays caught forever, and the pytest plugin persists each tagged case to the /evals page so the team can see the pass rate trend over time.
