"use client";

import React from "react";

export function HolographicVireonVisual() {
  return (
    <div className="relative w-full h-full min-h-[220px] sm:min-h-[260px] flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-[#080D15] via-[#060A10] to-[#04060A] border border-[#151E2E] p-4 group">
      {/* Background Radial Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15)_0%,_rgba(34,211,238,0.08)_40%,_transparent_75%)] pointer-events-none animate-pulse-glow" />

      {/* Holographic Stage Container */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center select-none">
        {/* Floor Hologram Pedestal / Rings */}
        <div className="absolute bottom-4 sm:bottom-6 w-44 sm:w-52 h-14 sm:h-16 rounded-[100%] border border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_30px_rgba(34,211,238,0.25)] flex items-center justify-center transform -rotate-x-60">
          {/* Inner Ring 1 */}
          <div className="w-36 sm:w-42 h-10 sm:h-12 rounded-[100%] border border-blue-500/40 animate-[spin_18s_linear_infinite]" />
          {/* Inner Ring 2 */}
          <div className="absolute w-28 sm:w-32 h-7 sm:h-8 rounded-[100%] border border-violet-500/50 animate-[spin_14s_linear_infinite_reverse]" />
          {/* Laser Core Emitter */}
          <div className="absolute w-12 sm:w-16 h-3 sm:h-4 rounded-[100%] bg-cyan-400/30 blur-[2px] shadow-[0_0_15px_rgba(34,211,238,0.8)]" />
        </div>

        {/* Vertical Upward Energy Beam */}
        <div className="absolute bottom-8 w-24 sm:w-32 h-44 sm:h-48 bg-gradient-to-t from-cyan-500/20 via-blue-500/10 to-transparent blur-md pointer-events-none animate-pulse-glow" />

        {/* Slow Floating 3D Isometric Hologram Assembly */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center z-10 transition-transform duration-700 animate-float-slow group-hover:scale-105">
          {/* Outer Slow Rotating Hexagon Ring */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full text-blue-500/40 animate-[spin_32s_linear_infinite] drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"
          >
            <polygon
              points="50 3, 93 25, 93 75, 50 97, 7 75, 7 25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          </svg>

          {/* Middle Counter-Rotating Precision Hexagon Ring */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full text-cyan-400/50 animate-[spin_24s_linear_infinite_reverse] drop-shadow-[0_0_10px_rgba(34,211,238,0.4)]"
          >
            <polygon
              points="50 8, 86 28, 86 72, 50 92, 14 72, 14 28"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>

          {/* Slow Orbital Ellipse Ring */}
          <svg
            viewBox="0 0 120 120"
            className="absolute -inset-2.5 w-[120px] h-[120px] text-violet-400/30 animate-[spin_28s_linear_infinite] pointer-events-none"
          >
            <ellipse
              cx="60"
              cy="60"
              rx="56"
              ry="26"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              transform="rotate(-25 60 60)"
            />
          </svg>

          {/* Isometric Glass Prism Box with Light Sweep */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl border border-cyan-400/50 bg-gradient-to-br from-blue-600/20 via-violet-600/15 to-cyan-500/25 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.35)] overflow-hidden">
            {/* Subtle Light Sweep Sheen */}
            <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none animate-light-sweep" />

            {/* Holographic VIREON Geometric V Core Monogram */}
            <svg
              viewBox="0 0 48 48"
              fill="none"
              className="w-12 h-12 sm:w-14 sm:h-14 text-cyan-300 drop-shadow-[0_0_14px_rgba(34,211,238,0.95)] z-10"
            >
              {/* Outer Hex Path */}
              <path
                d="M24 4L42 14V34L24 44L6 34V14L24 4Z"
                stroke="url(#vireon-grad)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Central Precision V Monogram */}
              <path
                d="M16 16L24 32L32 16"
                stroke="#FFFFFF"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M20 16L24 25L28 16"
                stroke="#22D3EE"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <defs>
                <linearGradient id="vireon-grad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3B82F6" />
                  <stop offset="0.5" stopColor="#22D3EE" />
                  <stop offset="1" stopColor="#8B5CF6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Corner Precision Nodes */}
            <span className="absolute -top-1 -left-1 w-2 h-2 rounded-sm bg-cyan-400 shadow-[0_0_6px_#22D3EE]" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-sm bg-blue-400 shadow-[0_0_6px_#3B82F6]" />
            <span className="absolute -bottom-1 -left-1 w-2 h-2 rounded-sm bg-violet-400 shadow-[0_0_6px_#8B5CF6]" />
            <span className="absolute -bottom-1 -right-1 w-2 h-2 rounded-sm bg-cyan-400 shadow-[0_0_6px_#22D3EE]" />
          </div>
        </div>

        {/* Ambient Orbiting Micro-Sparks */}
        <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-cyan-300 animate-ping opacity-60 pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-violet-400 animate-pulse opacity-75 pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse opacity-60 pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 w-1 h-1 rounded-full bg-cyan-400 animate-ping opacity-40 pointer-events-none delay-2" />
      </div>

      {/* Telemetry Caption Bar */}
      <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between text-[9px] font-mono text-slate-400 border-t border-[#151E2E]/60 pt-2">
        <span className="flex items-center gap-1.5 text-cyan-400 font-semibold tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse status-dot-active" />
          REVENUE ENGINE
        </span>
        <span className="text-slate-400 tracking-wider">ORCHESTRATION LAYER</span>
      </div>
    </div>
  );
}
