'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface CoreRingProps {
  amplitude: number;
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export function CoreRing({ amplitude, state }: CoreRingProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate ring properties based on state and amplitude
  const scale = React.useMemo(() => {
    switch (state) {
      case 'idle':
        return 1;
      case 'listening':
        return 1.05;
      case 'thinking':
        return 1.08;
      case 'speaking':
        return 1 + amplitude * 0.15;
      default:
        return 1;
    }
  }, [state, amplitude]);

  const rotation = React.useMemo(() => {
    switch (state) {
      case 'idle':
        return 0;
      case 'listening':
        return 360;
      case 'thinking':
        return 360;
      case 'speaking':
        return 360;
      default:
        return 0;
    }
  }, [state]);

  const duration = React.useMemo(() => {
    switch (state) {
      case 'idle':
        return 8;
      case 'listening':
        return 6;
      case 'thinking':
        return 4;
      case 'speaking':
        return 3;
      default:
        return 8;
    }
  }, [state]);

  return (
    <motion.div
      ref={containerRef}
      className="absolute w-40 h-40"
      style={{
        border: '2px solid',
        borderColor: 'rgb(6, 182, 212)',
        borderRadius: '50%',
        boxShadow: `
          0 0 20px rgba(6, 182, 212, 0.5),
          inset 0 0 20px rgba(6, 182, 212, 0.2),
          0 0 40px rgba(6, 182, 212, 0.3)
        `,
        background: 'transparent',
      }}
      animate={{
        scale,
        rotate: rotation,
      }}
      transition={{
        scale: {
          type: 'spring',
          stiffness: 100,
          damping: 20,
        },
        rotate: {
          duration,
          repeat: Infinity,
          ease: 'linear',
        },
      }}
    >
      {/* Subtle distortion on the ring based on amplitude */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: '2px solid',
          borderColor: `rgba(6, 182, 212, ${0.3 + amplitude * 0.7})`,
          boxShadow: `0 0 ${10 + amplitude * 30}px rgba(6, 182, 212, ${0.2 + amplitude * 0.6})`,
        }}
        animate={{
          opacity: 0.5 + amplitude * 0.5,
        }}
        transition={{
          duration: 0.1,
        }}
      />
    </motion.div>
  );
}
