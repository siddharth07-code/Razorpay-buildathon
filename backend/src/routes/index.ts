import { Router } from "express";
import { getHealth } from "../controllers/health.controller";
import {
  getDashboardSummary,
  getDashboardRecovery,
  getDashboardTrends,
} from "../controllers/dashboard.controller";
import { getCustomers, getCustomerById } from "../controllers/customer.controller";
import { getPayments, getPaymentById } from "../controllers/payment.controller";
import {
  getRecoveryCases,
  getRecoveryCaseById,
  startRecoveryCase,
  analyzeRecoveryCase,
  selectCaseStrategy,
  validateCasePolicy,
  executeRecoveryCase,
  stopRecoveryCase,
  escalateRecoveryCase,
  getCaseTimeline,
  getPriorityQueue,
  getRecoveryStats,
} from "../controllers/recovery.controller";
import { getAuditEvents, getAuditEventsByCaseId } from "../controllers/audit.controller";
import { getAgentStatus, getAgentEvents, runAgentTests } from "../controllers/agent.controller";
import { getRazorpayStatus, testConnection } from "../controllers/razorpay.controller";
import { handleRazorpayWebhook } from "../controllers/webhook.controller";
import { startDemoRecovery, resetDemoRecovery } from "../controllers/demo.controller";
import { handleEventStream } from "../controllers/events.controller";
import {
  getAnalyticsOverview,
  getRevenueTrend,
  getRecoveryFunnel,
  getInterventions,
  getRootCauses,
  getCustomerSegments,
  getAgentPerformance,
  getRecoveryROI,
  getScorecard,
} from "../controllers/analytics.controller";
import {
  runRecoveryGraph,
  resumeRecoveryGraph,
  getRecoveryGraphState,
  getRecoveryGraphTopology,
} from "../controllers/graph.controller";

const router = Router();

// Health
router.get("/health", getHealth);

// Server-Sent Events (SSE) Real-Time Stream
router.get("/events/stream", handleEventStream);

// Dashboard
router.get("/dashboard/summary", getDashboardSummary);
router.get("/dashboard/recovery", getDashboardRecovery);
router.get("/dashboard/trends", getDashboardTrends);

// Revenue Intelligence Analytics
router.get("/analytics/overview", getAnalyticsOverview);
router.get("/analytics/revenue-trend", getRevenueTrend);
router.get("/analytics/funnel", getRecoveryFunnel);
router.get("/analytics/interventions", getInterventions);
router.get("/analytics/root-causes", getRootCauses);
router.get("/analytics/customer-segments", getCustomerSegments);
router.get("/analytics/agent-performance", getAgentPerformance);
router.get("/analytics/roi", getRecoveryROI);
router.get("/analytics/scorecard", getScorecard);

// Customers
router.get("/customers", getCustomers);
router.get("/customers/:id", getCustomerById);

// Payments
router.get("/payments", getPayments);
router.get("/payments/:id", getPaymentById);

// Recovery Orchestrator Endpoints
router.get("/recovery/priority", getPriorityQueue);
router.get("/recovery/stats", getRecoveryStats);
router.get("/recovery/cases", getRecoveryCases);
router.get("/recovery/cases/:id", getRecoveryCaseById);
router.post("/recovery/cases/:id/start", startRecoveryCase);
router.post("/recovery/cases/:id/analyze", analyzeRecoveryCase);
router.post("/recovery/cases/:id/strategy", selectCaseStrategy);
router.post("/recovery/cases/:id/policy", validateCasePolicy);
router.post("/recovery/cases/:id/execute", executeRecoveryCase);
router.post("/recovery/cases/:id/stop", stopRecoveryCase);
router.post("/recovery/cases/:id/escalate", escalateRecoveryCase);
// LangGraph Workflow Endpoints
router.post("/recovery/cases/:id/run", runRecoveryGraph);
router.post("/recovery/cases/:id/resume", resumeRecoveryGraph);
router.get("/recovery/cases/:id/graph-state", getRecoveryGraphState);
router.get("/recovery/graph", getRecoveryGraphTopology);

// Real Razorpay Demo Scenario Endpoints
router.post("/demo/recovery/start", startDemoRecovery);
router.post("/demo/recovery/reset", resetDemoRecovery);

// Audit
router.get("/audit", getAuditEvents);
router.get("/audit/:caseId", getAuditEventsByCaseId);

// Agents
router.get("/agents/status", getAgentStatus);
router.get("/agents/events", getAgentEvents);
router.get("/agents/tests", runAgentTests);

// Razorpay
router.get("/razorpay/status", getRazorpayStatus);
router.post("/razorpay/connection-test", testConnection);

// Webhooks
router.post("/webhooks/razorpay", handleRazorpayWebhook);

export default router;
