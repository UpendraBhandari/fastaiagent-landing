---
title: The Agent Was Right. The Data Was Wrong.
date: Jun 11, 2026
tag: Knowledge Base
minutes: 7
summary: Perfect reasoning over the wrong document is the most dangerous kind of agent bug — no hallucination, no error, green across every dashboard. To find it you have to look at what the agent actually retrieved.
author: Upendra Bhandari
series: The Agent Debugging Manifesto
part: 5
cover: ./posts/images/context-cover.jpg
---

A customer asks your support agent whether their purchase qualifies for a refund. The agent reads the policy, reasons through the customer's situation, and answers confidently: yes, you're within the 30-day window, here's how to start the return.

The customer starts the return. It gets rejected. The actual policy changed last quarter — digital purchases are now final sale, no refunds. The agent quoted a rule that no longer exists.

You pull the trace, expecting to find a reasoning error. There isn't one. The agent's logic is flawless: it found a policy document, read the refund window, applied it correctly to the customer's purchase date, and gave a clear answer. Every step is sound.

The model did everything right. It was just working from the wrong document.

## A failure that hides from every dashboard

Most agent observability watches the model. Token counts, latency, the prompt, the completion, whether the reasoning looks coherent. And by every one of those measures, this run was perfect. No hallucination, no malformed output, no error, no high latency. Green across the board.

That's what makes context failures the most dangerous class of agent bug: nothing looks broken. The agent didn't make something up — it faithfully reported what it was given. The information was just wrong. Stale, incomplete, or simply the wrong document retrieved from a store full of similar-looking ones.

The industry spent two years driving down hallucination and improving reasoning. Meanwhile, a large share of real production failures were never reasoning failures at all. The model was fine. It retrieved the 2023 policy instead of the 2024 one. It pulled a document that was textually similar to the question but factually wrong. It got data that contradicted another source and had no way to know which to trust.

You cannot catch this by reading the final answer. The answer looks reasonable — it's a correct deduction from incorrect premises. To find the bug, you have to look at something most tools flatten or hide: what the agent actually retrieved.

