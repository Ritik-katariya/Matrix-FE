import { useEffect, useRef, useCallback, useState } from 'react';
import { useAssistant } from '@/components/contexts/AssistantContext';
import { useAudioAnalyzer } from './useAudioAnalyzer';

export function useVoiceInput() {
  const {
    setIsRecording,
    setIsMicAvailable,
    setAudioLevel,
    setFrequencyData,
    setError,
  } = useAssistant();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Analyze audio data
  const analyzeAudio = useCallback(() => {
    const analyzer = analyzerRef.current;
    if (!analyzer) return;

    const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(frequencyData);

    // Calculate average level
    const average = frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length;
    const normalizedLevel = average / 255;

    setAudioLevel(normalizedLevel);
    setFrequencyData(frequencyData);

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, [setAudioLevel, setFrequencyData]);

  // Initialize microphone
  const initializeMicrophone = useCallback(async () => {
    try {
      if (hasInitialized) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });

      streamRef.current = stream;

      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyzer
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzerRef.current = analyzer;

      // Connect stream to analyzer
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);

      setIsMicAvailable(true);
      setHasInitialized(true);
      setError(null);
    } catch (err) {
      const errorMsg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please enable microphone permissions.'
          : 'Failed to initialize microphone';
      setError(errorMsg);
      setIsMicAvailable(false);
      console.error('Microphone initialization error:', err);
    }
  }, [hasInitialized, setIsMicAvailable, setError]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      if (!hasInitialized) {
        await initializeMicrophone();
      }

      if (streamRef.current && analyzerRef.current) {
        setIsRecording(true);
        analyzeAudio();
        setError(null);
      }
    } catch (err) {
      console.error('Recording start error:', err);
      setError('Failed to start recording');
    }
  }, [hasInitialized, initializeMicrophone, setIsRecording, analyzeAudio, setError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setAudioLevel(0);
    setFrequencyData(null);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [setIsRecording, setAudioLevel, setFrequencyData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return {
    startRecording,
    stopRecording,
    initializeMicrophone,
  };
}
