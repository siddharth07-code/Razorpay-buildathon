"use client";

import React, { useState } from "react";
import Link from "next/link";
import GhostFibers from "@/components/GhostFibers";
import { VireonLogo } from "@/components/brand/VireonLogo";
import { ArrowLeft, Sliders, Activity, Sparkles, RefreshCw } from "lucide-react";

export default function GhostFibersShowcasePage() {
  // Preset selector
  const [preset, setPreset] = useState<"default" | "vireon-cyan" | "neon-emerald">("default");
  const [speed, setSpeed] = useState(0.2);
  const [layers, setLayers] = useState(8);
  const [scale, setScale] = useState(2);
  const [glowIntensity, setGlowIntensity] = useState(1.6);
  const [paused, setPaused] = useState(false);

  // Preset color mappings
  const colorConfigs = {
    default: {
      lineColor: "#0e0e35",
      glowColor: "#a0347d",
      title: "React Bits Original",
      tag: "MAGENTA / VIOLET",
    },
    "vireon-cyan": {
      lineColor: "#061224",
      glowColor: "#00d8ff",
      title: "VIREON Intelligence",
      tag: "CYAN / ELECTRIC BLUE",
    },
    "neon-emerald": {
      lineColor: "#041a12",
      glowColor: "#10b981",
      title: "Settled Capital",
      tag: "EMERALD / MINT",
    },
  };

  const activeConfig = colorConfigs[preset];

  return (
    <div className="min-h-screen bg-[#04060A] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-[#151E2E] bg-[#070B12]/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/landing"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-2.5 py-1.5 rounded-lg border border-[#151E2E] hover:border-slate-700 bg-[#080D15]"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Landing</span>
          </Link>
          <div className="h-4 w-px bg-[#151E2E]" />
          <div className="flex items-center gap-2">
            <VireonLogo variant="mark" size="xs" />
            <span className="font-bold text-sm tracking-wider text-white">VIREON</span>
            <span className="text-xs text-cyan-400 font-mono">/</span>
            <span className="text-xs text-slate-300 font-mono font-medium">&lt;GhostFibers /&gt;</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 font-mono text-[11px]">
            <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
            WebGL 2.0 • 60 FPS
          </span>
          <Link
            href="/"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition"
          >
            Command Center
          </Link>
        </div>
      </header>

      {/* Main Showcase Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 space-y-8">
        {/* Title Section */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1522] border border-cyan-500/30 text-cyan-400 text-[11px] font-semibold tracking-wider uppercase">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>REACT BITS COMPONENT SHOWCASE</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            GhostFibers Visual Shader Component
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Multi-layered procedural WebGL fiber field powered by <code className="text-cyan-300 font-mono">ogl</code>. Recursive wave displacements, angular distortion twists, film grain, and high-dynamic tone mapping.
          </p>
        </div>

        {/* The Exact Usage Example Canvas Component */}
        <div className="relative rounded-2xl border border-[#151E2E] bg-[#05080E] overflow-hidden shadow-2xl">
          {/* Top Canvas Bar */}
          <div className="absolute top-0 inset-x-0 z-20 px-4 py-3 bg-[#080D15]/80 backdrop-blur-md border-b border-[#151E2E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 text-xs font-mono text-slate-400">canvas: 100% × 600px</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaused(!paused)}
                className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#0E1624] hover:bg-[#152238] border border-[#1E2C44] text-slate-300 transition"
              >
                {paused ? "▶ RESUME" : "⏸ PAUSE"}
              </button>
            </div>
          </div>

          {/* EXACT USAGE EXAMPLE CONTAINER (width: 100%, height: 600px, position: relative) */}
          <div style={{ width: "100%", height: "600px", position: "relative" }}>
            <GhostFibers
              lineColor={activeConfig.lineColor}
              glowColor={activeConfig.glowColor}
              speed={speed}
              scale={scale}
              rotation={0}
              rotationSpeed={0.25}
              layers={layers}
              waveAmplitude={0.015}
              waveFrequency={3}
              waveSpeed={-0.85}
              layerSpeed={0.08}
              twist={0.1}
              twistFrequency={5}
              twistSpeed={1.2}
              lineFrequency={5}
              lineSpacing={2}
              lineSharpness={16}
              glowFalloff={10}
              glowIntensity={glowIntensity}
              brightness={2}
              blueBoost={1.25}
              vignette={0.8}
              grain={0.05}
              dpr={2}
              paused={paused}
            />

            {/* Subtle Futuristic HUD Overlay */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none bg-[#05080E]/70 backdrop-blur-md border border-[#151E2E] rounded-xl px-4 py-2.5 text-xs font-mono text-slate-300 space-y-1">
              <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                {activeConfig.title}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-3">
                <span>Layers: <b className="text-white">{layers}</b></span>
                <span>Speed: <b className="text-white">{speed}x</b></span>
                <span>Scale: <b className="text-white">{scale}x</b></span>
                <span>Glow: <b className="text-white">{glowIntensity}</b></span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Controls & Preset Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Presets */}
          <div className="lg:col-span-4 bg-[#080D15] border border-[#151E2E] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Color Palettes</span>
            </div>

            <div className="space-y-2">
              {(Object.keys(colorConfigs) as Array<keyof typeof colorConfigs>).map((key) => {
                const cfg = colorConfigs[key];
                const isActive = preset === key;
                return (
                  <button
                    key={key}
                    onClick={() => setPreset(key)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isActive
                        ? "bg-[#0E1624] border-cyan-500/50 shadow-md shadow-cyan-950/30"
                        : "bg-[#05080E] border-[#151E2E] hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{cfg.title}</div>
                      <div className="text-[10px] font-mono text-slate-400">{cfg.tag}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: cfg.glowColor }}
                      />
                      <span
                        className="w-4 h-4 rounded-full border border-white/20"
                        style={{ backgroundColor: cfg.lineColor }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Shader Sliders */}
          <div className="lg:col-span-8 bg-[#080D15] border border-[#151E2E] rounded-2xl p-5 space-y-5">
            <div className="flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>Live Uniform Parameters</span>
              </span>
              <button
                onClick={() => {
                  setSpeed(0.2);
                  setLayers(8);
                  setScale(2);
                  setGlowIntensity(1.6);
                  setPreset("default");
                }}
                className="text-[10px] font-mono flex items-center gap-1 text-slate-400 hover:text-white"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reset Defaults</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Layers Slider */}
              <div className="space-y-1.5 bg-[#05080E] border border-[#151E2E] p-3 rounded-xl">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">layers</span>
                  <span className="text-cyan-400 font-bold">{layers}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={layers}
                  onChange={(e) => setLayers(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Speed Slider */}
              <div className="space-y-1.5 bg-[#05080E] border border-[#151E2E] p-3 rounded-xl">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">speed</span>
                  <span className="text-cyan-400 font-bold">{speed.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Scale Slider */}
              <div className="space-y-1.5 bg-[#05080E] border border-[#151E2E] p-3 rounded-xl">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">scale</span>
                  <span className="text-cyan-400 font-bold">{scale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={5.0}
                  step={0.1}
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Glow Intensity Slider */}
              <div className="space-y-1.5 bg-[#05080E] border border-[#151E2E] p-3 rounded-xl">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">glowIntensity</span>
                  <span className="text-cyan-400 font-bold">{glowIntensity.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={3.0}
                  step={0.1}
                  value={glowIntensity}
                  onChange={(e) => setGlowIntensity(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
