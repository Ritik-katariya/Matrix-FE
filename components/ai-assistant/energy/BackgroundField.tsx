'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface BackgroundFieldProps {
  amplitude: number;
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export function BackgroundField({ amplitude, state }: BackgroundFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Ripple effect using canvas for smooth wave distortion
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (!rect) return;

    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);

    let animationId: number;
    let time = 0;

    const animate = () => {
      // Clear canvas
      ctx.fillStyle = 'rgba(15, 23, 42, 0)';
      ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

      // Draw radial gradient background
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300);
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.1)');
      gradient.addColorStop(0.5, 'rgba(6, 182, 212, 0.05)');
      gradient.addColorStop(1, 'rgba(6, 182, 212, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width / window.devicePixelRatio, canvas.height / window.devicePixelRatio);

      // Draw ripple waves when speaking
      if (state === 'speaking' && amplitude > 0.1) {
        const rippleCount = 3;
        const maxRadius = 150;

        for (let i = 0; i < rippleCount; i++) {
          const delay = (i / rippleCount) * Math.PI;
          const waveTime = (time + delay) % (2 * Math.PI);
          const radius = (waveTime / (2 * Math.PI)) * maxRadius;

          ctx.strokeStyle = `rgba(6, 182, 212, ${(1 - waveTime / (2 * Math.PI)) * amplitude * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      ctx.lineWidth = 0.5;

      // Vertical lines
      for (let x = 0; x < canvas.width / window.devicePixelRatio; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height / window.devicePixelRatio);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y < canvas.height / window.devicePixelRatio; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width / window.devicePixelRatio, y);
        ctx.stroke();
      }

      time += (amplitude * 0.05 + 0.01);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => cancelAnimationFrame(animationId);
  }, [state, amplitude]);

  return (
    <>
      {/* Static background */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-b from-slate-900 via-slate-950 to-black opacity-50" />

      {/* Canvas for ripple effects */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      />

      {/* Subtle radial vignette */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, transparent 30%, rgba(0, 0, 0, 0.5) 100%)',
        }}
        animate={{
          opacity: state === 'idle' ? 0.3 : 0.5,
        }}
      />
    </>
  );
}
