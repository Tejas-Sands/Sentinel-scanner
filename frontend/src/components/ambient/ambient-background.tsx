"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";

// ------------------------------------------------------------------
// AmbientBackground.tsx — Liquid Noir Living Tissue Layer
// ------------------------------------------------------------------
// A root-level ambient system that gives the interface its "breathing"
// quality. Five composited layers at negative z-indexes create a
// bioluminescent, forensic atmosphere without touching readability.
//
// Layers (back to front):
//   -30  BreathingBorder       Pure CSS breathing viewport frame
//   -25  ScanPulseRipple       Periodic radial sweep from center
//   -20  HashRain              Hex fragments drifting down gutters
//   -15  DepthParticleField    Multi-depth luminous particle rivers
//   -10  NetworkNodeCanvas     Canvas 2D node graph with connections
//    -5  EdgeDataTraces        SVG scanner beams along viewport edges
// ------------------------------------------------------------------

// ═══════════════════════════════════════════════════════════════════
//  SHARED: Global cursor tracker (avoids per-component listeners)
// ═══════════════════════════════════════════════════════════════════

const cursor = { x: 0, y: 0, active: false };

function useGlobalCursor() {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursor.active = true;
    };
    const onLeave = () => {
      cursor.active = false;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 1 — Breathing Viewport Border (-30)
// ═══════════════════════════════════════════════════════════════════

function BreathingBorder() {
  return (
    <div
      className="fixed inset-[1px] pointer-events-none rounded-none"
      aria-hidden="true"
      style={{
        zIndex: 99,
        border: "1px solid rgba(255,255,255,0.06)",
        animation: "breatheBorder 12s ease-in-out infinite",
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 2 — Scan Pulse Ripple (-25)
// ═══════════════════════════════════════════════════════════════════
// A barely-visible radial sweep that periodically ripples outward
// from screen center, like a sonar ping scanning the void.

function ScanPulseRipple() {
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ringRef.current) return;
    const el = ringRef.current;

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 4 });
    tl.fromTo(
      el,
      {
        scale: 0,
        opacity: 0.30,
        borderColor: "rgba(0,229,160,0.40)",
      },
      {
        scale: 3.5,
        opacity: 0,
        borderColor: "rgba(0,229,160,0)",
        duration: 4,
        ease: "power2.out",
      }
    );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={ringRef}
      className="fixed pointer-events-none"
      aria-hidden="true"
      style={{
        zIndex: -25,
        top: "50%",
        left: "50%",
        width: "300px",
        height: "300px",
        marginTop: "-150px",
        marginLeft: "-150px",
        borderRadius: "50%",
        border: "1px solid rgba(0,229,160,0.06)",
        willChange: "transform, opacity",
      }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 3 — Hash Fragment Rain (-20)
// ═══════════════════════════════════════════════════════════════════
// Hex fragments drift down the left/right gutters. Enhanced with
// variable depth blur, occasional "highlight flash" fragments,
// and wider vocabulary including realistic tx-hash shards.

const HASH_POOL = [
  "0x", "ff", "a3", "7b", "2e", "9c", "1d", "4f", "8a", "e2",
  "00", "42", "99", "ce", "d4", "b8", "3f", "16", "ea", "5c",
  "dead", "beef", "cafe", "babe", "face", "fade",
];

interface HashFragment {
  id: number;
  text: string;
  x: number;
  duration: number;
  delay: number;
  isAccent: boolean;
  isFlash: boolean;
  depth: number; // 0-1, controls blur and brightness
}

let hashIdCounter = 0;

function HashRainSide({ side }: { side: "left" | "right" }) {
  const [fragments, setFragments] = useState<HashFragment[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      hashIdCounter++;
      setFragments((prev) => {
        const trimmed = prev.length >= 18 ? prev.slice(prev.length - 17) : prev;
        const depth = Math.random();
        return [
          ...trimmed,
          {
            id: hashIdCounter,
            text: HASH_POOL[Math.floor(Math.random() * HASH_POOL.length)],
            x: 5 + Math.random() * 90,
            duration: 10 + Math.random() * 12,
            delay: Math.random() * 1.0,
            isAccent: Math.random() < 0.12,
            isFlash: Math.random() < 0.03, // rare bright flash
            depth,
          },
        ];
      });
    }, 280 + Math.random() * 120);

    return () => clearInterval(interval);
  }, []);

  const posClass =
    side === "left"
      ? "fixed left-0 top-0 w-[70px] h-full"
      : "fixed right-0 top-0 w-[70px] h-full";

  return (
    <div
      className={`${posClass} overflow-hidden pointer-events-none`}
      aria-hidden="true"
      style={{ zIndex: -20 }}
    >
      <AnimatePresence>
        {fragments.map((f) => (
          <motion.span
            key={f.id}
            initial={{ y: -20, opacity: 0 }}
            animate={{
              y: typeof window !== "undefined" ? window.innerHeight + 30 : 1200,
              opacity: f.isFlash
                ? [0, 0.65, 0.40, 0.20, 0]
                : [0, 0.25, 0.18, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: f.duration,
              ease: "linear",
              delay: f.delay,
            }}
            className="absolute font-mono leading-none select-none font-bold"
            style={{
              left: `${f.x}%`,
              fontSize: `${11 + f.depth * 5}px`,
              filter: `blur(${(1 - f.depth) * 0.6}px)`,
              color: f.isFlash
                ? "rgba(0,229,160,0.65)"
                : f.isAccent
                ? "rgba(0,229,160,0.28)"
                : `rgba(255,255,255,${0.15 + f.depth * 0.15})`,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {f.text}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 4 — Depth Particle Field (-15)
// ═══════════════════════════════════════════════════════════════════
// Multi-depth particle rivers along viewport edges. Particles at
// different "depths" have varying size, blur, speed, and brightness.
// Particles subtly deflect away from the global cursor position.

function DepthParticleField({ side }: { side: "left" | "right" }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const particles: HTMLDivElement[] = [];
    const count = 50;

    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      const depth = Math.random(); // 0=far, 1=near
      const size = 1.6 + depth * 3.4;
      const isAccent = Math.random() < 0.16;

      p.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        will-change: transform, opacity;
        contain: strict;
        filter: blur(${(1 - depth) * 0.7}px);
        background: ${
          isAccent
            ? `rgba(0,229,160,${0.35 + depth * 0.35})`
            : `rgba(255,255,255,${0.20 + depth * 0.20})`
        };
      `;

      container.appendChild(p);
      particles.push(p);

      // Staggered GSAP animations with depth-dependent speed
      const speed = 10 + (1 - depth) * 15; // far = slow, near = faster
      gsap.to(p, {
        y: `random(-60, 60)`,
        x: `random(-40, 40)`,
        opacity: `random(${0.15 + depth * 0.1}, ${0.40 + depth * 0.25})`,
        scale: `random(0.7, 1.3)`,
        duration: speed,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random() * 6,
      });
    }

    // Cursor repulsion field — particles gently deflect from pointer
    let repulsionRaf: number;
    const repulse = () => {
      if (cursor.active && container) {
        const rect = container.getBoundingClientRect();
        particles.forEach((p) => {
          const px = rect.left + parseFloat(p.style.left) * rect.width / 100;
          const py = rect.top + parseFloat(p.style.top) * rect.height / 100;
          const dx = px - cursor.x;
          const dy = py - cursor.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (1 - dist / 120) * 6;
            const angle = Math.atan2(dy, dx);
            gsap.to(p, {
              x: `+=${Math.cos(angle) * force}`,
              y: `+=${Math.sin(angle) * force}`,
              duration: 0.8,
              ease: "power2.out",
              overwrite: false,
            });
          }
        });
      }
      repulsionRaf = requestAnimationFrame(repulse);
    };
    repulsionRaf = requestAnimationFrame(repulse);

    return () => {
      cancelAnimationFrame(repulsionRaf);
      particles.forEach((p) => {
        gsap.killTweensOf(p);
        p.remove();
      });
    };
  }, [side]);

  const posClass =
    side === "left"
      ? "fixed left-[16px] top-0 w-[40px] h-full"
      : "fixed right-[16px] top-0 w-[40px] h-full";

  return (
    <div
      ref={containerRef}
      className={`${posClass} pointer-events-none`}
      aria-hidden="true"
      style={{ zIndex: -15 }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 5 — Network Node Canvas (-10)
// ═══════════════════════════════════════════════════════════════════
// Canvas 2D node graph: faint nodes drift in side gutters and draw
// gradient-opacity connection lines when nearby. Nodes pulse when
// connected. Cursor proximity causes nodes to gently gravitate.

interface CanvasNode {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  phase: number;
  depth: number;
  radius: number;
  connected: boolean;
  pulsePhase: number;
}

function NetworkNodeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = window.innerWidth;
    let h = window.innerHeight;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * devicePixelRatio;
      canvas.height = h * devicePixelRatio;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.scale(devicePixelRatio, devicePixelRatio);
      // Reposition nodes on resize
      nodes.forEach((n) => {
        n.baseX = n.baseX < w / 2 ? Math.random() * 140 : w - Math.random() * 140;
        n.baseY = Math.random() * h;
      });
    };

    // 14 nodes split across left/right gutters
    const nodes: CanvasNode[] = Array.from({ length: 14 }, (_, i) => {
      const isLeft = i < 7;
      const depth = 0.3 + Math.random() * 0.7;
      return {
        x: isLeft ? Math.random() * 140 : w - Math.random() * 140,
        y: Math.random() * h,
        baseX: 0,
        baseY: 0,
        phase: Math.random() * Math.PI * 2,
        depth,
        radius: 1.5 + depth * 2,
        connected: false,
        pulsePhase: 0,
      };
    });
    nodes.forEach((n) => {
      n.baseX = n.x;
      n.baseY = n.y;
    });

    resize();
    window.addEventListener("resize", resize);

    const CONNECTION_DIST = 110;
    const CURSOR_GRAVITY = 180;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, w, h);

      // Update positions with organic drift + cursor gravity
      nodes.forEach((n) => {
        const driftX = Math.sin(time * 0.00025 + n.phase) * (30 + n.depth * 20);
        const driftY = Math.cos(time * 0.0002 + n.phase * 1.3) * (25 + n.depth * 15);
        let targetX = n.baseX + driftX;
        let targetY = n.baseY + driftY;

        // Subtle cursor gravity — nodes lean toward pointer
        if (cursor.active) {
          const dx = cursor.x - targetX;
          const dy = cursor.y - targetY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CURSOR_GRAVITY) {
            const pull = (1 - dist / CURSOR_GRAVITY) * 8;
            targetX += (dx / dist) * pull;
            targetY += (dy / dist) * pull;
          }
        }

        n.x += (targetX - n.x) * 0.02;
        n.y += (targetY - n.y) * 0.02;
        n.connected = false;
      });

      // Draw connections with gradient opacity
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.20;
            nodes[i].connected = true;
            nodes[j].connected = true;

            // Gradient line: brighter at nodes, fading at midpoint
            const grad = ctx.createLinearGradient(
              nodes[i].x, nodes[i].y,
              nodes[j].x, nodes[j].y
            );
            grad.addColorStop(0, `rgba(255,255,255,${opacity * 1.5})`);
            grad.addColorStop(0.5, `rgba(0,229,160,${opacity * 0.5})`);
            grad.addColorStop(1, `rgba(255,255,255,${opacity * 1.5})`);

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // Draw nodes with pulse when connected
      nodes.forEach((n) => {
        if (n.connected) {
          n.pulsePhase += 0.03;
        } else {
          n.pulsePhase *= 0.95; // decay
        }
        const pulse = 1 + Math.sin(n.pulsePhase) * 0.3;
        const r = n.radius * pulse;

        // Outer glow
        if (n.connected) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,229,160,${0.08 * pulse})`;
          ctx.fill();
        }

        // Core dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.connected
          ? `rgba(0,229,160,${0.30 + n.depth * 0.25})`
          : `rgba(255,255,255,${0.15 + n.depth * 0.15})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: -10 }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
//  LAYER 6 — Edge Data Traces (-5)
// ═══════════════════════════════════════════════════════════════════
// Thin luminous lines that travel along screen edges like scanner
// beams, occasionally branching inward with fade. Enhanced with
// variable thickness, accent coloring, and branch glow halos.

function EdgeDataTraces() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    let active = true;
    let traceCount = 0;
    const MAX_CONCURRENT = 4;

    const spawnTrace = () => {
      if (!active || !svg || traceCount >= MAX_CONCURRENT) return;
      traceCount++;

      const w = window.innerWidth;
      const h = window.innerHeight;
      const isAccent = Math.random() < 0.25;
      const thickness = 0.5 + Math.random() * 1;

      // Create a group for the trace + optional branch
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      svg.appendChild(g);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      const color = isAccent ? "rgba(0,229,160,0.30)" : "rgba(255,255,255,0.18)";
      line.setAttribute("stroke", color);
      line.setAttribute("stroke-width", String(thickness));
      line.setAttribute("stroke-linecap", "round");
      g.appendChild(line);

      // Pick random edge origin
      const edge = Math.floor(Math.random() * 4);
      let x1 = 0, y1 = 0, x2 = 0, y2 = 0;

      if (edge === 0) {
        x1 = Math.random() * w; y1 = 0;
        x2 = x1 + (Math.random() * 80 - 40); y2 = 40 + Math.random() * 40;
      } else if (edge === 1) {
        x1 = w; y1 = Math.random() * h;
        x2 = w - 40 - Math.random() * 40; y2 = y1 + (Math.random() * 80 - 40);
      } else if (edge === 2) {
        x1 = Math.random() * w; y1 = h;
        x2 = x1 + (Math.random() * 80 - 40); y2 = h - 40 - Math.random() * 40;
      } else {
        x1 = 0; y1 = Math.random() * h;
        x2 = 40 + Math.random() * 40; y2 = y1 + (Math.random() * 80 - 40);
      }

      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x1));
      line.setAttribute("y2", String(y1));

      // Optional inward branch (20% chance)
      let branch: SVGLineElement | null = null;
      if (Math.random() < 0.2) {
        branch = document.createElementNS("http://www.w3.org/2000/svg", "line");
        branch.setAttribute("stroke", isAccent ? "rgba(0,229,160,0.20)" : "rgba(255,255,255,0.12)");
        branch.setAttribute("stroke-width", "0.5");
        branch.setAttribute("stroke-linecap", "round");
        branch.setAttribute("stroke-dasharray", "3 4");
        g.appendChild(branch);
      }

      const tl = gsap.timeline({
        onComplete: () => {
          g.remove();
          traceCount--;
        },
      });

      tl.to(line, {
        attr: { x2: String(x2), y2: String(y2) },
        opacity: isAccent ? 0.35 : 0.25,
        duration: 1.2 + Math.random() * 1,
        ease: "power2.out",
      });

      if (branch) {
        const bx = x2 + (Math.random() * 60 - 30);
        const by = y2 + (Math.random() * 60 - 30);
        branch.setAttribute("x1", String(x2));
        branch.setAttribute("y1", String(y2));
        branch.setAttribute("x2", String(x2));
        branch.setAttribute("y2", String(y2));

        tl.to(
          branch,
          {
            attr: { x2: String(bx), y2: String(by) },
            opacity: 0.20,
            duration: 0.8,
            ease: "power1.out",
          },
          "-=0.3"
        );
        tl.to(branch, { opacity: 0, duration: 0.6, ease: "power2.in" }, "+=0.2");
      }

      tl.to(g, { opacity: 0, duration: 1, ease: "power2.in" }, "-=0.4");
    };

    const interval = setInterval(() => {
      spawnTrace();
    }, 1200 + Math.random() * 1800);

    // Initial spawn
    setTimeout(spawnTrace, 1000);

    return () => {
      active = false;
      clearInterval(interval);
      if (svg) svg.innerHTML = "";
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: -5 }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MASTER COMPOSITOR
// ═══════════════════════════════════════════════════════════════════

export default function AmbientBackground() {
  const [reducedMotion, setReducedMotion] = useState(false);

  // Register the global cursor tracker
  useGlobalCursor();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Render ambient layers under all motion profiles to ensure maximum styling impact
  // if (reducedMotion) return null;

  return (
    <>
      <BreathingBorder />
      <ScanPulseRipple />
      <HashRainSide side="left" />
      <HashRainSide side="right" />
      <DepthParticleField side="left" />
      <DepthParticleField side="right" />
      <NetworkNodeCanvas />
      <EdgeDataTraces />
    </>
  );
}
