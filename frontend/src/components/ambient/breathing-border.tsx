"use client";

import React from "react";

export default function BreathingBorder() {
  return (
    <div
      className="fixed inset-[1px] pointer-events-none rounded-none"
      aria-hidden="true"
      style={{
        zIndex: 5,
        border: "1px solid var(--border-rest)",
        animation: "breatheBorder var(--border-animation-duration, 4s) ease-in-out infinite",
      }}
    />
  );
}
