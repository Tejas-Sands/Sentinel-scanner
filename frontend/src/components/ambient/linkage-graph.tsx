"use client";

import { useEffect, useRef } from "react";

// ------------------------------------------------------------------
// LinkageGraph — Highly Interactive Forensic Constellation Graph
// ------------------------------------------------------------------
// A premium, fully responsive, real-time node-linkage network.
// Features:
//   - 65 nodes randomly generated in red/green (risk colors) on refresh.
//   - High-density node linkages (translucent connecting edges).
//   - Interactive gravity: cursor attracts nearby nodes magnetically.
//   - Interactive linkage: cursor draws glowing mint-accent lines to nodes.
//   - Breathe cycles: the entire constellation rhythmically pulses.
//   - Pure HTML5 Canvas 2D, zero dependencies, optimized rAF loop.
// ------------------------------------------------------------------

interface Node {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number; // velocity for smooth physics response
  vy: number;
  r: number;
  color: string;
  phase: number;
  driftSpeed: number;
  driftRadius: number;
}

const NODE_COUNT = 65;
const LINK_DISTANCE = 220;
const NODE_MIN_RADIUS = 2;
const NODE_MAX_RADIUS = 4.5;
const MOUSE_REACTION_RADIUS = 220;

function createNodes(w: number, h: number): Node[] {
  const nodes: Node[] = [];
  for (let i = 0; i < NODE_COUNT; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    nodes.push({
      x,
      y,
      baseX: x,
      baseY: y,
      vx: 0,
      vy: 0,
      r: NODE_MIN_RADIUS + Math.random() * (NODE_MAX_RADIUS - NODE_MIN_RADIUS),
      color: Math.random() > 0.45 ? "#ef4444" : "#22c55e",
      phase: Math.random() * Math.PI * 2,
      driftSpeed: 0.0003 + Math.random() * 0.0006,
      driftRadius: 10 + Math.random() * 25,
    });
  }
  return nodes;
}

export default function LinkageGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let nodes: Node[] = [];

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes = createNodes(window.innerWidth, window.innerHeight);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = (time: number) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      // Global breathing cycle (slow, smooth sine wave)
      const breathe = 0.75 + 0.25 * Math.sin(time * 0.0007);
      const mouse = mouseRef.current;

      // 1. Physics & Drifting Updates
      for (const node of nodes) {
        // Natural trigonometric drift
        const t = time * node.driftSpeed + node.phase;
        const targetX = node.baseX + Math.sin(t) * node.driftRadius;
        const targetY = node.baseY + Math.cos(t * 0.8) * node.driftRadius;

        // Interaction forces (Attraction / Pull gravity)
        if (mouse.active) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_REACTION_RADIUS) {
            // Stronger pull when closer
            const force = (MOUSE_REACTION_RADIUS - dist) / MOUSE_REACTION_RADIUS;
            node.vx += (dx / dist) * force * 0.4;
            node.vy += (dy / dist) * force * 0.4;
          }
        }

        // Apply velocities with damping (friction)
        node.vx *= 0.92;
        node.vy *= 0.92;

        // Combine drift + physics velocity
        node.x = targetX + node.vx;
        node.y = targetY + node.vy;
      }

      // 2. Draw Translucent Linking Edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < LINK_DISTANCE) {
            const alpha = (1 - dist / LINK_DISTANCE) * 0.12 * breathe;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);

            // Red-to-Red connections get a warm tint, others get clean white/accent
            if (nodes[i].color === "#ef4444" && nodes[j].color === "#ef4444") {
              ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 1.5})`;
            } else {
              ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            }
            
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // 3. Draw Mouse Cursor Node & Active Links
      if (mouse.active) {
        for (const node of nodes) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MOUSE_REACTION_RADIUS) {
            const alpha = (1 - dist / MOUSE_REACTION_RADIUS) * 0.18 * breathe;
            
            ctx.beginPath();
            ctx.moveTo(mouse.x, mouse.y);
            ctx.lineTo(node.x, node.y);
            // Interactive glow connections draw in Mint Green accent
            ctx.strokeStyle = `rgba(0, 229, 160, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // 4. Draw Individual Constellation Nodes
      for (const node of nodes) {
        const nodeBreath = 0.75 + 0.25 * Math.sin(time * 0.0012 + node.phase);
        const r = node.r * nodeBreath;
        const alpha = 0.35 + 0.45 * breathe;

        // Outer Bioluminescent Glow Ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = node.color === "#ef4444"
          ? `rgba(239, 68, 68, ${alpha * 0.08})`
          : `rgba(34, 197, 94, ${alpha * 0.08})`;
        ctx.fill();

        // Core Solid Dot
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.color === "#ef4444"
          ? `rgba(239, 68, 68, ${alpha})`
          : `rgba(34, 197, 94, ${alpha})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
      style={{ zIndex: 3 }}
    />
  );
}
