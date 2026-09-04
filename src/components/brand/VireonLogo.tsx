"use client";

import React, { useId } from "react";

export interface VireonLogoProps {
  /**
   * Layout variant:
   * - "full": V mark + VIREON wordmark + tagline
   * - "mark": V symbol only
   * - "wordmark": VIREON text with distinctive segmented O only
   */
  variant?: "full" | "mark" | "wordmark";
  /**
   * Predefined scale presets
   */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  /**
   * Orientation for the full variant:
   * - "horizontal": V mark on the left, wordmark and tagline on the right (default for nav/sidebar)
   * - "vertical": V mark centered above wordmark and tagline (ideal for hero, auth, splash)
   */
  layout?: "horizontal" | "vertical";
  /**
   * Whether to display the official tagline "REVENUE INTELLIGENCE INFRASTRUCTURE"
   * Defaults to true in "full" variant, false otherwise.
   */
  showTagline?: boolean;
  /**
   * Whether to include the glowing light beam accent below the tagline (from the reference)
   */
  showBeam?: boolean;
  /**
   * Add subtle interactive hover glow and gradient shimmer
   */
  animated?: boolean;
  /**
   * Optional custom container CSS classes
   */
  className?: string;
  /**
   * Optional custom CSS classes for the V mark
   */
  markClassName?: string;
  /**
   * Optional custom CSS classes for the wordmark
   */
  wordmarkClassName?: string;
  /**
   * Accessible label
   */
  ariaLabel?: string;
  /**
   * Click handler
   */
  onClick?: () => void;
}

/**
 * High-Precision Vector V Mark
 * Recreates the 3D folded ribbon geometry from the reference brand identity.
 */
