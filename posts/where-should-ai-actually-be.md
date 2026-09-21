---
title: Where Should AI Actually Be in the System?
date: Aug 15, 2026
tag: Architecture
summary: Use the simplest thing that reliably does the job, and only let the model decide what happens next when you genuinely cannot know the next step until you have seen the last one.
author: Upendra Bhandari
cover: /posts/images/where-ai-cover.jpg
---
![Where AI belongs in the system](/posts/images/where-ai-1.png)

Two mistakes keep happening. One is dropping a language model into logic you already knew how to write. The other is forcing messy, document-heavy work into hundreds of brittle rules. Both come from picking the technology before working out what kind of problem you have.

A simple rule helps: use the simplest thing that reliably does the job, and only let the model decide what happens next when you genuinely can't know the next step until you see the last one.

## Use the simplest thing that does the job

![Where AI belongs in the system](/posts/images/where-ai-2.png "Start at the top. Only move down when the problem actually needs it.")

## The words, settled

These words get used interchangeably, and that causes real problems. Each one gives you a different trade between predictability, flexibility, cost, and how easy it is to govern.

![Where AI belongs in the system](/posts/images/where-ai-3.png "A single model call can solve a genuinely valuable problem. That alone doesn't make it an agent.")

## Agentic is a dial

The question isn't whether a system is agentic. It's how much of the path the model owns — which is a separate question from how much damage it can do.

![Where AI belongs in the system](/posts/images/where-ai-4.png)

This dial does not measure risk. A very agentic research assistant with read-only access is safer than a fixed workflow that can approve payments. How much path the model owns and how much authority it can reach are two separate dials.

![Where AI belongs in the system](/posts/images/where-ai-5.png)

## The most important architecture decision: the seam

Most discussions ask “rules or AI?” It's usually both. What matters is where you draw the line between what the model decides and what the system decides.

A model can read, investigate and recommend. It just shouldn't be the last step before something happens that you can't take back — money moving, access being granted, a customer being approved. Put a rule, a permission check, or a person in between.

And treat what the model produces as evidence, not fact. Check it against the source, or let the model say “I'm not sure” and hand off. Perfect rules applied to a misread document still give you the wrong answer.

## Put the line somewhere on purpose

![Where AI belongs in the system](/posts/images/where-ai-6.png "The model interprets. Its output gets checked. Only then does authority apply.")

Picking which document to look at next and approving a customer are both things a model could technically do. They shouldn't get the same freedom. Let an agent explore widely, and keep it on a short leash where it counts.

## Worked examples: the pattern is hybrid

All four use AI, just not in the same place. The pattern that works is a mix: the model reads or investigates, fixed logic applies the policy, and a person owns the calls that matter.

![Where AI belongs in the system](/posts/images/where-ai-7.png)

KYC shows it best. The model reads the documents, written policy stays as rules, and an agent earns its place only in the exception path, where you can't know in advance what to check. AML leaves the detection layer alone and brings in AI after the alert fires. Internal policy Q&A often needs nothing more than search plus one grounded answer.

![Where AI belongs in the system](/posts/images/where-ai-8.png)

## Five questions that should make you give the model less freedom

The model might be perfectly capable. The design still has to match what a mistake costs, what you can explain, and who answers for it.

![Where AI belongs in the system](/posts/images/where-ai-9.png)

## The trade that agentic systems create

Normal automation earns trust by being predictable. Known input plus known rule equals known outcome. You can read the rule, test it, and run it again.

GenAI already makes the output less predictable. Agents add two more kinds: the path varies, and when tools are involved, so do the actions. The model picks what to fetch, which tool to call, whether to keep going, and when it's done. You get something a fixed workflow can't do — but you gave something up.

![Where AI belongs in the system](/posts/images/where-ai-10.png "Watching isn't enough. It tells you what already happened. Something also has to decide what's allowed to happen next.")

## The more freedom you give, the more the runtime has to prove

![Where AI belongs in the system](/posts/images/where-ai-11.png)

Execution boundaries are the ones people forget: least-privilege tool access, scoped credentials, limits on how many actions one run can take, and a way to stop and roll back. Evidence tells you what went wrong. Boundaries decide how much one bad run can break.

A framework helps the agent think and act. A harness makes that run controlled, inspectable, recoverable and accountable. The further down the dial you go, the more you need it: a fixed workflow needs very little, a planning system needs a lot. The controls should grow with the freedom.

## Where this leaves us

The goal isn't the most autonomous system you can build. It's the simplest one that does the job well. Rules, classical ML, a single GenAI call, and plain workflows are all still enormously useful. Agents earn their place when you genuinely can't know the steps in advance.

![Where AI belongs in the system](/posts/images/where-ai-12.png)

This thinking is also what led us to build FastAIAgent: an open-source harness that makes runtime evidence, controls, recovery, and evaluation properties of the system rather than plumbing you rebuild on every project.

FastAIAgent - Open Source Agent harness : [github.com/fastaifoundry/fastaiagent-sdk](http://github.com/fastaifoundry/fastaiagent-sdk)
