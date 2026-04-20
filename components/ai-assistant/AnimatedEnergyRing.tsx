'use client';

import React, { useEffect, useRef } from 'react';
import { useAssistant } from '@/components/contexts/AssistantContext';

export function AnimatedEnergyRing() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isRecording, frequencyData } = useAssistant();
  const animationFrameRef = useRef<number>();
  const timeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 400 * dpr;
    ctx.scale(dpr, dpr);

    const centerX = 200;
    const centerY = 200;
    const baseRadius = 100;

    const animate = () => {
      timeRef.current += 1;

      // Clear canvas with pure black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 400, 400);

      // Calculate audio intensity from microphone input
      let audioIntensity = 0;
      if (isRecording && frequencyData && frequencyData.length > 0) {
        audioIntensity = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 255;
      }

      // Clamp audio intensity
      audioIntensity = Math.min(audioIntensity, 1);

      // ===== GLOW LAYERS (SOFT OUTER GLOW) =====
      // Multiple soft glow rings that expand with audio
      for (let layer = 0; layer < 6; layer++) {
        const glowRadius = baseRadius + layer * 8;
        const glowGradient = ctx.createRadialGradient(
          centerX,
          centerY,
          glowRadius - 15,
          centerX,
          centerY,
          glowRadius + 30
        );

        const alpha = (0.12 - layer * 0.02) * (0.5 + audioIntensity * 0.8);
        glowGradient.addColorStop(0, `rgba(59, 130, 246, ${alpha})`);
        glowGradient.addColorStop(0.5, `rgba(37, 99, 235, ${alpha * 0.5})`);
        glowGradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, 0, 400, 400);
      }

      // ===== MAIN NEON RING =====
      // Create sharp, bright neon ring with gradient
      const ringWidth = 12 + audioIntensity * 4;
      const ringGradient = ctx.createLinearGradient(
        centerX - baseRadius,
        centerY,
        centerX + baseRadius,
        centerY
      );

      ringGradient.addColorStop(0, 'rgba(59, 130, 246, 0)');
      ringGradient.addColorStop(0.15, 'rgba(96, 165, 250, 0.7)');
      ringGradient.addColorStop(0.35, 'rgba(147, 197, 253, 0.9)');
      ringGradient.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
      ringGradient.addColorStop(0.65, 'rgba(147, 197, 253, 0.9)');
      ringGradient.addColorStop(0.85, 'rgba(96, 165, 250, 0.7)');
      ringGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

      ctx.strokeStyle = ringGradient;
      ctx.lineWidth = ringWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // Bright white core line on the ring
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + audioIntensity * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      // ===== ANIMATED ENERGY PARTICLES =====
      const particleCount = 8;
      const rotationSpeed = isRecording ? 0.04 : 0.02;

      for (let i = 0; i < particleCount; i++) {
        const angle = (timeRef.current * rotationSpeed + (i / particleCount) * Math.PI * 2) % (Math.PI * 2);
        const x = centerX + Math.cos(angle) * baseRadius;
        const y = centerY + Math.sin(angle) * baseRadius;

        // Particle outer glow
        const particleGlowSize = 20 + audioIntensity * 10;
        const particleGlow = ctx.createRadialGradient(x, y, 2, x, y, particleGlowSize);
        particleGlow.addColorStop(0, `rgba(255, 255, 255, ${0.8 + audioIntensity * 0.2})`);
        particleGlow.addColorStop(0.3, `rgba(147, 197, 253, ${0.6 + audioIntensity * 0.2})`);
        particleGlow.addColorStop(1, `rgba(59, 130, 246, 0)`);

        ctx.fillStyle = particleGlow;
        ctx.beginPath();
        ctx.arc(x, y, particleGlowSize, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.fillStyle = `rgba(255, 255, 255, 1)`;
        ctx.beginPath();
        ctx.arc(x, y, 5 + audioIntensity * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // ===== ENERGY TRAILS (flowing along the ring when recording) =====
      if (isRecording && audioIntensity > 0.1) {
        const trailCount = 12;
        const trailSpeed = audioIntensity * 0.06;

        for (let trail = 0; trail < trailCount; trail++) {
          const trailAngle = timeRef.current * trailSpeed + (trail / trailCount) * Math.PI * 2;

          // Draw a short arc of energy flowing around the ring
          for (let j = 0; j < 20; j++) {
            const segmentAngle = trailAngle + (j / 20) * (Math.PI / 4);
            const segmentX = centerX + Math.cos(segmentAngle) * baseRadius;
            const segmentY = centerY + Math.sin(segmentAngle) * baseRadius;

            const trailAlpha = Math.sin((j / 20) * Math.PI) * audioIntensity * 0.5;
            const trailSize = 3 + Math.sin((j / 20) * Math.PI) * 2;

            ctx.fillStyle = `rgba(96, 165, 250, ${trailAlpha})`;
            ctx.beginPath();
            ctx.arc(segmentX, segmentY, trailSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // ===== INNER CORE GLOW =====
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius - 40);
      coreGlow.addColorStop(0, `rgba(147, 197, 253, ${0.15 + audioIntensity * 0.15})`);
      coreGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = coreGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius - 40, 0, Math.PI * 2);
      ctx.fill();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, frequencyData]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '400px',
        height: '400px',
      }}
    />
  );
}
