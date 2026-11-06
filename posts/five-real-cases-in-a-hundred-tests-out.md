---
title: Five real cases in. A hundred tests out.
date: Nov 6, 2026
tag: Evaluation
kind: video
minutes: 4
summary: Your best test data is already in production. Here is how FastAIAgent Enterprise turns a handful of real traces into a test set, in screenshots from a real run.
author: Upendra Bhandari
cover: ./posts/images/synthetic-cover.jpg
hero: false
---

Ask a team shipping an AI agent how many test cases it has. Usually someone wrote ten by hand, and the set has not grown since. Production has no such limit. Customers ask the same thing in a hundred ways, in other languages, about edge cases nobody wrote down.

Synthetic data closes that gap: give a model a few real examples and let it write many more in the same shape. The question is where the examples come from. On FastAIAgent Enterprise, they come from the traces your agents already send to the plane.

![Five real cases in, a hundred tests out: synthetic test data generated from production traces on FastAIAgent Enterprise](/posts/videos/synthetic-five-in-a-hundred-out.mp4 "The whole run in 90 seconds: five production traces become the seed, a hundred cases are generated and run on the agent's own runner, and eight failures turn out to be one real bug.")

## Start from what really happened

Every connected agent reports its runs as traces: the question it was asked and the answer it gave. Those are the best examples you have. On the Traces page, tick the ones you want and choose **Generate test data**.

![The traces of a support agent, with five real conversations ticked and the Generate test data button.](/posts/images/synthetic-01-traces-five-ticked.png "The traces of a support agent, with five real conversations ticked and the Generate test data button.")

The wizard opens with those traces already picked. Each one becomes a seed row: its question as the input, its recorded answer as the expected answer. That makes the choice matter, so the picker shows each trace's feedback and scores. Pick answers you would want again.

![The wizard on its From traces source, five of ten picked, each trace's question and answer visible.](/posts/images/synthetic-02-wizard-from-traces.png "The wizard on its From traces source, five of ten picked, each trace's question and answer visible.")

## Say what to vary, in plain words

The plane reads the shape of the seeds, a question and its answer, and takes instructions per column. Ours: *a customer's question to Northwind, an online shoe store; vary the tone; refunds past the 30-day window; no order number; one in Spanish; never a real name.*

![The detected schema, input and expected_output, with the conditions written in plain words.](/posts/images/synthetic-03-schema-conditions.png "The detected schema, input and expected_output, with the conditions written in plain words.")

That condition is the main lever. On a first attempt we left out "shoe store", and the model drifted to rugs and candles. Name the domain and the cases stay on it.

## A hundred cases in half a minute

Generation runs in the background on the model already configured for the project, so no data goes to a service you did not choose. In this run, 100 cases took 34 seconds: refunds past the window, missing order numbers, frustrated customers, four in Spanish. The seeds and every generated row are encrypted at rest under the customer's own key. The model is told not to reuse personal details from the examples, and any row that copies a seed is dropped.

![The job: 100 generated rows, and the export form with input and expected_output preselected and the five seed cases included.](/posts/images/synthetic-04-generated-rows.png "The job: 100 generated rows, and the export form with input and expected_output preselected and the five seed cases included.")

One click saves them as an eval dataset. The real cases are tagged `seed` and the new ones `synthetic`, so a run can use either.

## Run it where the agent runs

The plane never runs agent code. The suite goes to a registered runner in the customer's environment, which executes the agent with its real tools and sends the results back. The plane scores every case centrally, here with a correctness judge and a helpfulness judge.

![Two runs of the same suite: the five seeds, 5 of 5 passed; the hundred generated cases, 92 of 100 passed and 8 failed.](/posts/images/synthetic-05-runs-seed-vs-synthetic.png "Two runs of the same suite: the five seeds, 5 of 5 passed; the hundred generated cases, 92 of 100 passed and 8 failed.")

The five real questions passed, as they would: their expected answers are the agent's own. The hundred found eight failures the seed set never had.

## What the hundred found

All eight are refund questions about the 30-day window. In most, the customer says the shoes arrived in September, and the agent replies "yes, as long as you're still within 30 days". It never works out that September is already past the window: it does not know today's date.

![The hundred-case run filtered to its eight failures, each with its answer and the two judges' scores.](/posts/images/synthetic-06-run-failures.png "The hundred-case run filtered to its eight failures, each with its answer and the two judges' scores.")

The same mistake was already in production. Asked on 5 November about shoes delivered on 4 October, the agent said they were still inside the window. No one had written that test, because no one had thought of it. The fix is a design decision: give the agent the date, or a tool that checks eligibility. Whichever the team picks, these hundred cases now gate it.

## The honest edges

The generated expected answers are a model's best reading of the policy, so read them before you rely on them. And pick seeds whose answers are right: each one becomes the standard its cases are held to.

## Tested, not assumed

Building this at a hundred real cases found problems no small test had shown. A job could read "completed" with no rows. Only three of five seeds reached the model. Seed text sat unencrypted. And cases written in the console reached the agent as raw JSON. All of it is fixed in release 0.19.6.

How does your team grow its test set today: by hand, or from what production already tells you?
