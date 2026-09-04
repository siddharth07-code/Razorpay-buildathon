"use client";

import React, { useState } from "react";
import { History, ShieldCheck, Filter, Search } from "lucide-react";
import { formatDateTime, formatRelativeTime } from "@/lib/utils";

export default function AuditPage() {
  const [auditEvents] = useState([
    {
      id: "aud_001",
      entityType: "SANDBOX_SIMULATION",
      entityId: "system_init",
      eventType: "SANDBOX_ENVIRONMENT_BOOTSTRAPPED",
      actor: "SYSTEM",
      description: "VIREON Razorpay Demo Environment initialized with Indian merchant datasets.",
      payload: {
        mode: "sandbox",
        currency: "INR",
        merchant: "VIREON Technologies India",
      },
      timestamp: new Date(Date.now() - 3600 * 72 * 1000).toISOString(),
    },
    {
      id: "aud_002",
      entityType: "PAYMENT",
      entityId: "pay_zenith_001",
      eventType: "PAYMENT_FAILED_WEBHOOK_PROCESSED",
      actor: "RAZORPAY_WEBHOOK",
      description: "Received payment.failed event for ₹1,49,999 (Customer: Zenith Edutech Pvt Ltd).",
      payload: {
        paymentId: "pay_zenith_001",
        amount: 149999,
        errorCode: "INSUFFICIENT_FUNDS",
      },
      timestamp: new Date(Date.now() - 3600 * 4 * 1000).toISOString(),
    },
    {
      id: "aud_003",
      entityType: "AGENT_DECISION",
      entityId: "dec_001",
      eventType: "AGENT_DECISION_EXECUTED",
      actor: "VIREON_ENGINE",
      description: "Strategy decided: SCHEDULE_SMART_RETRY (Confidence 94%). Scheduled for 02:45 PM IST.",
      payload: {
        caseId: "case_rec_001",
        confidence: 0.94,
        targetWindow: "14:45 IST",
      },
      timestamp: new Date(Date.now() - 3600 * 4 * 1000).toISOString(),
    },
    {
      id: "aud_004",
      entityType: "RECOVERY_CASE",
      entityId: "case_rec_004",
      eventType: "REVENUE_RECOVERED_SUCCESS",
      actor: "VIREON_ENGINE",
      description: "Autonomous recovery completed for CloudNest Infrastructure Labs (₹3,20,000 INR).",
      payload: {
        caseId: "case_rec_004",
        amountRecovered: 320000,
        method: "Razorpay Smart Retry",
      },
      timestamp: new Date(Date.now() - 3600 * 48 * 1000).toISOString(),
    },
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <History className="w-6 h-6 text-razorpay-400" />
          <span>Audit Trail & Compliance Log</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event ledger tracking every payment failure webhook, agent decision, and money recovery.
        </p>
      </div>

      <div className="glass-card rounded-xl border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditEvents.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                    {formatDateTime(ev.timestamp)}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-razorpay-400 font-medium">
                    {ev.eventType}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-semibold text-slate-300">
                      {ev.actor}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                    {ev.entityType}
                  </td>
                  <td className="py-3 px-4 text-slate-200">
                    {ev.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
