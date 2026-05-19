"use client";

import React, { useEffect, useState } from "react";

export default function Spotlight() {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setPosition({ x, y });
      setOpacity(1);
    };

    const handleLeave = () => {
      setOpacity(0);
    };

    window.addEventListener("pointermove", handleMove, { passive: true });
    document.addEventListener("pointerleave", handleLeave);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerleave", handleLeave);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none transition-opacity duration-700 ease-out"
      style={{
        zIndex: 0,
        opacity,
        background: `radial-gradient(600px circle at ${position.x}% ${position.y}%, rgba(0, 229, 160, 0.07), transparent 40%)`,
      }}
    />
  );
}
