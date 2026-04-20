/**
 * Audio processing constants
 */

export const AUDIO_CONFIG = {
  // FFT size for frequency analysis
  FFT_SIZE: 256,
  
  // Frequency ranges for audio analysis
  LOW_FREQ_START: 0,
  MID_FREQ_START: 0.25,
  HIGH_FREQ_START: 0.75,
  
  // Thresholds for speech detection
  SPEECH_THRESHOLD: 0.15,
  SILENCE_THRESHOLD: 0.05,
  
  // Update rates
  ANALYSIS_UPDATE_RATE: 60, // Hz
  
  // Smoothing factors for audio analysis (0-1)
  LEVEL_SMOOTHING: 0.1,
  FREQUENCY_SMOOTHING: 0.2,
};

export const ANIMATION_CONFIG = {
  // Blob animation timings
  MORPH_DURATION: 0.3,
  BREATHE_DURATION: 3,
  PULSE_DURATION: 2,
  
  // Glow effect intensities
  BASE_GLOW: 20,
  MAX_GLOW: 50,
  
  // Scale factors
  BASE_SCALE: 1,
  MAX_SCALE: 1.25,
};

export const UI_CONFIG = {
  // Panel positioning and sizing
  PANEL_WIDTH: 'w-64 md:w-72',
  MESSAGE_PANEL_HEIGHT: 'h-80 md:h-96',
  
  // Animation delays
  PANEL_DELAY_INCREMENT: 0.1,
  
  // Responsive breakpoints
  MOBILE_BREAKPOINT: 640,
  TABLET_BREAKPOINT: 1024,
};
