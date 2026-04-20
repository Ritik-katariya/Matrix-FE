'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface EnergyTrailsProps {
  amplitude: number;
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}

export function EnergyTrails({ amplitude, state }: EnergyTrailsProps) {
  // Calculate animation duration based on state
  const duration = React.useMemo(() => {
    switch (state) {
      case 'idle':
        return 12;
      case 'listening':
        return 8;
      case 'thinking':
        return 5;
      case 'speaking':
        return 3;
      default:
        return 12;
    }
  }, [state]);

  // Trail opacity based on amplitude
  const trailOpacity = 0.4 + amplitude * 0.6;

  return (
    <>
      {/* Trail 1 - Top */}
      <motion.div
        className="absolute w-48 h-48"
        style={{
          border: '1px solid',
          borderColor: `rgba(6, 182, 212, ${trailOpacity})`,
          borderRadius: '50%',
          top: '-4px',
          boxShadow: `0 0 15px rgba(6, 182, 212, ${trailOpacity * 0.6})`,
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <motion.div
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(6, 182, 212, 1), rgba(6, 182, 212, 0))`,
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: `0 0 10px rgba(6, 182, 212, ${trailOpacity})`,
          }}
        />
      </motion.div>

      {/* Trail 2 - Right (offset 120deg) */}
      <motion.div
        className="absolute w-48 h-48"
        style={{
          border: '1px solid',
          borderColor: `rgba(34, 211, 238, ${trailOpacity * 0.7})`,
          borderRadius: '50%',
          rotate: '120deg',
          boxShadow: `0 0 12px rgba(34, 211, 238, ${trailOpacity * 0.5})`,
        }}
        animate={{
          rotate: [120, 480],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <motion.div
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(34, 211, 238, 1), rgba(34, 211, 238, 0))`,
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: `0 0 8px rgba(34, 211, 238, ${trailOpacity * 0.8})`,
          }}
        />
      </motion.div>

      {/* Trail 3 - Left (offset 240deg) */}
      <motion.div
        className="absolute w-48 h-48"
        style={{
          border: '1px solid',
          borderColor: `rgba(32, 201, 204, ${trailOpacity * 0.6})`,
          borderRadius: '50%',
          rotate: '240deg',
          boxShadow: `0 0 10px rgba(32, 201, 204, ${trailOpacity * 0.4})`,
        }}
        animate={{
          rotate: [240, 600],
        }}
        transition={{
          duration,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <motion.div
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(32, 201, 204, 1), rgba(32, 201, 204, 0))`,
            top: '0',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: `0 0 8px rgba(32, 201, 204, ${trailOpacity * 0.7})`,
          }}
        />
      </motion.div>

      {/* Plasma flow effect - pulsing inner orbits */}
      <motion.div
        className="absolute w-32 h-32 rounded-full"
        style={{
          border: '1px solid',
          borderColor: `rgba(6, 182, 212, ${trailOpacity * 0.4})`,
          boxShadow: `inset 0 0 20px rgba(6, 182, 212, ${trailOpacity * 0.3})`,
        }}
        animate={{
          opacity: [0.2, 0.6, 0.2],
        }}
        transition={{
          duration: 2 + amplitude * 2,
          repeat: Infinity,
        }}
      />
    </>
  );
}
