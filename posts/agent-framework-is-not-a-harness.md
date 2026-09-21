---
title: An Agent Framework Is Not an Agent Harness
date: Jul 16, 2026
tag: Harness
summary: A framework helps you build an agent. A harness runs it in production — and the difference is everything you need after the demo works.
author: Upendra Bhandari
series: The Agent Debugging Manifesto
part: 10
cover: /posts/images/framework-cover.jpg
---
Building an agent is the easy part. Multi-step workflows, tool calling, multi-agent handoff — you can wire that up in an afternoon. Plenty of frameworks do it well, including this one.

Then you try to run it in production, and discover that orchestration was maybe fifteen percent of the work.

Because a production agent needs the whole apparatus around the orchestration. It has to find the right context. Remember the right things about the right user. Refuse to do the dangerous thing. Be watchable when it misbehaves. Survive the pod dying halfway through a payment. Pause for a human on the decisions that warrant one. Be provably correct after every change. And when it breaks, be debuggable — not "here are the logs," actually debuggable.

That apparatus is the harness. Frameworks give you the orchestration and stop. The harness is the thing nobody hands you — so you go build it, or buy it in pieces.

## What you actually assemble

The shopping list is remarkably consistent — the framework you started with, plus seven more things: a vector store for context, something for memory (usually hand-rolled), a guardrails library, an observability platform, an eval tool, a prompt manager, and something for durability — a workflow engine, or nothing and a prayer.

Eight tools. Eight APIs. Eight things that ship breaking changes on their own schedule. Eight vendors, several of whom would like your traces on their servers.

The usual complaint is the assembly tax — the wiring, the drift, the cognitive load. That's real and survivable; teams do it every day. The bigger cost is quieter: the assembled stack can't build the capabilities that matter most. Not "hasn't yet." Can't — because no component owns enough of the agent's loop.

## The complete harness, one install

bash

```bash
pip install fastaiagent
```

One install gives you the two things most teams buy separately: the framework that builds the agent, and the harness that runs it in production.

— BUILD —

- Orchestration : Agents with tool calling · chains with cycles, iteration limits, exit conditions · swarms with peer handoff · supervisor/worker teams
- Context : Knowledge bases on bundled FAISS, or the Qdrant / Pinecone / pgvector you already run — retrieval traced down to the documents that came back.
- Memory : One object, three tiers, per-user isolation, full CRUD with supersede-not-overwrite lineage — SQLite, Postgres, or Redis.
- Prompts : Versioning with lineage back to the traces and eval runs that used each version.
- Multimodal:  Images and PDFs as first-class input, rendered in the trace

— RUN IT FOR REAL —

- Guardrails : Block at runtime, not log after the fact — PII, JSON validity, your own.
- Observability : Every LLM call, tool call, retrieval, and memory read as a span — in a UI on your own machine, against one SQLite file.
- Durability : Checkpointing · @idempotent · resume in a fresh process after a real SIGKILL.
- Human-in-the-loop : Suspend to disk, resume days later — via Python, HTTP, CLI, or the approvals UI.
- Evaluation : Deep scorer catalog, LLM-judge and G-Eval, custom scorers — and scoring of the agent's tool path, not just its answer.
- Debugging : Agent Replay — fork a failed run at any step, change one thing, re-execute, diff.
- Self-improvement : AutoLLM, which uses all of the above to make the agent better.
- Interop :Tracing and eval over agents you've already built in other frameworks.

That top half is what a framework gives you. The bottom half is what nobody does — and the point is that they're the same object:

python

```python
from fastaiagent import Agent, LLMClient, Memory, LocalKB

agent = Agent(
    name="support-bot",
    llm=LLMClient(provider="openai", model="gpt-4o"),
    tools=[lookup_order, issue_refund],
    memory=Memory(location="sqlite", user_id=lambda ctx: ctx.state.user_id),
    kb=LocalKB(name="policies"),
    guardrails=[no_pii()],
)
```

You didn't build an agent and then instrument it. The agent you declared is already traced, already durable, already replayable — because the thing that runs it is the thing that watches it.

One import. One mental model. One local database. One UI.

That's the completeness half of the argument. It's the less interesting half.

## Why it has to be one system

Bundling eight tools would be a convenience. It wouldn't be a harness. The reason this is one system is that some capabilities are impossible any other way — and the line that decides which is simple: does the tool run the agent, or watch it?

## Where the orchestration-only framework stops

A framework builds the graph and hands it back. That's the contract, honestly stated. But it means the framework owns your execution and nothing else. Want to know why the agent chose that tool? Add a vendor. Want the run to survive a pod eviction? Add a workflow engine, or accept that it won't. Want to prove a prompt change didn't regress anything? Add an eval product. Want the agent to remember a user across sessions? Write it yourself.

The framework has the one thing everything else needs — the execution — and exposes almost none of it. So the capabilities that require execution get built by people who don't have it.

## What a watch-only tool can never do

The observability platforms are the other half of the stack, and they're well-built. But they wrap someone else's framework, which is a hard ceiling:

