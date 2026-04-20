'use client';

import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface FloatingPanelProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'custom';
  style?: React.CSSProperties;
  onClick?: () => void;
  ariaLabel?: string;
  role?: 'region' | 'group' | 'presentation';
}

export function FloatingPanel({
  children,
  className = '',
  delay = 0,
  position = 'custom',
  style,
  onClick,
  ariaLabel,
  role = 'region',
}: FloatingPanelProps) {
  const positionClasses: Record<string, string> = {
    'top-left': 'top-8 left-8',
    'top-right': 'top-8 right-8',
    'bottom-left': 'bottom-8 left-8',
    'bottom-right': 'bottom-8 right-8',
    custom: '',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
      onClick={onClick}
      className={`glass-panel ${positionClasses[position]} ${className}`}
      style={style}
      role={role}
      aria-label={ariaLabel}
    >
      {children}
    </motion.div>
  );
}
