# VIREON — Revenue Intelligence Infrastructure

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2.35-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![LangGraph](https://img.shields.io/badge/LangGraph-Multi--Agent-FF6F00?style=flat-square)](https://langchain-ai.github.io/langgraphjs/)
[![Razorpay API](https://img.shields.io/badge/Razorpay-API%20v1-0C2340?style=flat-square&logo=razorpay)](https://razorpay.com/docs/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)

> **Turn failed, delayed, and abandoned revenue into an intelligent recovery pipeline.**

VIREON is an institutional-grade revenue intelligence platform designed to autonomously detect, diagnose, orchestrate, and settle revenue leakage across the modern payment stack. Combining bounded LangGraph multi-agent triage with deterministic policy guardrails and native Razorpay checkout settlement, VIREON protects enterprise revenue without unpredictable AI behavior.

---

## 📑 Table of Contents
1. [Executive Summary & Core Value](#-executive-summary--core-value)
2. [Unified Revenue Recovery Engines](#-unified-revenue-recovery-engines)
3. [System Architecture & Multi-Agent Triage](#-system-architecture--multi-agent-triage)
4. [Policy Engine & Financial Guardrails](#-policy-engine--financial-guardrails)
5. [Razorpay Integration & Settlement Invariants](#-razorpay-integration--settlement-invariants)
6. [Controlled Demo Portfolio & Scenarios](#-controlled-demo-portfolio--scenarios)
7. [Technology Stack](#-technology-stack)
8. [Getting Started & Local Setup](#-getting-started--local-setup)
9. [Environment Configuration](#-environment-configuration)
10. [Database Architecture & Schema](#-database-architecture--schema)
11. [API Reference](#-api-reference)
12. [Verification & Test Suites](#-verification--test-suites)
13. [Security & Production Readiness](#-security--production-readiness)

---

## ⚡ Executive Summary & Core Value

Traditional dunning and recovery systems rely on static, scheduled cron jobs and generic email templates that ignore error telemetry, customer lifetime value, and payment method nuances. 

**VIREON replaces blunt retries with precision revenue intelligence:**
- **Zero Financial Float**: All internal accounting, balances, and transaction thresholds are stored and calculated strictly in integer paise (`BigInt` in PostgreSQL) to eliminate floating-point precision loss.
- **Bounded Multi-Agent Orchestration**: Specialized AI agents evaluate risk, diagnose root causes, formulate recovery strategies, and verify policy constraints within a deterministic finite state machine.
- **Hard Policy Thresholds**: Human approval gates are strictly enforced for high-value transactions (e.g., $\ge ₹1,00,000$), ensuring AI autonomy remains bounded and safe.
- **Atomic Verification & Settlement**: Direct integration with Razorpay Checkout.js, server-side HMAC signature verification, and idempotent webhook reconciliation.

---

## 🔄 Unified Revenue Recovery Engines

VIREON provides end-to-end recovery workflows across all 4 primary revenue leakage streams:

| Revenue Stream | Root Cause Scenarios | Automated Recovery Strategy | Settlement Mechanism |
| :--- | :--- | :--- | :--- |
| **💳 Payment Failure** | 3DS dropoff, card authentication timeout, bank server downtime | Smart retry scheduling, dynamic 1-click fallback links, UPI intent dispatch | Razorpay Checkout / API |
| **🔁 Subscription Dunning** | Recurring card failure, eNACH mandate rejection, max mandate cap | Intelligent mandate retry interval, self-serve payment method update links | Razorpay Subscriptions / Mandates |
| **🛒 Checkout Abandonment** | Cart dropoff, high-friction checkout, abandoned high-value carts | Pre-filled Razorpay test orders with dynamic time-limited incentives | Razorpay Payment Links / Checkout |
| **🏢 B2B Receivables** | Overdue corporate invoices, delayed payment commitments | Structured Promise-to-Pay tracking, automated aging dunning, executive escalation | Razorpay Invoices / Corporate Settlement |

---

## 🏗 System Architecture & Multi-Agent Triage

VIREON utilizes a **7-Stage Lifecycle Pipeline** managed by LangGraph and PostgreSQL state checkpoints:

```mermaid
flowchart LR
    A["01 DETECTED"] --> B["02 ANALYZED"]
    B --> C["03 QUALIFIED"]
    C --> D["04 STRATEGY"]
    D --> E["05 APPROVED"]
    E --> F["06 EXECUTED"]
    F --> G["07 RECOVERED"]
    
    style A fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff
    style B fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff
    style C fill:#1e293b,stroke:#22d3ee,stroke-width:2px,color:#fff
    style D fill:#1e293b,stroke:#8b5cf6,stroke-width:2px,color:#fff
    style E fill:#1e293b,stroke:#f59e0b,stroke-width:2px,color:#fff
    style F fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#fff
    style G fill:#1e293b,stroke:#10b981,stroke-width:2px,color:#fff
```

### The Multi-Agent Triage Pipeline:
1. **Risk Scoring Agent**: Computes multidimensional risk and recoverability scores based on customer tier, historical payment success rate, and lifetime value.
2. **Diagnostic Agent**: Ingests raw Razorpay error codes (`BAD_REQUEST_ERROR`, `AUTHENTICATION_FAILED`, `INSUFFICIENT_FUNDS`, etc.) to isolate the root cause.
3. **Strategy Agent**: Selects the highest-probability recovery intervention (e.g., `CREATE_PAYMENT_LINK`, `RETRY_SUBSCRIPTION`, `CREATE_PROMISE_TO_PAY`).
4. **Policy Evaluation Agent**: Validates proposed actions against organizational guardrails, rate limits, and approval caps.
5. **Execution Agent**: Interacts with the Razorpay Cloud API to generate verified checkout sessions, payment links, or scheduled retries.

---

## 🛡 Policy Engine & Financial Guardrails

To prevent unintended customer communications or unauthorized financial actions, VIREON implements strict policy guardrails:

```
┌─────────────────────────────────────────────────────────────┐
│                    POLICY ENGINE GUARDRAILS                 │
├──────────────────────────────┬──────────────────────────────┤
│ Rule                         │ Enforcement Action           │
├──────────────────────────────┼──────────────────────────────┤
│ Amount ≥ ₹1,00,000           │ Require Human Approval Gate  │
│ (10,000,000 paise)           │ (State: AWAITING_APPROVAL)   │
├──────────────────────────────┼──────────────────────────────┤
│ Maximum Retries Exceeded     │ Halt Automation & Escalate   │
│ (Default: 3 retries max)     │ (State: ESCALATED_TO_HUMAN)  │
├──────────────────────────────┼──────────────────────────────┤
│ Anti-Spam Contact Frequency  │ Enforce Cooldown Interval    │
│ (Max 3 contacts / 24h)       │ (Suppress premature dunning) │
├──────────────────────────────┼──────────────────────────────┤
│ Customer In Dispute / Legal  │ Immediate Stop Recovery      │
│                              │ (State: RECOVERY_STOPPED)    │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 💳 Razorpay Integration & Settlement Invariants

VIREON integrates with Razorpay via a unified provider architecture (`IRazorpayService`):

```mermaid
sequenceDiagram
    autonumber
    participant Browser as VIREON Frontend
    participant Server as VIREON Backend
    participant Razorpay as Razorpay Cloud API
    participant DB as PostgreSQL Database

    Browser->>Server: POST /api/recovery/cases/[id]/checkout
    Server->>Razorpay: createOrder({ amount: paise, currency: 'INR' })
    Razorpay-->>Server: order_TVX... (Cloud Order Created)
    Server-->>Browser: { orderId: 'order_TVX...', amount: paise }
    Browser->>Razorpay: Razorpay(options).open()
    Note over Browser,Razorpay: Customer completes Test Payment
    Razorpay-->>Browser: { razorpay_payment_id, razorpay_signature }
    Browser->>Server: POST /api/recovery/cases/[id]/payment/verify
    Server->>Server: HMAC-SHA256 Signature Verification
    Server->>DB: Atomic Transaction: status=RECOVERED, recoveredAmount=paise
    Server-->>Browser: { success: true, case: updatedCase }
```

### Razorpay Invariants Enforced:
- **Real Cloud Order IDs**: Stale/mock order prefixes (`order_demo_*`, `order_mock_*`, `order_sandbox_*`) are automatically rejected; fresh cloud orders are generated via `https://api.razorpay.com/v1/orders`.
- **HMAC Verification**: Server-side verification using `crypto.createHmac('sha256', secret)` validates payment authenticity before database transition.
- **Idempotent Webhooks**: Duplicate webhook deliveries or repeated verification requests never double-count revenue.

---

## 🎯 Controlled Demo Portfolio & Scenarios

VIREON features an 8-case multi-value Demo Portfolio designed for reproducible demonstrations across varied transaction sizes:

| Case ID | Customer Entity | Source Category | Root Cause Scenario | Amount (Paise) | Display Amount | State Machine Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **REC-DEMO-001** | Acme Technologies India Pvt Ltd | Payment Recovery | Authentication / 3DS Timeout | `2500000n` | **₹25,000** | `RECOVERED` |
| **REC-DEMO-002** | NovaCloud Systems | Subscription Recovery | Recurring Card Failure | `849900n` | **₹8,499** | `AWAITING_PAYMENT` |
| **REC-DEMO-003** | Meridian Retail | Checkout Abandonment | Cart Abandonment Dropoff | `124900n` | **₹1,249** | `ACTION_SELECTED` |
| **REC-DEMO-004** | Vertex Industries | B2B Receivables | Overdue Corporate Invoice | `27500000n` | **₹2,75,000** | `AWAITING_APPROVAL` 🛡️ |
| **REC-DEMO-005** | **Orion Media** *(Hero Live Demo)* | Payment Recovery | Card Authentication Failure | `6750000n` | **₹67,500** | `AWAITING_PAYMENT` |
| **REC-DEMO-006** | BluePeak Logistics | B2B Receivables | Broken Payment Commitment | `15000000n` | **₹1,50,000** | `AWAITING_APPROVAL` 🛡️ |
| **REC-DEMO-007** | Atlas Software | Subscription Recovery | Recurring Payment Failure | `1299900n` | **₹12,999** | `DIAGNOSED` |
| **REC-DEMO-008** | Zenith Manufacturing | B2B Receivables | High-Value Corporate Invoice | `84000000n` | **₹8,40,000** | `AWAITING_APPROVAL` 🛡️ |

---

## 💻 Technology Stack

### Frontend & UI Layer
- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server & Client Components)
- **UI & Styling**: React 18, [Tailwind CSS](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/)
- **Real-Time Stream**: Server-Sent Events (SSE) via `/api/events/stream`
- **Payment UI**: Razorpay Standard Checkout.js (`https://checkout.razorpay.com/v1/checkout.js`)

### Backend & Orchestration
- **Runtime**: Node.js 18+ / 20+
- **Agent Framework**: [@langchain/langgraph](https://langchain-ai.github.io/langgraphjs/)
- **Database & ORM**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Payment SDK**: Official [Razorpay Node SDK](https://github.com/razorpay/razorpay-node)
- **Validation**: [Zod](https://zod.dev/) type validation

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- Node.js 18.x or higher
- PostgreSQL database instance
- Razorpay Sandbox Account ([Dashboard](https://dashboard.razorpay.com/))

### 1. Clone the Repository
```bash
git clone https://github.com/siddharth07-code/Razorpay-buildathon.git
cd Razorpay-buildathon
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```bash
cp .env.example .env
```
*(See [Environment Configuration](#-environment-configuration) for required keys)*

### 4. Initialize Database
```bash
# Generate Prisma client
npm run db:generate

# Push schema to PostgreSQL database
npm run db:push

# (Optional) Seed initial demo cases
npm run db:seed
```

### 5. Launch Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Configuration

| Variable | Description | Example / Required Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:password@localhost:5432/vireon_db` |
| `RAZORPAY_MODE` | Gateway execution mode | `sandbox` (or `mock` for offline tests) |
| `RAZORPAY_ENVIRONMENT` | Razorpay environment level | `test` |
| `RAZORPAY_KEY_ID` | Razorpay Test Key ID | `rzp_test_XXXXXXXXXXXXXX` |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Key Secret | `YOUR_RAZORPAY_SECRET` |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification secret | `YOUR_WEBHOOK_SECRET` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public key exposed to Checkout.js | `rzp_test_XXXXXXXXXXXXXX` |
| `GEMINI_API_KEY` | Google Gemini AI Key (Optional) | `AIzaSy...` |

---

## 🗄 Database Architecture & Schema

All core entities are mapped via Prisma with native relations:

```
┌──────────────────┐       1:N       ┌─────────────────────┐
│     Customer     ├─────────────────┤    RecoveryCase     │
└────────┬─────────┘                 └──────────┬──────────┘
         │ 1:N                                  │ 1:N
┌────────┴─────────┐                 ┌──────────┴──────────┐
│     Payment      │                 │   RecoveryAttempt   │
└──────────────────┘                 └─────────────────────┘
                                                │ 1:N
                                     ┌──────────┴──────────┐
                                     │     AuditEvent      │
                                     └─────────────────────┘
```

### Key Prisma Models:
- **`RecoveryCase`**: Core recovery state machine ledger, storing `amountAtRisk`, `recoveredAmount`, `status`, `currentStep`, `riskScore`, `requiresHumanApproval`.
- **`Customer`**: Customer profile, tier (`GROWTH`, `ENTERPRISE`), historical payment stats, preferred payment method.
- **`Payment`**: Razorpay payment records, error step, error reason, and status.
- **`RecoveryAttempt`**: Audit log of all recovery interventions dispatched with timestamp and response metadata.
- **`HumanApproval`**: Approval records for cases exceeding policy threshold caps ($\ge ₹1,00,000$).

---

## 🔌 API Reference

### Recovery & Checkout Endpoints
- **`POST /api/recovery/cases/:id/checkout`**: Creates or reuses an official Razorpay cloud order for the case amount.
- **`POST /api/recovery/cases/:id/payment/verify`**: Verifies Razorpay payment signature via HMAC-SHA256 and atomically settles case.
- **`POST /api/recovery/cases/:id/run`**: Initiates LangGraph multi-agent triage on an active case.
- **`POST /api/recovery/cases/:id/resume`**: Resumes workflow execution following a human approval gate.
- **`GET /api/recovery/cases/:id/timeline`**: Returns chronological execution trace and telemetry events.

### Demo & Platform Endpoints
- **`POST /api/demo/recovery/reset`**: Deterministically restores the 8-case demo portfolio without touching production records.
- **`GET /api/metrics`**: Returns authoritative KPI figures from `DashboardService`.
- **`GET /api/events/stream`**: Real-time Server-Sent Events stream of recovery activity.
- **`POST /api/webhooks/razorpay`**: Authoritative Razorpay webhook receiver.

---

## 🧪 Verification & Test Suites

VIREON includes focused automated test suites covering financial math, state machine invariants, Razorpay cloud APIs, and multi-value portfolio regression:

```bash
# Run Phase 17 Multi-Value Portfolio Suite
npx tsx -r dotenv/config backend/src/tests/run-phase17-suite.ts

# Run Phase 18 Live Razorpay Acceptance Suite
npx tsx -r dotenv/config backend/src/tests/run-phase18-suite.ts

# Run TypeScript Typecheck
npx tsc --noEmit

# Run Next.js Production Build
npm run build
```

---

## 🔒 Security & Production Readiness

- **Strict Secret Protection**: Client bundles and API responses are audited to ensure zero private keys (`RAZORPAY_KEY_SECRET`, `DATABASE_URL`) are exposed.
- **Server-Side Verification**: No client-side payment confirmation is trusted without cryptographic HMAC-SHA256 signature verification.
- **Bounded Autonomous Execution**: AI agents are incapable of directly executing unvalidated database updates or payments without passing through deterministic policy guardrails.
- **Idempotency & Replay Protection**: Webhook handlers and checkout verifications use unique event IDs and atomic Prisma transactions to prevent duplicate settlement.

---

## 📄 License & Attribution

Developed for the **Razorpay Buildathon 2026**.  
Built by **Siddharth Lal** and the VIREON team.

Distributed under the MIT License. See `LICENSE` for more information.