Rewind. To fork a failed run at a step, swap the retriever, and re-execute forward, you have to be the thing executing. A watcher can show you the trace of the agent that hallucinated. It can't hand that agent a corrected document and run it forward to prove the data was the bug — it never had the agent, only the recording.

Recover. Checkpointing, idempotency, suspend-and-resume all require holding the state. An observer can tell you the process died at 3am. It can't resume it.

Block. A guardrail that fires after the payment API was called is a log entry with good intentions. Stopping an action mid-flight means being in the flight path — the runtime, not the audience.

Explain memory. Showing which memory was recalled, and at what score, requires having done the recalling.

None of that is a funding or talent problem. A team with ten times the resources hits the same wall, because the wall is architectural. To rewind an agent, you have to have run it.

## The seams are where debugging dies

Here's the failure mode nobody puts on a comparison chart.

Your framework has a state model. Your observability vendor has a trace model. Your eval tool has a case model. Your prompt manager has a version model. Four systems, four identity schemes, and no shared notion of "this run, this prompt version, this test case, this score."

So the investigation crosses a border every few minutes. The trace lives here; the prompt that produced it lives there, unlinked. You find the failing case in the eval tool with no way back to the production run it came from. You fix it, and there's no path from "I understood this failure" to "this failure is now a test" — just copy-paste. And a fifteen-minute manual conversion, forty times a week, doesn't happen.

The bugs don't live inside the tools. They live in the gaps between them. And no vendor owns a gap.

## "We just hand-code it"

Which is what most good teams do, and it works. That's not sarcasm — the dismissive version of this argument is both rude and wrong. The code isn't bad. It's often quite good.

Here's what it costs anyway. It's a product nobody planned to build — you wrote retry, then idempotency, then checkpointing, then resume across processes because a pod died. Each one is "just one more week," and none of it is anyone's job: unowned, untested infrastructure with a bus factor of one.

![Framework versus harness](/posts/images/framework-1.png)

It gets the subtle things wrong. Not the obvious things — those are easy. Does your idempotency cover the window between the side effect firing and the cache being written? Does your resume path stop two workers claiming the same job in the same millisecond? Does your memory return nothing for an empty user id, or everyone's facts? Those bugs don't appear in testing. They appear at 3am, once, unreproducibly. Getting them right usually means having been burned first — a bad way to learn them on a system that moves money.

And it hits the same wall anyway. Glue can wrap a framework; it can't give the framework properties it doesn't have. You can hand-write tracing. You cannot hand-write Replay onto a framework that doesn't expose its execution loop — your glue doesn't own execution either. It's outside, looking at the same recording. Hand-coding gets you the bundling; it doesn't get you the integration, because integration isn't a code problem, it's an architecture problem.

## What one system buys you

One identity for everything. The trace knows which prompt version produced it. The replay knows which trace it forked. The regression test knows which replay proved it. The eval run knows which prompt version it graded. Nobody wired that; it's a consequence of one data model.

So the loop closes: a trace becomes a replay, a replay becomes a regression test, a regression test becomes an eval case, an eval case gates the next prompt change — and that version shows up in the lineage of the next trace. One click, not fifteen minutes.

One mental model. An agent runs, the run produces a trace, the trace can be replayed, the replay can become a test. That's the whole vocabulary — and every capability in this series is that vocabulary from a different angle. Memory tracing was even built to mirror knowledge-base retrieval tracing, so an engineer who learned to read one reads the other on sight. That coherence is only available to a system that owns both.

And everything is local. Traces, prompts, evals, memory, checkpoints — one SQLite file in your project. Not a privacy mode we bolted on; there's nowhere else for it to go.

## The proof: an agent that improves itself

If integration were merely convenient, automatic optimization would be buildable on an assembled stack. It isn't.

To improve an agent automatically, a system must simultaneously know what the agent did (traces), know what "better" means (eval datasets and scorers), be able to change the agent (the prompt registry), re-run it, and score the result — then loop. Every step reads the step before it, in the same data model, with the same identifiers.

Try that across a framework, a separate observability vendor, and a third eval product. Each owns a fragment; none can see the others' primitives. You'd spend the entire project building plumbing the integrated harness has by construction.

AutoLLM works because the loop is closed inside one system. That isn't a feature announcement — it's the thesis holding under load.

## The honest tradeoffs

Three, plainly.

Specialists go deeper. A company whose entire business is evaluation will out-ship us on eval features. If depth in one layer is all you need, and you're content sending traces to someone's cloud, buy the specialist. I'd rather say that than pretend.

You have to adopt it. Tracing and eval work over agents you built elsewhere. Replay and durability don't — they need the harness's primitives. If you have a mature codebase, that's a real migration.

The limits are known, and stated. SQLite is single-machine — Postgres for production, one connection string. Durability is at-least-once with a strong local idempotency guard, not exactly-once. Memory is observable but not yet forkable in Replay. Each one is spelled out in the article that covers it, because a harness whose claims you can't trust isn't a harness.

