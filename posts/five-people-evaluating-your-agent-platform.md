---
title: Five People Are Evaluating Your Agent Platform. One of Them Is You.
date: Aug 10, 2026
tag: Platform
summary: The developer, the operator, the CTO, compliance and finance each judge an agent platform by a different test. Ship for one and you lose the other four.
author: Upendra Bhandari
cover: /posts/images/five-people-cover.jpg
---
The demo worked. Everyone nodded. Six months later the agent still isn't live, and when you ask why, you get something vague about security review or governance.

Here's the real answer. Nobody buys an agent platform alone. Before that agent talks to a real customer, five people have to be okay with it — and only one of them cares about the problem the whole industry has been working on.

Building agents is solved. Plenty of frameworks do it well. But the other four people were handed nothing, and that's where projects get stuck. Not on what the technology can do. On questions nobody built an answer for.

There are two halves to the answer. The open-source SDK runs on your laptop and in production. It builds the agent, runs it, enforces the rules, and keeps everything local. FastAIAgent Enterprise is the central plane. It never runs your agents — it governs them. Policy gets written there, evidence gets collected there, and the organization finally gets one view across every team.

An engineer can skip Enterprise entirely and lose nothing. The other four people are why it exists.

## 1. The AI engineer — "Can I build this, and fix it when it breaks at 2am?"

Building is the easy part now. Fixing is where it hurts. Something went wrong in production, you've got one log line, and you can't reproduce it.

Everything you need locally comes with one install. pip install 'fastaiagent[ui]', run fastaiagent ui, and you've got a trace explorer on port 7842 backed by a single SQLite file in your project. No Docker, no server, no account. Nothing leaves your machine.

![Agent platform roles](/posts/images/five-people-1.png)

Open a trace and you see the whole run: every model call, tool call, retrieval, and memory read, with timing, tokens, cost, and guardrail checks right there in the tree.

When something breaks in production, you finish the job in Enterprise. Pull up the failing trace and replay it — change the prompt, run it again against the recorded run, and compare. Replay knows which tools are safe to actually call: read-only tools run for real, anything that might have side effects gets its recorded output played back instead. Your payment API doesn't get hit twice because you were debugging.

Then save that failure as a test, publish the fixed prompt, and every agent picks it up on the next pull. No redeploy. Prompts have versions, branches, diffs, and rollback, and every trace records which version produced it — so "which prompt said that?" always has an answer.

## 2. The tester — "How do I know it works, and stays working?"

The question that matters isn't whether it passed once. It's whether CI goes red when someone breaks it next month.

![Agent platform roles](/posts/images/five-people-2.png)

You get a pytest gate that needs no API keys and no infrastructure. Install the SDK and the plugin registers itself. Write your cases as tests, and a failing score fails the test:

python

```python
@case(input="What is the capital of France?", expected="Paris")
def test_capital_gate(evaluate_one):
    agent = Agent(name="fact-bot", llm=TestModel(response="Paris"))
    evaluate_one(agent.run, scorers=["exact_match"])
```

That runs in whatever CI you already have. No new service, no new vendor, no keys in your build.

Enterprise goes much further. Test suites, datasets you can import and export, sixteen built-in scorers plus LLM judges, synthetic test data, A/B comparisons that show you exactly which version won, human review queues, and policies that continuously sample live production traffic and score it. Guardrails work as tests too — point one at any input and see what it does. And any real failure from production becomes a permanent test case with the right answer attached.

Test where the agent runs. Govern where the organization needs it.

## 3. The architect — "Will this scale across teams, or become five different stacks?"

This is what decides whether you have a platform or a pile of projects. It comes down to one thing: can you define something once and have every team use it at runtime?

For prompts, scorers, datasets, knowledge bases, and guardrail policy — yes. One line of code pulls each of them:

![Agent platform roles](/posts/images/five-people-3.png)

python

```python
prompt = PromptRegistry().get("refund-policy", version="2.1")
scorer = Scorer.from_platform("groundedness")
```

Knowledge bases live in Enterprise, and any agent with access can query them. Inside a project, several agents can share one knowledge base with different retrieval settings each — same content, tuned differently per agent.

Guardrails are the good one. Write a rule once in Enterprise, and every connected SDK pulls it down and rebuilds it as a real guardrail in its own runtime. Change the rule, and every cache invalidates. One definition, enforced everywhere agents actually run.

Connectors and MCP servers are registered in Enterprise too, with credentials held centrally instead of scattered across team repos. And for hosted tool calls, Enterprise is the one doing the calling — which makes it the one place a central block actually happens.

There's an ownership line enforced in code, not in a wiki. Every asset belongs to either Enterprise or the SDK. Enterprise can't overwrite something the SDK owns, and an SDK push won't clobber something Enterprise owns.

For the calls that really matter, the SDK can ask first: "may I run this tool?" The answer is allow, deny, or wait for a human — and waiting means the run suspends to disk and sits there until someone decides. Days, if that's how long it takes.

