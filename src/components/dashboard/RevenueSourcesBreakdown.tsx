"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, PieChart } from "lucide-react";
import { formatINR } from "@/lib/utils";

export interface SourceMetric {
  source: string;
  amountAtRisk: number;
  recoveredAmount: number;
  recoveryRate: number;
  activeCasesCount: number;
}

export function RevenueSourcesBreakdown({
  sources = [],
  totalRecovered = 56700000,
}: {
  sources?: SourceMetric[];
  totalRecovered?: number;
}) {
  const items = [
    { name: "Payment Recovery", color: "#3B82F6", amount: 92500, percentage: 42 },
    { name: "Subscription Recovery", color: "#8B5CF6", amount: 21498, percentage: 24 },
    { name: "Checkout Abandonment", color: "#22D3EE", amount: 1249, percentage: 10 },
    { name: "B2B Receivables", color: "#10B981", amount: 1265000, percentage: 24 },
  ];

  // SVG Donut calculations
  const size = 136;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const segments = items.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (item.percentage / 100) * circumference;
    return { ...item, strokeDasharray, strokeDashoffset };
  });

  return (
    <div className="bg-gradient-to-b from-[#0C121D] via-[#080D15] to-[#05080E] border border-[#1E293B] hover:border-violet-500/40 rounded-2xl p-5 space-y-4 shadow-xl h-full flex flex-col justify-between relative overflow-hidden group transition-all duration-300">
      {/* Top Subtle Violet Laser Line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-violet-400 to-transparent opacity-70 group-hover:opacity-100 transition-opacity" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="w-3.5 h-3.5 text-violet-400" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">
            RECOVERY BY SOURCE
          </h3>
        </div>
        <span className="text-[10px] font-mono text-violet-400 font-bold bg-violet-950/50 border border-violet-500/30 px-2 py-0.5 rounded-full">
          4 CHANNELS
        </span>
      </div>

      {/* Chart & Legend Section */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* Donut Chart with Center Text and Orbital Calibration Ring */}
        <div className="relative flex items-center justify-center shrink-0">
          {/* Orbital Dashed Ring */}
          <svg
            width={size + 20}
            height={size + 20}
            className="absolute -inset-2.5 animate-[spin_40s_linear_infinite] pointer-events-none opacity-40 text-violet-400"
          >
            <circle
              cx={(size + 20) / 2}
              cy={(size + 20) / 2}
              r={(size + 14) / 2}
              fill="none"
              stroke="currentColor"
              strokeWidth="0.75"
              strokeDasharray="3 6"
            />
          </svg>

          <svg width={size} height={size} className="transform -rotate-90">
            {segments.map((seg) => (
              <circle
                key={seg.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 6px ${seg.color}88)`,
                }}
                className="transition-all duration-500 hover:brightness-125"
              />
            ))}
          </svg>

          {/* Center Text */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xs font-extrabold text-white font-mono drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              {formatINR(totalRecovered)}
            </span>
            <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              Recovered
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="space-y-2.5 w-full max-w-[210px]">
          {items.map((item) => (
            <div key={item.name} className="space-y-1 group/item">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color, boxShadow: `0 0 8px ${item.color}` }}
                  />
                  <span className="text-slate-300 truncate text-[11px] font-medium group-hover/item:text-white transition">
                    {item.name}
                  </span>
                </div>
                <span className="text-white font-mono text-[11px] font-bold">
                  {item.percentage}%
                </span>
              </div>
              {/* Micro Progress Bar */}
              <div className="w-full h-1 bg-[#151E2E] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