## Replace the model. The harness remains.

Your model will change. It changed twice while this series was being written. A new one lands, cheaper or smarter or both, you swap it — and everything you knew about your agent's behavior is suddenly in question. Prompts tuned for one model weigh instructions differently on the next. A regression appears where nobody thought to look.

The model is the part of your stack with the shortest half-life. The harness is the part that persists.

python

```python
llm=LLMClient(provider="openai", model="gpt-4o")
llm=LLMClient(provider="anthropic", model="claude-sonnet-4-5")
llm=LLMClient(provider="ollama", model="llama3")
```

One line changes. Everything else survives — the eval set you grew from real production failures, the regression tests from debugging sessions, the traces, the memory, the guardrails, the prompt history. And more than survives: the eval suite is exactly what tells you, before you ship, whether the new model quietly broke something the old one handled. The harness is what makes a model swap a decision instead of a gamble.

That's the asset. Not the model, which you'll replace. Not the prompt, which you'll rewrite. The accumulated, tested, observable understanding of how your agent behaves.

And the harness stays open — the full thing, on your own infrastructure, your data in a file you own. You're not betting on a model vendor, and you're not betting on us either. You can read it.

## The bet

So why give the whole harness away?

Because a harness earns its place by being run, not by being sold. A developer should be able to install it, break something on purpose, and see for themselves — no sales call, no trial key, no feature greyed out until a card clears.

And nothing above is greyed out. Framework, memory, retrieval, guardrails, durability, eval, Replay, the UI, AutoLLM — all of it, open, local, yours. The actual thing, not a crippled tier.

What sits above it is FastAIAgent Enterprise, and it begins where one developer stops being the whole story. The open harness assumes a single team on its own infrastructure. That holds until an agent walks into a regulated business — and then what breaks isn't capability. The agent is exactly as smart on Monday as it was Friday. What breaks is governance: not can the agent do this, but who approved it, who saw it, and can you prove that to an auditor next quarter.

![Framework versus harness](/posts/images/framework-2.png)

That's all Enterprise adds. None of it makes the agent smarter — all of it makes the agent accountable:

Approval workflows — The SDK gives you the pause; one human says yes or no. Enterprise makes it policy: rules that fire on a threshold (a $50,000 refund stops for a human, a $500 one doesn't), reviewers who can edit the arguments before releasing, and an append-only audit log of every decision and who made it. Online evaluation — Local eval grades a fixed dataset offline. Enterprise scores live production traffic as it arrives, on a schedule, with an LLM judge plus safety, similarity, and retrieval scorers — and the scoring policy itself doesn't go live until it's approved. Curated central memory — Instead of every agent trusting whatever it inferred, a background loop proposes facts from real traces into a human review queue. Nothing reaches an agent until a person approves it; approved facts are served back read-only, and a forgotten one is redacted from both the vector store and the database. Managed replication — The SDK replicates each checkpoint off the box; the plane keeps the durable copy so nobody runs their own Postgres to stay safe. Lose the machine and the plane serves the snapshot back — the SDK resumes locally, the plane never runs the agent — with retention and legal-hold on top. Team observability — Shared sight across many agents and many engineers: a read-only trace explorer, counterfactual Replay that never re-fires a side-effecting tool, and the answer a local view can't give — which registered agents have gone dark. EU AI Act compliance — Register each agent as an AI system and a rule-based Article 6 classifier sorts it — prohibited, high-risk, limited, or minimal (a reviewable suggestion, not a verdict). Enterprise then auto-assigns the applicable controls (up to 58 of a 65-control catalog for a high-risk provider) and seeds an Article 9 risk register from Annex III templates; you fill in Annex IV documentation, human oversight, and GPAI robustness against a live scorecard — every step written to a tamper-evident, hash-chained ledger you can verify end to end.

Notice the shape. None of it makes the agent more capable; all of it makes the agent more answerable — a different product for a different buyer.

And that's the bet, stated once. A developer building an agent needs none of this and should never be billed for it. A bank deploying one legally cannot go without it — sometimes because it's prudent, and increasingly because a regulation with real fines says so. The free harness earns the developers; the enterprises compelled to govern their agents are the business. One SDK, one mental model, from a laptop to a regulated bank.

## The invitation

An agent framework gives you orchestration and leaves you to assemble the rest. An observability tool watches from outside and can never rewind, recover, block, or improve. A harness gives you the orchestration and the rest — and because it's one system that runs your agent, the capabilities that decide whether it survives production stop being separate features and start being one thing seen from different angles.

That's the case. Test it the only way that counts:

bash

```bash
pip install fastaiagent
fastaiagent ui
```

Break something on purpose. Open the trace. Fork the step that failed, change one thing, run it forward. If your current stack can do that, you don't need this. If it can't — now you know why.

FastAIAgent is an open-source agent harness with Agent Replay, crash-proof durability, and a local-first UI. pip install fastaiagent → [github.com/fastaifoundry/fastaiagent-sdk](http://github.com/fastaifoundry/fastaiagent-sdk)
