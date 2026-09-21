---
title: Your Agent Needs Transactions, Not Just Tools
date: May 29, 2026
tag: Durability
minutes: 7
summary: Databases solved this 40 years ago. Every framework gives agents tools to act; none give them transactions to act safely. ACID — atomicity, consistency, isolation, durability — mapped onto action-taking agents.
author: Upendra Bhandari
series: The Agent Debugging Manifesto
part: 3
cover: ./posts/images/transactions-cover.jpg
---

Databases solved this 40 years ago. If a bank transfer debits one account and the system crashes before crediting the other, the transaction rolls back. No money vanishes. No state is half-done. ACID guarantees — Atomicity, Consistency, Isolation, Durability — are why you trust your database.

Your AI agent has the same problem. It takes multi-step actions against external systems — charges cards, sends emails, provisions resources, updates records. But it has none of the guarantees.

Every framework gives agents tools to act. None of them give agents transactions to act safely.

This isn't hypothetical. Anyone building action-taking agents in production has hit this, or will. The gap between "my agent can call APIs" and "my agent can call APIs without causing damage on failure" is where the real engineering lives.

## ACID for agents — the mapping

**Atomicity.** A workflow completes fully or not at all. No half-done states.

*Violation:* your agent calls Stripe, the charge succeeds, the process crashes before the confirmation email. The customer is charged but never notified. The database has no record of the charge. The system is in a state that shouldn't exist.

**Consistency.** The agent's actions leave the world in a valid state.

*Violation:* your agent provisions an EC2 instance, crashes before creating the DNS record. An orphaned instance is running, billing, and unreachable. No record in your system tracks it.

**Isolation.** Concurrent agent executions don't interfere.

*Violation:* two pods both try to resume the same paused workflow. Both re-execute the payment step. The customer is charged twice — not because of a crash, but because of a race.

**Durability.** Completed work survives crashes.

*Violation:* a five-step workflow completes three steps. The pod is evicted. The new pod restarts from step 1. Three steps of compute wasted, the customer notices the delay, and any side effects from steps 1-3 might fire again.

Every one of these happens in production. Every one is preventable.

## How frameworks fail each property

### Atomicity failure: the double-charge

```
Agent starts → calls Stripe → charge succeeds → process crashes →
agent resumes → calls Stripe again → customer charged twice
```

The charge went through. The process died. The recovery mechanism re-executes the node from the top, including the Stripe call that already succeeded. One action, two charges. Your code is correct — the infrastructure betrayed it.

The fix is `@idempotent`:

```python
from fastaiagent import (
    Chain, FunctionTool, Resume, SQLiteCheckpointer, idempotent, interrupt,
)
from fastaiagent.chain.node import NodeType

@idempotent
def charge_customer(amount: int, customer_id: str) -> dict:
    """Charge via Stripe. Safe to retry — cached per execution."""
    return stripe.charges.create(amount=amount, currency="usd", customer=customer_id)

def payment_step(amount: int, customer_id: str) -> dict:
    receipt = charge_customer(int(amount), customer_id)
    # Suspend until the confirmation pipeline picks it up. Any subsequent
    # re-entry of this node (resume, retry, crash recovery) re-runs
    # payment_step from the top — but charge_customer() returns its
    # cached receipt, so the customer is only charged once.
    interrupt(reason="confirm_charge", context={"charge_id": receipt["id"]})
    return {"charge_id": receipt["id"]}

chain = Chain("payment-flow", checkpointer=SQLiteCheckpointer())
chain.add_node(
    "charge",
    tool=FunctionTool(name="payment_step", fn=payment_step),
    type=NodeType.tool,
    input_mapping={
        "amount": "{{state.amount}}",
        "customer_id": "{{state.customer_id}}",
    },
)

result = chain.execute(
    {"amount": 5000, "customer_id": "cust_abc"},
    execution_id="order-789",
)  # → status="paused"
```

Process crashes after the charge. On resume:

```python
result = await chain.aresume("order-789", resume_value=Resume(approved=True))
# → payment_step re-enters from the top
# → charge_customer() returns its cached receipt — no second Stripe call
# → one charge, one resume, no double-billing
```

The `@idempotent` decorator caches the function's result per `execution_id`. Same execution, same arguments, same result — without calling Stripe again. That's atomicity at the action level.

### Durability failure: the pod that died

Five-step workflow. Kubernetes evicts the pod after step 3. All state was in memory. New pod restarts from step 1. Three steps wasted.

The fix is checkpointing:

```python
from fastaiagent import Chain, FunctionTool
from fastaiagent.checkpointers import PostgresCheckpointer
from fastaiagent.chain.node import NodeType

def build_chain() -> Chain:
    chain = Chain(
        "support-flow",
        checkpointer=PostgresCheckpointer("postgresql://user:pass@host/db"),
    )
    chain.add_node("classify", agent=classifier)
    chain.add_node("research", agent=researcher)
    chain.add_node("draft",    agent=drafter)
    chain.add_node("review",   agent=reviewer)
    chain.add_node(
        "send",
        tool=FunctionTool(name="send_response", fn=send_response),
        type=NodeType.tool,
    )
    chain.connect("classify", "research")
    chain.connect("research", "draft")
    chain.connect("draft", "review")
    chain.connect("review", "send")
    return chain

result = build_chain().execute({"ticket": ticket}, execution_id="ticket-456")
```

