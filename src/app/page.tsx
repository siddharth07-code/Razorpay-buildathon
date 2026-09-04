"use client";

import React, { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { VireonKpiCards } from "@/components/dashboard/VireonKpiCards";
import { HolographicVireonVisual } from "@/components/dashboard/HolographicVireonVisual";
import { RecoveryFunnel } from "@/components/dashboard/RecoveryFunnel";
import { RevenueSourcesBreakdown } from "@/components/dashboard/RevenueSourcesBreakdown";
import { CuratedRecentActivity } from "@/components/dashboard/CuratedRecentActivity";
import { ConciseCasesTable } from "@/components/dashboard/ConciseCasesTable";
import { LiveRecoveryDemoPanel } from "@/components/dashboard/LiveRecoveryDemoPanel";
import { RecoveryCase } from "@/types";

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoPanelOpen, setIsDemoPanelOpen] = useState(false);
  const [dateRange, setDateRange] = useState("Last 30 Days");

  const loadData = async (range = dateRange) => {
    try {
      const [mRes, cRes] = await Promise.all([
        fetch(`/api/metrics?range=${encodeURIComponent(range)}`),
        fetch(`/api/cases?range=${encodeURIComponent(range)}`),
      ]);

      if (mRes.ok) {
        const mData = await mRes.json();
        setMetrics(mData);
      }

      if (cRes.ok) {
        const cData = await cRes.json();
        setCases(cData.cases || []);
      }
    } catch (err) {
      console.error("[VIREON] Error loading telemetry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(dateRange);
    const interval = setInterval(() => {
      loadData(dateRange);
    }, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const totalAtRisk = metrics?.totalRevenueAtRisk !== undefined ? metrics.totalRevenueAtRisk : 1380247;
  const totalPipeline = metrics?.totalExpectedRecovery !== undefined ? metrics.totalExpectedRecovery : 1109980;
  const totalRecovered = metrics?.totalRevenueRecovered !== undefined ? metrics.totalRevenueRecovered : 25000;
  const recoveryRate = metrics?.autonomousRecoveryRate !== undefined ? metrics.autonomousRecoveryRate : 68.3;

  return (
    <div className="relative space-y-5 w-full min-h-screen">
      {/* Futuristic Ambient Spatial Atmosphere & Cybernetic Grid */}
      <div className="absolute -top-12 -left-20 -right-20 h-96 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(34,211,238,0.08),rgba(139,92,246,0.05),transparent)] pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-2/3 -left-32 w-96 h-96 bg-violet-600/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Application Header with Functional Precision Date Range Dropdown */}
      <Header
        onRefresh={() => loadData(dateRange)}
        onQuickInject={() => loadData(dateRange)}
        dateRange={dateRange}
        onDateRangeChange={(newRange) => {
          setDateRange(newRange);
          loadData(newRange);
        }}
        pageTitle="Overview"
      />

      {/* Main Workspace Grid */}
      <div className="flex flex-col lg:flex-row items-start gap-5 w-full">
        <div className="flex-1 w-full space-y-5 min-w-0">
          {/* Top Row: 4 Dominant Financial KPIs (Left) + Holographic Structure (Right) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch animate-fadeInUp delay-1">
            {/* 4 Financial KPI Cards */}
            <div className="xl:col-span-9 flex flex-col justify-between">
              <VireonKpiCards
                metrics={{
                  totalRevenueAtRisk: totalAtRisk,
                  totalExpectedRecovery: totalPipeline,
                  totalRevenueRecovered: totalRecovered,
                  autonomousRecoveryRate: recoveryRate,
                  activeCasesCount: cases.length || 142,
                  dateRangeLabel: dateRange,
                }}
              />
            </div>

            {/* Holographic VIREON Engine Visual */}
            <div className="xl:col-span-3 flex">
              <HolographicVireonVisual />
            </div>
          </div>

          {/* Middle Row: Recovery Pipeline (Left) + Recovery By Source (Center) + Recent Activity (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch animate-fadeInUp delay-2">
            {/* Recovery Pipeline Timeline */}
            <div className="lg:col-span-5 flex">
              <div className="w-full">
                <RecoveryFunnel
                  stages={metrics?.funnel}
                  activeCasesCount={cases.length || 142}
                  pipelineAmount={totalPipeline}
                  recoveryRate={recoveryRate}
                />
              </div>
            </div>

            {/* Recovery By Source Donut */}
            <div className="lg:col-span-4 flex">
              <div className="w-full">
                <RevenueSourcesBreakdown
                  sources={metrics?.revenueSources || []}
                  totalRecovered={totalRecovered}
                />
              </div>
            </div>

            {/* Active Recovery Cases + Recent Activity Ledger */}
            <div className="lg:col-span-3 flex">
              <div className="w-full">
                <CuratedRecentActivity
                  events={metrics?.recentActivity || []}
                  activeCasesCount={cases.length || 142}
                />
              </div>
            </div>
          </div>

          {/* Bottom Row: Active Recovery Cases Operations Table */}
          <div className="animate-fadeInUp delay-3">
            <ConciseCasesTable
              cases={cases}
              onCaseUpdated={() => loadData(dateRange)}
              onInspectCase={() => setIsDemoPanelOpen(true)}
            />
          </div>
        </div>

        {/* Live Recovery Demo Side Panel if Opened */}
        {isDemoPanelOpen && (
          <LiveRecoveryDemoPanel
            isOpen={isDemoPanelOpen}
            onClose={() => setIsDemoPanelOpen(false)}
            onRecoveryCompleted={loadData}
          />
        )}
      </div>
    </div>
  );
}

