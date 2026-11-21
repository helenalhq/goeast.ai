# GoEast P1 Decision Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development. Use code and database tests before delivery.

**Goal:** Deliver a private, one-time $1.99 career decision report from an existing free cast.

**Architecture:** The guided flow supplies original six lines; a separate server-only order store pins its owner, cast and offer. Signed Creem TEST events or the gated fixture drive monotonic order transitions; the verified owner can generate once, then reopen the report and record an action. The public sample needs no data or payment access.

**Tech Stack:** Next.js 16, TypeScript, Supabase service-role PostgREST, SQL RPC, Creem checkout v1, Vitest.

**Spec:** GoEast-TASK-P1-One-Time-Decision-Report.md, v1.

## Global Constraints

- USD 1.99, 199 cents, once; Pro remains unchanged; no live SKU, charge, or production environment changes.
- Disabled by default, test access only for the explicit QA scope and an isolated data project.
- Never read a client-supplied amount, identity, or fulfillment flag. Questions/reports stay out of URLs, analytics and logs.

## Review Focus

- Wrong mode/amount/currency/SKU/signature cannot unlock.
- Duplicate or out-of-order payment/refund, and cross-account access, cannot deliver private content.
- Interrupted generation can be retried without another checkout.
- Disabled preview still displays a useful public synthetic example.

### Tasks

- [ ] Add red tests and implement isolated environment, cast parsing and Creem event normalization in `lib/decision-*.ts`; lock down fixed terms and signatures.
- [ ] Add a transactional SQL state machine and bounded generation lease. Verify refund-before-payment, duplicate payment, cross-owner access and recovery against isolated local Postgres.
- [ ] Add checkout, callback, list and detail routes; wire real owner-bound artifact and mock provider fixture. Validate with route/fixture tests.
- [ ] Integrate cast/report/history and public sample; run suite, type check, targeted lint, production build and browser Preview smoke checks when available.
