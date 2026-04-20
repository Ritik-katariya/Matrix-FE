import { useCallback } from 'react';

export interface AudioAnalysis {
  frequency: number[];
  amplitude: number;
  pitch: number;
  energy: number;
}

export function useAudioAnalyzer() {
  // Analyze frequency data and extract meaningful metrics
  const analyzeFrequencyData = useCallback((
    frequencyData: Uint8Array
  ): AudioAnalysis => {
    const frequency = Array.from(frequencyData);

    // Calculate amplitude (average volume)
    const amplitude =
      frequency.reduce((a, b) => a + b, 0) / frequency.length / 255;

    // Calculate energy (intensity of frequencies)
    const energy = Math.sqrt(
      frequency.reduce((sum, val) => sum + val * val, 0) / frequency.length
    ) / 255;

    // Estimate pitch from dominant frequency (simplified)
    let maxVal = 0;
    let maxIdx = 0;
    frequency.forEach((val, idx) => {
      if (val > maxVal) {
        maxVal = val;
        maxIdx = idx;
      }
    });

    const pitch = (maxIdx / frequency.length) * 100;

    return {
      frequency,
      amplitude,
      pitch,
      energy,
    };
  }, []);

  // Detect if audio contains speech (simplified algorithm)
  const detectSpeech = useCallback(
    (frequencyData: Uint8Array, threshold: number = 0.1): boolean => {
      const analysis = analyzeFrequencyData(frequencyData);

      // Speech typically has moderate energy and specific frequency patterns
      // This is a simplified heuristic - a real implementation would use ML models
      const hasMidFrequencies = frequencyData.slice(
        frequencyData.length * 0.25,
        frequencyData.length * 0.75
      ).some((val) => val > threshold * 255);

      return analysis.energy > threshold && hasMidFrequencies;
    },
    [analyzeFrequencyData]
  );

  // Detect silence (inverse of speech detection)
  const detectSilence = useCallback(
    (frequencyData: Uint8Array, threshold: number = 0.05): boolean => {
      const analysis = analyzeFrequencyData(frequencyData);
      return analysis.energy < threshold;
    },
    [analyzeFrequencyData]
  );

  return {
    analyzeFrequencyData,
    detectSpeech,
    detectSilence,
  };
}
