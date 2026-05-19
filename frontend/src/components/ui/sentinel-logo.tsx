"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SentinelLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export function SentinelLogo({ className, ...props }: SentinelLogoProps) {
  return (
    <svg
      viewBox="0 0 120 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("w-full h-full select-none pointer-events-none", className)}
      {...props}
    >
      {/* 1. Outer Segmented concentric arch (soft light lime green) */}
      <path
        d="M 45,15 A 27,27 0 0,1 75,15"
        stroke="#c5f3b7"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="14 10"
        className="opacity-95"
      />

      {/* 2. Inner Circuit PCB / Gear teeth arch (soft light lime green) */}
      <path
        d="M 33,50 L 33,40 L 41,34 L 50,34 L 55,27 L 65,27 L 70,34 L 79,34 L 87,40 L 87,50"
        stroke="#c5f3b7"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 3. Central Dome / Eye (solid soft green fill) */}
      <path
        d="M 42,50 A 18,18 0 0,1 78,50 Z"
        fill="#a6e387"
      />

      {/* Eye reflection pupil (crisp white highlight) */}
      <circle cx="67" cy="41" r="3.5" fill="#ffffff" />

      {/* 4. Sweeping Base Orbital Swoosh 1 (pointed crescent, vibrant medium green) */}
      <path
        d="M 8,56 C 22,72 98,72 112,56 C 96,65 24,65 8,56 Z"
        fill="#76c84b"
      />

      {/* 5. Sweeping Base Orbital Swoosh 2 (secondary outer thin crescent, vibrant medium green) */}
      <path
        d="M 18,60 C 30,73 90,73 102,60 C 88,68 32,68 18,60 Z"
        fill="#76c84b"
        className="opacity-75"
      />
    </svg>
  );
}
