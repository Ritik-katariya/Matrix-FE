'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface GlowLayerProps {
  amplitude: number;
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export function GlowLayer({ amplitude, state }: GlowLayerProps) {
  // Calculate glow intensity based on state and amplitude
  const baseGlow = React.useMemo(() => {
    switch (state) {
      case 'idle':
        return 20;
      case 'listening':
        return 30;
      case 'thinking':
        return 35;
      case 'speaking':
        return 40 + amplitude * 30;
      default:
        return 20;
    }
  }, [state, amplitude]);

  const glowColor = 'rgb(6, 182, 212)';
  const glowOpacity = React.useMemo(() => {
    switch (state) {
      case 'idle':
        return 0.3;
      case 'listening':
        return 0.5;
      case 'thinking':
        return 0.6;
      case 'speaking':
        return 0.5 + amplitude * 0.5;
      default:
        return 0.3;
    }
  }, [state, amplitude]);

  return (
    <>
      {/* Outer soft glow - blur effect */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '280px',
          height: '280px',
          background: `radial-gradient(circle, ${glowColor}, transparent)`,
          filter: `blur(40px)`,
          opacity: glowOpacity * 0.4,
        }}
        animate={{
          opacity: glowOpacity * 0.4,
        }}
        transition={{
          duration: 0.3,
        }}
      />

      {/* Mid glow layer */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '240px',
          height: '240px',
          background: `radial-gradient(circle, ${glowColor}, transparent)`,
          filter: `blur(20px)`,
          opacity: glowOpacity * 0.6,
        }}
        animate={{
          opacity: glowOpacity * 0.6,
        }}
        transition={{
          duration: 0.3,
        }}
      />

      {/* Inner sharp neon edge */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '180px',
          height: '180px',
          background: `radial-gradient(circle, ${glowColor}, transparent)`,
          filter: `blur(5px)`,
          opacity: glowOpacity,
        }}
        animate={{
          opacity: glowOpacity,
        }}
        transition={{
          duration: 0.3,
        }}
      />

      {/* Pulsing glow on core ring - responds to audio */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '160px',
          height: '160px',
          boxShadow: `0 0 ${baseGlow}px ${glowColor}, inset 0 0 ${baseGlow * 0.5}px ${glowColor}`,
          border: '1px solid rgba(6, 182, 212, 0.4)',
        }}
        animate={{
          boxShadow: [
            `0 0 ${baseGlow}px ${glowColor}, inset 0 0 ${baseGlow * 0.5}px ${glowColor}`,
            `0 0 ${baseGlow * 1.3}px ${glowColor}, inset 0 0 ${baseGlow * 0.8}px ${glowColor}`,
            `0 0 ${baseGlow}px ${glowColor}, inset 0 0 ${baseGlow * 0.5}px ${glowColor}`,
          ],
        }}
        transition={{
          duration: 2 + amplitude * 2,
          repeat: Infinity,
        }}
      />
    </>
  );
}