![Trace showing the agent's confident but wrong refund answer](./posts/images/context-1-agent-answer.png "The agent's answer in the trace — eligible for a refund, within 30 days, including digital products. Confident, well-reasoned, and wrong. Every model-level metric here is green.")

## Seeing what the agent retrieved

In FastAIAgent, retrieval is a first-class step in the trace. Every time an agent queries a knowledge base, the trace records a retrieval span: the query that was issued, the documents that came back, the backend, the top-k, the search type, the latency.

So when the agent confidently quotes the wrong refund policy, you don't guess. You open the retrieval span and look:

```
retrieval.support-kb
  query:        "refund policy digital purchases"
  backend:      faiss
  top_k:        3
  doc_ids:      ["refund_policy_v1", "shipping_terms", "faq_general"]
  result_count: 3
  latency_ms:   8
```

There it is. The agent retrieved `refund_policy_v1`. The current policy is `refund_policy_v2`. The reasoning was never the problem — the agent reasoned perfectly over a document that should have been retired six months ago. The bug is sitting in the `doc_ids`, in plain sight, in a step most observability tools never surface as its own inspectable event.

![Retrieval span as its own node in the Replay span tree](./posts/images/context-2-replay-span.png "The same span in the local Replay UI. retrieval.support-kb is its own node in the tree, and its output makes the bug obvious — doc_ids of refund_policy_v1, shipping_terms and faq_general. The stale document, retrieved and handed straight to the model.")

This works regardless of where your vectors live. The bundled knowledge base runs on FAISS with zero setup — install and go.

![Retrieval span from the bundled FAISS store](./posts/images/context-3-faiss-span.png "The retrieval span from the bundled FAISS store — backend faiss, top_k 3, search_type vector.")

But the retrieval span is backend-agnostic. Point the same `LocalKB` interface at a store you already run, and you get the identical span — here it is wired to Qdrant:

```python
from fastaiagent import LocalKB
from fastaiagent.kb.backends.qdrant import QdrantVectorStore

# Same KB interface, your existing Qdrant underneath — nothing else changes
kb = LocalKB(
    name="support-kb",
    vector_store=QdrantVectorStore(
        url="http://localhost:6333", collection="support-kb", dimension=384
    ),
)
# kb.search(query) now emits the identical retrieval span — with backend: "qdrant"
```

![The same retrieval span with a Qdrant backend](./posts/images/context-4-qdrant-span.png "The same documents and the same query, this time indexed in a real Qdrant. Only retrieval.backend changes to qdrant; the doc_ids underneath are identical.")

The same goes for Pinecone, pgvector, or Weaviate behind the same interface. You don't migrate your vector store to get retrieval visibility; you point the harness at what you already have.

## Fixing it — and proving the fix

Seeing the wrong document is half the job. The other half is proving that the right document fixes the answer — that this really was a data problem and not something subtler in the reasoning.

This is where Replay earns its place again. You fork the run, swap in a corrected retriever that returns the current policy, and rerun:

```python
from fastaiagent.trace.replay import Replay

replay = Replay.load("trace_id")

# Fork the run and override the retriever with one that returns the current policy
forked = (
    replay.fork_at(step=1)
    .with_tool_override("search_policy", corrected_policy_search)
    .rerun()
)

comparison = replay.fork_at(step=1).compare(forked)
print(f"Diverged at step: {comparison.diverged_at}")
# Original:  "Yes, you're within the 30-day refund window..."  (from refund_policy_v1)
# Rerun:     "Digital purchases are final sale and not eligible for refund."  (from refund_policy_v2)
```

The answer flips from wrong to right. Same agent, same model, same reasoning — only the retrieved document changed. That's the proof: the failure was the data, not the model. Now save the case as a regression test, and a stale-document retrieval can never silently produce a wrong answer again without the eval catching it.

![The rerun with a corrected retriever, giving the right answer](./posts/images/context-5-corrected-rerun.png "The rerun, with the retriever corrected to return refund_policy_v2 — digital purchases are final sale and not eligible for refund. Same agent, same model; only the document changed, and the answer flipped from wrong to right.")

This is [the closed loop from earlier in the series](./post.html?slug=every-production-failure-becomes-a-test), pointed at the context layer: trace → see the bad retrieval → fork with corrected data → rerun → prove the fix → regression test. The same mechanic that debugs prompts and reasoning, now debugging the data the agent was fed.

One honest note for the curious: this reruns the agent from the top with a corrected retriever — the cleanest path the open SDK gives you. The more surgical version — overriding a single retrieval result in place and resuming mid-trace — lives in the platform's Replay engine. For finding and proving a context failure, rerun-with-corrected-retriever does the job.

## Observability has to include the data layer

The lesson underneath this: if your observability shows you the model's inputs and outputs but not what the agent retrieved and why it was handed to the model, you are blind to an entire class of failure — and it's a class that produces confident, plausible, wrong answers that no quality metric flags.

Retrieval is not a detail to log and forget. It's where a large share of production agent failures actually originate. Making it a first-class, inspectable, replayable step is the difference between "the agent was wrong and we don't know why" and "the agent retrieved the wrong document, here it is, here's the fix, here's the test that guards it."

## The deeper problem

Here's the honest edge of all this. Seeing which document came back, and proving a better one fixes the answer, is retrieval debugging. It tells you what the agent got. It doesn't tell you whether what it got was correct.

And that's the harder question. A vector search returns the most similar chunk — but similar isn't the same as right. The stale 2023 policy can be more textually similar to a question than the correct 2024 one. Two systems can hold contradictory facts about the same customer, both retrievable, both confident. The document can be current and still be missing the one detail that was decided in a meeting last week and never written down. No vector store solves this, because it isn't a retrieval problem. It's a context-quality problem — whether the information an agent is given is correct, current, and trustworthy in the first place.

That's a deeper problem than this article, and a different kind of system to solve it. We'll come back to it.

For now: when your agent is confidently, inexplicably wrong, don't start with the model. Start with what it retrieved. The bug is usually right there in the data.

> FastAIAgent is an open-source agent harness with Agent Replay, crash-proof durability, and a local-first UI. `pip install fastaiagent` — the SDK is on [GitHub](https://github.com/fastaifoundry/fastaiagent-sdk).
