'use client';

import React, { memo } from 'react';
import { useAssistant } from '@/components/contexts/AssistantContext';
import { motion } from 'framer-motion';

export const VoiceVisualizer = memo(function VoiceVisualizer() {
  const { isRecording, frequencyData, audioLevel } = useAssistant();

  // Create frequency bars from frequency data
  const bars = frequencyData
    ? Array.from({ length: 32 }, (_, i) => {
        const start = Math.floor((i / 32) * frequencyData.length);
        const end = Math.floor(((i + 1) / 32) * frequencyData.length);
        const chunk = frequencyData.slice(start, end);
        return chunk.reduce((a, b) => a + b, 0) / chunk.length / 255;
      })
    : Array(32).fill(0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Voice Input</h2>
        <motion.div
          className={`h-3 w-3 rounded-full ${
            isRecording
              ? 'bg-red-500 animate-pulse'
              : 'bg-muted'
          }`}
          animate={{
            boxShadow: isRecording
              ? [
                  '0 0 0 0 rgba(239, 68, 68, 0.7)',
                  '0 0 0 10px rgba(239, 68, 68, 0)',
                ]
              : 'none',
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
          }}
        />
      </div>

      {/* Frequency visualization */}
      <div className="flex items-end justify-center gap-1 h-32 p-4 bg-black/20 rounded-lg">
        {bars.map((bar, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-gradient-to-t from-primary to-accent rounded-sm"
            initial={{ height: 0 }}
            animate={{ height: `${Math.max(5, bar * 100)}%` }}
            transition={{ duration: 0.1 }}
            style={{
              opacity: 0.7 + bar * 0.3,
              minHeight: '4px',
            }}
          />
        ))}
      </div>

      {/* Audio level meter */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Audio Level</p>
        <div className="relative h-2 bg-black/30 rounded-full overflow-hidden">
          <motion.div
            className="absolute h-full bg-gradient-to-r from-primary to-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${audioLevel * 100}%` }}
            transition={{ duration: 0.05 }}
          />
        </div>
      </div>

      {/* Status text */}
      <p className="text-xs text-muted-foreground text-center">
        {isRecording ? 'Listening...' : 'Microphone off'}
      </p>
    </div>
  );
});
