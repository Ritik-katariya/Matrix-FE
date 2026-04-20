'use client';

import React, { useEffect, memo } from 'react';
import { useAssistant } from '@/components/contexts/AssistantContext';
import { useVoiceInput } from '@/components/hooks/useVoiceInput';
import { motion } from 'framer-motion';

export const ControlPanel = memo(function ControlPanel() {
  const { isRecording, setIsRecording, isMicAvailable, setIsMicAvailable, error, setError } = useAssistant();
  const { startRecording, stopRecording, initializeMicrophone } = useVoiceInput();

  // Initialize microphone on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeMicrophone();
        setIsMicAvailable(true);
      } catch (err) {
        setIsMicAvailable(false);
      }
    };
    init();
  }, [initializeMicrophone, setIsMicAvailable]);

  const handleMicToggle = async () => {
    try {
      if (!isRecording) {
        await startRecording();
        setIsRecording(true);
        setError(null);
      } else {
        stopRecording();
        setIsRecording(false);
      }
    } catch (err) {
      console.error('Mic toggle error:', err);
      setError('Failed to toggle microphone');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Controls</h2>

      {/* Microphone button */}
      <motion.button
        onClick={handleMicToggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
          isRecording
            ? 'bg-red-500/80 hover:bg-red-600 text-white'
            : 'bg-primary/60 hover:bg-primary text-white'
        }`}
        aria-label={isRecording ? 'Stop recording audio' : 'Start recording audio'}
        aria-pressed={isRecording}
      >
        <svg
          className="w-4 h-4"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 2a4 4 0 100 8 4 4 0 000-8zM2 10a8 8 0 1116 0 8 8 0 01-16 0z" />
        </svg>
        {isRecording ? 'Stop Recording' : 'Start Listening'}
      </motion.button>

      {/* Settings */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Sensitivity
          </label>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="50"
            className="w-full accent-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">
            Response Speed
          </label>
          <select className="w-full bg-black/30 border border-white/10 rounded text-xs text-foreground p-2">
            <option>Fast</option>
            <option>Medium</option>
            <option>Slow</option>
          </select>
        </div>
      </div>

      {/* Status indicator */}
      {error && (
        <div className="p-2 bg-red-500/20 border border-red-500/50 rounded text-xs text-red-200">
          {error}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        {isMicAvailable ? '✓ Mic available' : '○ Mic checking...'}
      </p>
    </div>
  );
});
