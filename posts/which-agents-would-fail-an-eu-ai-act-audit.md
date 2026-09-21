---
title: Which of Your AI Agents Would Fail an EU AI Act Audit Today?
date: Sep 13, 2026
tag: Compliance
kind: video
minutes: 2
summary: Most teams answer that with a document. This answers it with production evidence — two agents failing the audit, captured automatically, every record hash-chained for the auditor.
author: Upendra Bhandari
cover: ./posts/images/audit-failures-cover.jpg
---

Which of your AI agents would fail an EU AI Act audit today?

Most teams answer that with a document. This answers it with production evidence.

In the video, two agents fail the audit: one ran with a safety guardrail that could not execute and let the request through, the other shipped with no evaluation evidence. Both were captured automatically, the failed check attached as evidence, every record hash-chained for the auditor.

Under the hood: register your agents as AI systems, get them risk-classified and their obligations assigned, then let traces, guardrail results, eval verdicts and human approvals become the evidence, checked every 15 minutes, with an exportable dossier and a live view of which agents have gone dark.

## A 60-second walkthrough of the live product

![Two agents failing an EU AI Act audit, captured automatically from runtime evidence](/posts/videos/eu-ai-act-audit-failures.mp4 "Monitoring: a critical control non-operational while traffic passed, and a high-severity finding for an agent with no eval evidence — both derived every 15 minutes, not filed by hand.")

A guardrail that errored while traffic passed, or a system with no passing Agent-CI evidence, shows up here without anyone filing it.

The argument behind this is in [Evidence, not attestation](/blog/evidence-not-attestation/), and the companion demo — binding obligations to live runtime evidence — is in [Can you prove that control actually operated?](/blog/prove-the-control-was-operating/). The [Enterprise page](/enterprise.html) covers the governance layer in full.
