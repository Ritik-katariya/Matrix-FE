"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function OrbitalSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpeakingRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const toggleSpeak = useCallback(() => {
    isSpeakingRef.current = !isSpeakingRef.current;
    setIsSpeaking(isSpeakingRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 500,
      H = 500;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    const cx = W / 2,
      cy = H / 2,
      R = 148;
    let t = 0;
    let sI = 0,
      sN = 0;
    let animId: number;

    function drawOrbitalArcs() {
      if (!ctx) return;
      const arcCount = 9;
      for (let i = 0; i < arcCount; i++) {
        const phase = (i / arcCount) * Math.PI * 2;
        const speed = 0.004 + (i % 3) * 0.002;
        const tiltBase =
          Math.sin(t * 0.006 + i * 1.1) * 0.55 +
          Math.cos(t * 0.004 + i * 0.7) * 0.25;
        const tiltX = Math.sin(phase + t * speed) * 0.9 + tiltBase;
        const tiltY = Math.cos(phase + t * speed * 0.7) * 0.4;
        const arcR = R * (0.92 + Math.sin(t * 0.011 + i * 0.8) * 0.06);
        const speakMorph =
          sI * sN * (5 + i * 1.5) * Math.sin(t * 0.18 + i * 0.6);
        const segs = 80;
        const alpha =
          0.07 + Math.abs(Math.sin(t * 0.02 + i * 0.9)) * 0.14 + sI * 0.1;
        const lw = 0.5 + Math.abs(tiltBase) * 0.5 + sI * Math.abs(sN) * 1.2;
        ctx.beginPath();
        for (let s = 0; s <= segs; s++) {
          const a = (s / segs) * Math.PI * 2;
          const ex = Math.cos(a) * arcR;
          const ey = Math.sin(a) * arcR;
          const tx2 = ex * Math.cos(tiltX) - ey * Math.sin(tiltX) * 0.3;
          const ty2 =
            ex * Math.sin(tiltX) * tiltY +
            ey * Math.cos(tiltX) * (0.18 + Math.abs(tiltBase) * 0.2);
          const px = cx + tx2 + speakMorph * Math.sin(a * 2);
          const py = cy + ty2 + speakMorph * Math.cos(a * 3) * 0.5;
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        const g = ctx.createConicGradient(t * speed * 2 + i, cx, cy);
        g.addColorStop(0, `rgba(200,230,255,${alpha * 0.9})`);
        g.addColorStop(0.12, `rgba(100,180,255,${alpha})`);
        g.addColorStop(0.35, `rgba(30,100,220,${alpha * 0.3})`);
        g.addColorStop(0.6, `rgba(10,50,180,${alpha * 0.15})`);
        g.addColorStop(0.82, `rgba(100,180,255,${alpha * 0.6})`);
        g.addColorStop(1, `rgba(200,230,255,${alpha * 0.9})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = lw;
        ctx.stroke();
      }
    }

    function drawLatitudeRings() {
      if (!ctx) return;
      const bands = [0, 0.28, -0.28, 0.52, -0.52, 0.75, -0.75];
      for (let b = 0; b < bands.length; b++) {
        const lat = bands[b];
        const cosLat = Math.cos(lat * Math.PI);
        const sinLat = Math.sin(lat * Math.PI);
        const bandR =
          R * cosLat * (0.96 + Math.sin(t * 0.014 + b * 1.2) * 0.03);
        const yOff = R * sinLat * (0.95 + Math.sin(t * 0.009 + b) * 0.03);
        const speakBend = sI * sN * (3 + b) * 0.6;
        const finalY = cy + yOff + speakBend;
        const finalRx = bandR + Math.abs(speakBend) * 0.2;
        const ry = Math.max(1, bandR * 0.055 + 0.5 + sI * Math.abs(sN) * 2);
        const depth = cosLat;
        const alpha = (b === 0 ? 0.45 : 0.1 + depth * 0.22) + sI * 0.08;
        const g = ctx.createConicGradient(t * 0.009 + b * 0.8, cx, finalY);
        g.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
        g.addColorStop(0.22, `rgba(120,190,255,${alpha * 0.75})`);
        g.addColorStop(0.5, `rgba(20,70,200,${alpha * 0.2})`);
        g.addColorStop(0.78, `rgba(120,190,255,${alpha * 0.75})`);
        g.addColorStop(1, `rgba(255,255,255,${alpha * 0.9})`);
        ctx.strokeStyle = g;
        ctx.lineWidth =
          b === 0 ? 1.4 + sI * Math.abs(sN) * 2 : 0.7 + sI * Math.abs(sN) * 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, finalY, Math.max(1, finalRx), ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    function drawEnergyNodes() {
      if (!ctx) return;
      const nodes = [
        { a: 0.7, r: 0.88, sp: 0.011, la: 0.15, ls: 0.007, size: 3.5 },
        { a: 2.1, r: 0.92, sp: -0.008, la: -0.22, ls: 0.005, size: 2.8 },
        { a: 3.8, r: 0.85, sp: 0.013, la: 0.35, ls: -0.009, size: 3.0 },
        { a: 5.1, r: 0.94, sp: -0.01, la: -0.1, ls: 0.006, size: 2.5 },
        { a: 1.3, r: 0.9, sp: 0.007, la: 0.42, ls: -0.008, size: 2.2 },
        { a: 4.4, r: 0.87, sp: -0.012, la: -0.38, ls: 0.01, size: 2.0 },
      ];
      for (const n of nodes) {
        const angle = n.a + t * n.sp;
        const lat = n.la + Math.sin(t * n.ls + n.a) * 0.18;
        const r = R * n.r * (1 + Math.sin(t * 0.019 + n.a) * 0.04);
        const cosLat = Math.cos(lat * Math.PI * 0.8);
        const sinLat = Math.sin(lat * Math.PI * 0.8);
        const x = cx + Math.cos(angle) * r * cosLat;
        const y = cy + sinLat * R * 0.85 + Math.sin(angle) * r * 0.06;
        const speakX = sI * sN * 4 * Math.sin(angle * 2);
        const speakY = sI * sN * 3 * Math.cos(angle * 1.5);
        const nx = x + speakX,
          ny = y + speakY;
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.08 + n.a * 3.7);
        const glowR = (n.size * 2.5 + pulse * n.size) * (1 + sI * 0.6);
        const alpha = 0.5 + pulse * 0.5;
        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, glowR * 2.5);
        g.addColorStop(0, `rgba(255,255,255,${alpha})`);
        g.addColorStop(0.25, `rgba(180,225,255,${alpha * 0.7})`);
        g.addColorStop(0.6, `rgba(60,140,255,${alpha * 0.2})`);
        g.addColorStop(1, "rgba(20,60,200,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(nx, ny, glowR * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.95})`;
        ctx.beginPath();
        ctx.arc(nx, ny, n.size * (1 + sI * 0.4), 0, Math.PI * 2);
        ctx.fill();
        if (sI > 0.05) {
          for (let rp = 0; rp < 2; rp++) {
            const rph = (t * 0.03 + rp * 0.5 + n.a) % 1;
            const rr = rph * 20 * sI;
            const ra = (1 - rph) * 0.4 * sI;
            ctx.strokeStyle = `rgba(120,200,255,${ra})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.arc(nx, ny, rr, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
    }

    function drawGlow() {
      if (!ctx) return;
      const breathe =
        1 + Math.sin(t * 0.017) * 0.015 + sI * Math.abs(sN) * 0.025;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.55);
      cg.addColorStop(0, `rgba(30,70,200,${0.025 + sI * 0.05})`);
      cg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.55, 0, Math.PI * 2);
      ctx.fill();
      const og = ctx.createRadialGradient(
        cx,
        cy,
        R * 0.88 * breathe,
        cx,
        cy,
        R * 1.18 * breathe,
      );
      og.addColorStop(0, `rgba(40,100,255,${0.04 + sI * 0.06})`);
      og.addColorStop(0.5, `rgba(20,60,200,${0.02 + sI * 0.03})`);
      og.addColorStop(1, "rgba(0,0,60,0)");
      ctx.fillStyle = og;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.18 * breathe, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawSpeakEffect() {
      if (!ctx) return;
      if (sI < 0.02) return;
      const vibe = sI * Math.abs(sN);
      for (let r = 0; r < 3; r++) {
        const rp = (t * 0.021 + r / 3) % 1;
        const rr = R + rp * 60 * sI;
        const ra = (1 - rp) * 0.18 * sI;
        ctx.strokeStyle = `rgba(80,160,255,${ra})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
      const wPts = 72;
      ctx.beginPath();
      for (let w = 0; w <= wPts; w++) {
        const angle = (w / wPts) * Math.PI * 2;
        const amp =
          sI *
          (12 +
            Math.sin(t * 0.28 + w * 0.6) * 5 +
            Math.sin(t * 0.51 + w * 1.1) * 4 +
            Math.sin(t * 0.33 + w * 2) * 3);
        const wr = R + 25 + amp;
        const x = cx + Math.cos(angle) * wr;
        const y = cy + Math.sin(angle) * wr;
        w === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(140,205,255,${0.25 * sI})`;
      ctx.lineWidth = 1.5 + vibe * 2;
      ctx.stroke();
    }

    function drawFrame() {
      t++;
      if (isSpeakingRef.current) {
        sI += (1 - sI) * 0.06;
        sN =
          Math.sin(t * 5.9) * 0.38 +
          Math.sin(t * 11.7) * 0.27 +
          Math.sin(t * 3.3) * 0.35;
      } else {
        sI += (0 - sI) * 0.04;
        sN = Math.sin(t * 0.03) * 0.1;
      }
      ctx!.clearRect(0, 0, W, H);
      drawGlow();
      drawOrbitalArcs();
      drawLatitudeRings();
      drawSpeakEffect();
      drawEnergyNodes();
      animId = requestAnimationFrame(drawFrame);
    }

    drawFrame();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div>
      <canvas
        ref={canvasRef}
        id="c"
        style={{
          display: "block",
          background: "transparent",
          borderRadius: "12px",
        }}
      />
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
          marginTop: "14px",
        }}
      >
        <button
          onClick={toggleSpeak}
          style={{
            padding: "8px 28px",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          {isSpeaking ? "Stop" : "Speak"}
        </button>
      </div>
    </div>
  );
}