export function VireonMark({
  size = "md",
  className = "",
  animated = true,
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
  animated?: boolean;
}) {
  const uid = useId().replace(/:/g, "_");

  // Size mapping for the mark box (px)
  const sizeMap = {
    xs: 20,
    sm: 26,
    md: 34,
    lg: 48,
    xl: 68,
    hero: 120,
  };

  const px = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 transition-transform duration-300 ${
        animated ? "group-hover:scale-[1.03]" : ""
      } ${className}`}
      style={{ width: px, height: px }}
    >
      {/* Ambient Radial Bloom (Refined & Controlled) */}
      <div
        className="absolute inset-[-20%] rounded-full pointer-events-none transition-opacity duration-500 opacity-60 group-hover:opacity-90"
        style={{
          background: `radial-gradient(circle at 50% 55%, rgba(34, 211, 238, 0.28) 0%, rgba(59, 130, 246, 0.16) 45%, rgba(139, 92, 246, 0.08) 70%, transparent 85%)`,
          filter: "blur(6px)",
        }}
      />

      <svg
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Left Wing Primary Gradient (Cyan -> Electric Blue) */}
          <linearGradient id={`${uid}_leftGrad`} x1="45" y1="36" x2="140" y2="214" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F2FE" />
            <stop offset="28%" stopColor="#22D3EE" />
            <stop offset="65%" stopColor="#0284C7" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>

          {/* Left Wing Inner Highlight (Soft translucent specular sheen) */}
          <linearGradient id={`${uid}_leftHighlight`} x1="50" y1="40" x2="110" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="25%" stopColor="#67E8F9" stopOpacity="0.5" />
            <stop offset="70%" stopColor="#06B6D4" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0891B2" stopOpacity="0" />
          </linearGradient>

          {/* Right Wing Outer Facet (Electric Blue -> Royal Violet -> Bright Indigo) */}
          <linearGradient id={`${uid}_rightGrad`} x1="120" y1="180" x2="216" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="35%" stopColor="#2563EB" />
            <stop offset="70%" stopColor="#6366F1" />
            <stop offset="92%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>

          {/* Right Wing Fold / Back Underfold (Translucent Deep Iris Shadow) */}
          <linearGradient id={`${uid}_foldGrad`} x1="125" y1="70" x2="185" y2="135" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#1E3A8A" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#312E81" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#4C1D95" stopOpacity="0.75" />
          </linearGradient>

          {/* Apex Glow (Intense Neon Rim at the bottom rounded apex) */}
          <linearGradient id={`${uid}_apexGlow`} x1="100" y1="180" x2="156" y2="214" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="50%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Top Right Specular Highlight */}
          <linearGradient id={`${uid}_specularRight`} x1="168" y1="44" x2="214" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C4B5FD" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
          </linearGradient>

          {/* Soft Filter Glow */}
          <filter id={`${uid}_glowFilter`} x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. Base Layer: Apex Neon Glow Path (Behind) */}
        <path
          d="M 104 186 C 114 204, 122 214, 128 214 C 134 214, 142 204, 152 186"
          stroke={`url(#${uid}_apexGlow)`}
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.65"
          filter={`url(#${uid}_glowFilter)`}
        />

        {/* 2. Right Wing - Inner Translucent Fold / Ribbon Back */}
        <path
          d="M 128 116 L 168 44 L 198 44 C 182 78, 160 114, 142 144 C 135 132, 130 122, 128 116 Z"
          fill={`url(#${uid}_foldGrad)`}
        />

        {/* 3. Right Wing - Outer Main Blade */}
        <path
          d="M 214 44 L 172 44 C 154 84, 136 130, 128 168 C 132 178, 138 188, 144 196 C 158 174, 184 122, 214 44 Z"
          fill={`url(#${uid}_rightGrad)`}
        />

        {/* 4. Left Wing - Main Sweeping Front Ribbon Blade */}
        <path
          d="M 44 44 L 86 44 C 94 76, 108 118, 128 156 C 132 164, 136 174, 134 186 C 132 198, 124 206, 114 204 C 104 202, 96 190, 88 174 C 74 144, 58 98, 44 44 Z"
          fill={`url(#${uid}_leftGrad)`}
        />

        {/* 5. Center Bottom Nexus Loop (Smooth Fold Overlap) */}
        <path
          d="M 114 204 C 122 206, 130 206, 136 198 C 142 190, 146 178, 142 164 C 138 150, 130 138, 126 126 C 122 138, 118 154, 114 172 C 112 182, 110 196, 114 204 Z"
          fill="url(#vireon-apex-loop)"
          fillOpacity="0.95"
        />

        {/* 6. Left Wing Specular Edge Highlight (Crisp Precision) */}
        <path
          d="M 46 45 L 84 45 C 92 74, 105 114, 123 150"
          stroke={`url(#${uid}_leftHighlight)`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 7. Right Wing Top Bevel Highlight */}
        <path
          d="M 174 44 L 213 44"
          stroke={`url(#${uid}_specularRight)`}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* 8. Bottom Apex Neon Rim Line */}
        <path
          d="M 108 198 C 116 208, 124 212, 128 212 C 132 212, 140 208, 148 198"
          stroke="#38BDF8"
          strokeWidth="3"
          strokeLinecap="round"
          className={animated ? "animate-pulse" : ""}
        />

        <defs>
          <linearGradient id="vireon-apex-loop" x1="114" y1="140" x2="142" y2="204" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" />
            <stop offset="50%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * High-Precision Vector VIREON Wordmark
 * Displays 'VIREON' with the signature segmented/cyclotron 'O' from the reference.
 */
export function VireonWordmark({
  size = "md",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
}) {
  const uid = useId().replace(/:/g, "_");

  // Font/height scaling
  const heightMap = {
    xs: 12,
    sm: 15,
    md: 18,
    lg: 24,
    xl: 32,
    hero: 44,
  };

  const h = heightMap[size] || heightMap.md;
  // Aspect ratio of the VIREON wordmark SVG is ~6.1:1 (220 x 36)
  const w = Math.round(h * 6.1);

  return (
    <div
      className={`inline-flex items-center shrink-0 select-none ${className}`}
      style={{ height: h, width: w }}
    >
      <svg
        viewBox="0 0 220 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Signature Cyan/Blue Arc Gradient for the Letter 'O' */}
          <linearGradient id={`${uid}_oGrad`} x1="140" y1="3" x2="160" y2="33" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#00F2FE" />
            <stop offset="50%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Subtle Glow for the 'O' Segment */}
          <filter id={`${uid}_oGlow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* V */}
        <path
          d="M 1 2 L 14.5 34 L 20 34 L 33.5 2 L 26.5 2 L 17.2 25.5 L 8 2 Z"
          fill="#FFFFFF"
        />

        {/* I */}
        <path
          d="M 43 2 L 49.5 2 L 49.5 34 L 43 34 Z"
          fill="#FFFFFF"
        />

        {/* R */}
        <path
          d="M 59 2 L 77.5 2 C 84.5 2, 89.5 6.2, 89.5 13 C 89.5 18.2, 86 21.8, 80 22.8 L 90.5 34 L 82.5 34 L 73 23.5 L 65.5 23.5 L 65.5 34 L 59 34 Z M 65.5 7.8 L 65.5 18 L 76.5 18 C 80 18, 82.8 16, 82.8 13 C 82.8 9.8, 80 7.8, 76.5 7.8 Z"
          fill="#FFFFFF"
        />

        {/* E */}
        <path
          d="M 100 2 L 123.5 2 L 123.5 7.8 L 106.5 7.8 L 106.5 15.2 L 121 15.2 L 121 20.8 L 106.5 20.8 L 106.5 28.2 L 124 28.2 L 124 34 L 100 34 Z"
          fill="#FFFFFF"
        />

        {/* ========================================================
            O — THE DISTINCTIVE SEGMENTED CYCLOTRON TREATMENT
            Center: (152, 18), Outer R=16, Inner R=9.5, Thickness=6.5
            - Left/Top-left segment: Radiant Cyan (#22D3EE / #00F2FE)
            - Right/Bottom segment: Crisp White (#FFFFFF)
            - Precision breaks/notches at ~70° and ~245°
           ======================================================== */}
        <g>
          {/* Segment 1: Cyan Arc (Left & Top-Left Aperture) */}
          <path
            d="M 146.5 3.2 C 141.2 4.8, 137.5 9.8, 136.5 15.4 C 135.5 21, 137.8 26.8, 142.2 30.2 L 145.8 25 C 143.2 22.8, 142 19.4, 142.5 16 C 143 12.6, 145.2 9.6, 148.4 8.6 Z"
            fill={`url(#${uid}_oGrad)`}
            filter={`url(#${uid}_oGlow)`}
          />

          {/* Segment 2: Crisp White Arc (Right & Bottom Aperture) */}
          <path
            d="M 153.5 2.2 C 160.2 2.6, 166 7.4, 167.5 14 C 169 20.5, 165.8 27.2, 160 30.5 C 156.5 32.5, 152 33.2, 147.5 32.2 L 149 26.5 C 152 27.2, 155.2 26.8, 157.8 25.2 C 161.8 22.8, 163.8 18, 162.8 13.5 C 161.8 9, 157.8 5.6, 153 5.5 Z"
            fill="#FFFFFF"
          />
        </g>

        {/* N */}
        <path
          d="M 180 2 L 186.8 2 L 204.5 26.8 L 204.5 2 L 211 2 L 211 34 L 204.2 34 L 186.5 9.2 L 186.5 34 L 180 34 Z"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
}

/**
 * Official Brand Tagline
 * REVENUE INTELLIGENCE INFRASTRUCTURE
 */
export function VireonTagline({
  size = "md",
  className = "",
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "hero";
  className?: string;
}) {
  const textClassMap = {
    xs: "text-[6.5px] tracking-[0.24em]",
    sm: "text-[7.5px] tracking-[0.28em]",
    md: "text-[9px] tracking-[0.32em]",
    lg: "text-[11px] tracking-[0.36em]",
    xl: "text-[13px] tracking-[0.4em]",
    hero: "text-[15px] sm:text-[18px] tracking-[0.42em]",
  };

  return (
    <span
      className={`font-mono font-medium text-slate-400 uppercase select-none ${
        textClassMap[size] || textClassMap.md
      } ${className}`}
    >
      Revenue Intelligence Infrastructure
    </span>
  );
}

/**
 * Master VIREON Logo Component
 * Primary brand emblem across the VIREON ecosystem.
 */
export function VireonLogo({
  variant = "full",
  size = "md",
  layout = "horizontal",
  showTagline,
  showBeam = false,
  animated = true,
  className = "",
  markClassName = "",
  wordmarkClassName = "",
  ariaLabel = "VIREON — Revenue Intelligence Infrastructure",
  onClick,
}: VireonLogoProps) {
  const shouldShowTagline = showTagline !== undefined ? showTagline : variant === "full";

  // Mark-only variant
  if (variant === "mark") {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        onClick={onClick}
        className={`inline-flex items-center justify-center ${onClick ? "cursor-pointer" : ""} ${className}`}
      >
        <VireonMark size={size} className={markClassName} animated={animated} />
      </div>
    );
  }

  // Wordmark-only variant
  if (variant === "wordmark") {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        onClick={onClick}
        className={`inline-flex items-center ${onClick ? "cursor-pointer" : ""} ${className}`}
      >
        <VireonWordmark size={size} className={wordmarkClassName} />
      </div>
    );
  }

  // Vertical layout (Hero / Auth / Splash)
  if (layout === "vertical") {
    return (
      <div
        role="img"
        aria-label={ariaLabel}
        onClick={onClick}
        className={`group flex flex-col items-center text-center ${onClick ? "cursor-pointer" : ""} ${className}`}
      >
        {/* Central 3D V Mark */}
        <VireonMark size={size} className={`mb-3 sm:mb-4 ${markClassName}`} animated={animated} />

        {/* Wordmark VIREON */}
        <VireonWordmark size={size} className={wordmarkClassName} />

        {/* Tagline */}
        {shouldShowTagline && (
          <VireonTagline size={size} className="mt-2.5 sm:mt-3 text-center" />
        )}

        {/* Glowing Horizontal Beam Accent from Reference */}
        {showBeam && (
          <div className="mt-3 sm:mt-4 w-24 sm:w-32 h-[2px] rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22D3EE] opacity-80" />
        )}
      </div>
    );
  }

  // Horizontal layout (Sidebar / Navbar / Header) - Default
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      onClick={onClick}
      className={`group flex items-center gap-2.5 sm:gap-3 ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      <VireonMark size={size} className={markClassName} animated={animated} />

      <div className="flex flex-col justify-center min-w-0">
        <VireonWordmark size={size} className={wordmarkClassName} />

        {shouldShowTagline && (
          <div className="overflow-hidden whitespace-nowrap mt-1">
            <VireonTagline size={size === "hero" ? "md" : "xs"} className="leading-none block truncate" />
          </div>
        )}
      </div>
    </div>
  );
}

export default VireonLogo;