Pod dies after step 3. New pod:

```python
# Rebuild the chain in the new process — same checkpointer, same topology.
chain = build_chain()
result = await chain.aresume("ticket-456")
# → reads checkpoint from Postgres
# → skips classify, research, draft (already completed)
# → resumes at review
```

Postgres doesn't care which pod reads the checkpoint. Any pod with the connection string can resume any execution. SQLite works the same way for single-machine deployments — zero setup, same semantics.

### Consistency failure: the 3-day approval

A refund over $10,000 needs manager approval. The agent blocks inline, waiting for a human. The process must stay alive for hours or days. If anything restarts, the approval is lost. The refund request vanishes. The customer waits in an inconsistent state — refund initiated but never resolved.

The fix is `interrupt()` plus `resume()`:

```python
from fastaiagent import Chain, FunctionTool, Resume, SQLiteCheckpointer, interrupt
from fastaiagent.chain.node import NodeType

def refund_check(amount: int, customer_id: str) -> dict:
    if int(amount) > 10000:
        approval = interrupt(
            reason="manager_approval",
            context={"amount": int(amount), "customer_id": customer_id},
        )
        return {"approved": approval.approved, "approver": approval.metadata.get("approver")}
    return {"approved": True, "auto": True}

chain = Chain("refund-flow", checkpointer=SQLiteCheckpointer())
chain.add_node(
    "check",
    tool=FunctionTool(name="refund_check", fn=refund_check),
    type=NodeType.tool,
    input_mapping={
        "amount": "{{state.amount}}",
        "customer_id": "{{state.customer_id}}",
    },
)
chain.add_node(
    "process",
    tool=FunctionTool(name="process_refund", fn=process_refund),
    type=NodeType.tool,
    input_mapping={
        "approved": "{{node_results.check.output.approved}}",
        "approver": "{{node_results.check.output.approver}}",
    },
)
chain.connect("check", "process")

result = chain.execute(
    {"amount": 15000, "customer_id": "cust_abc"},
    execution_id="refund-abc",
)
print(result.status)  # "paused"
# → process exits cleanly, state persisted
```

Three days later, the manager approves — via the `/approvals` UI, an HTTP endpoint, or CLI:

```python
result = await chain.aresume("refund-abc", resume_value=Resume(approved=True, metadata={"approver": "alice"}))
print(result.status)  # "completed"
```

No process blocked for three days. No state lost on restart. The customer's refund resolves cleanly.

### Isolation failure: the resume race

Two pods pick up the same paused workflow simultaneously. Both read the pending interrupt. Both re-execute the payment node. Double charge — caused by concurrency, not crashes.

The fix is claim-on-resume. When `chain.aresume()` is called, the first operation is an atomic `DELETE FROM pending_interrupts WHERE execution_id = ? RETURNING *`. If no rows are returned, another pod already claimed it. The second pod gets an `AlreadyResumed` exception instead of a double execution.

The guarantee is automatic — no decorator, no config. You just handle the exception:

```python
from fastaiagent import AlreadyResumed

try:
    result = await chain.aresume(execution_id, resume_value=Resume(approved=True))
except AlreadyResumed:
    # Another pod already won the race — fetch the canonical result from
    # the checkpoint store instead of re-running the payment node.
    result = await fetch_completed_execution(execution_id)
```

Postgres MVCC (and SQLite's single-writer plus `RETURNING`) guarantee exactly one of N concurrent resumers wins — verified in CI by an 8-thread race against one row. The "two pods" failure mode is fully resolved, not via distributed locks but via the database's existing atomicity guarantees.

One nuance: on multi-pod SQLite deployments, a loser may surface `OperationalError: database is locked` instead of `AlreadyResumed`. The safety property is preserved either way, but callers should retry on busy. Postgres has no such caveat.

## Why frameworks don't solve this

Every framework gives you crash recovery of some form — retries, restarts, re-runs. But re-running code that already produced real-world effects is worse than not running it at all.

A re-run is a duplicate. A duplicate charge. A duplicate email. A duplicate cloud resource. The framework "recovered" — and made things worse.

The missing piece isn't retry logic. It's the ACID properties that databases have had for four decades:

- **Checkpoint state** so completed work isn't re-executed (Durability)
- **Cache side effects** so actions that succeeded aren't repeated (Atomicity)
- **Suspend cleanly** so long waits don't require a live process (Consistency)
- **Claim before resuming** so concurrent recoveries don't race (Isolation)

## Where this fits in the loop

The [closed loop](./post.html?slug=every-production-failure-becomes-a-test) is: develop → trace → replay → fix → regression test → eval.

ACID properties operate before the loop. A double-charge isn't a wrong answer you detect in an eval. No scorer catches it. No regression test prevents it. It's a side effect in the real world that happens because the infrastructure failed, not because the agent reasoned badly.

The loop makes agents smarter. ACID makes agents safe. You need both.

> FastAIAgent is an open-source agent harness with Agent Replay, crash-proof durability, and a local-first UI. `pip install fastaiagent` — the SDK is on [GitHub](https://github.com/fastaifoundry/fastaiagent-sdk).