## 4. The head of IT and engineering — "What am I running, and what are my teams doing?"

Two problems, same person: the platform, and the people using it.

On what you have to run, the answer is mostly "nothing." The SDK needs no infrastructure at all. One pip install, one SQLite file, a local UI. Nothing leaves the machine unless someone calls connect(). Your teams can try it, build with it, and decide whether they like it without a procurement cycle, a security review, or a ticket to you. You stop being the bottleneck.

![Agent platform roles](/posts/images/five-people-4.png)

When you do want Enterprise, it runs on your own infrastructure. There's a real air-gapped install path — a bundler that packages everything with checksums so you can carry it to a disconnected network. Self-hosted, it can point at a local model instead of a cloud provider, so the features that need an LLM don't need egress. And it plugs into the identity you already have with OIDC and SAML.

On what your teams are doing, the useful one is knowing which agents went dark. One screen tells you which agents are registered, which are actually sending traces, which are registered but silent — and which are running and reporting but were never registered at all. That last group is the one nobody else shows you. Alongside it: which SDK version each instance is on, runner health, and usage, tokens, latency, success rate, and estimated cost rolled up by agent and project.

There's one more view that sounds boring and isn't: how many runs across every project are paused right now waiting on a person. Agents that stop for approval don't crash — they just wait, quietly, sometimes for days. One board shows the whole backlog. It's the difference between "the agent seems slow" and "eleven runs have been sitting with compliance since Thursday."

## 5. The CISO — "What can it do without a human, and can you prove what it did?"

This is the meeting that kills agent projects, usually because someone answers a security question with marketing.

So here's the honest starting point: Enterprise cannot stop a running agent. It doesn't pretend to.

![Agent platform roles](/posts/images/five-people-5.png)

The block happens locally. The SDK is what's running your agent, so the SDK is what stops it — in-process, before the action, because that's the only place a block can really happen. Policy is written in Enterprise and pushed down. Enterprise decides, the runtime enforces. The one exception is hosted tool calls, where Enterprise is the one making the call — there it blocks outright, and it fails closed: if the governance check errors or a credential can't be resolved, the call is denied.

When Enterprise can't be sure the local block happened, it doesn't claim one. It records a violation afterward. For an auditor that's actually more useful than a claimed block, because it proves the control was working — and shows exactly when it wasn't.

The compliance layer is the deepest part of the product. An EU AI Act engine with sixty-five controls, risk templates, Annex IV documentation, a guided questionnaire, and dossier export. Compliance events go into a hash-chained ledger you can verify — tamper-evident, not just append-only by convention.

And violations derive on their own, on a schedule. Including the one nobody instruments: a safety check that quietly stopped working. If a guardrail's own check errored out and your policy let the content through anyway, that becomes a recorded finding — "a required control was not operating" — with severity scaled to how risky the system is. A guardrail that silently stops guarding is the failure nobody catches. Here it raises its own flag.

Human-in-the-loop is observer-only by design. The SDK reports when a run pauses and when it resumes. The log is append-only with no way to edit it, and there's no button in Enterprise that lets someone approve another team's run out from under them. Access is scoped — twenty-eight API key scopes, domain and project membership, SSO per domain. You can delete a memory fact for a data subject and the audit record deliberately survives it. Checkpoint deletion respects legal hold.

## One system, five answers

Notice how much of that was the same thing, seen from five angles.

A trace is the engineer's debugger. It's where the tester's regression cases come from. It's the architect's proof that policy reached the runtime. It's the only way the IT lead spots an agent that went dark. It's the CISO's evidence. And it's where every cost number comes from.

Same for guardrails: an inline check, a test, a central policy, a fleet health signal, an enforcement point. Same for human-in-the-loop: a function call, a testable path, a policy, a status board, an approval record.

One artifact. Five jobs. That only works because one system runs the agent instead of eight tools watching from outside. The engineer's trace can be the CISO's evidence because there's one trace, with one identity, that everything else comes from.

Wire the same capabilities together from separate vendors and you get five answers that don't line up. The test case can't point back to the run it came from. The cost can't be tied to the agent. Compliance becomes a spreadsheet someone updates by hand.

Agent projects don't stall because the technology can't do it. They stall because four of the five people never got an answer.

Give them one, and it ships.

FastAIAgent Enterprise is live. The central plane described here — policy distribution, governance coverage, central replay, the compliance engine, the org-wide views — is built and running today. Self-serve download is coming shortly; until then, get in touch and we'll get you set up.

The SDK you can have right now:

bash

```bash
pip install fastaiagent
fastaiagent ui
```

FastAIAgent is an open-source agent harness with Agent Replay, crash-proof durability, and a local-first UI. pip install fastaiagent → [github.com/fastaifoundry/fastaiagent-sdk](http://github.com/fastaifoundry/fastaiagent-sdk)
