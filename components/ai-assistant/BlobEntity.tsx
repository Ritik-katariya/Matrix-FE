'use client';

import React, { useEffect, useRef } from 'react';
import { useAssistant } from '@/components/contexts/AssistantContext';
import { useAudioAnalyzer } from '@/components/hooks/useAudioAnalyzer';
import gsap from 'gsap';

export function BlobEntity() {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const { isRecording, frequencyData } = useAssistant();
  const { analyzeFrequencyData } = useAudioAnalyzer();

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    // Responsive sizing
    const size = Math.min(window.innerWidth, window.innerHeight) * 0.3;
    svg.setAttribute('viewBox', `0 0 200 200`);
    svg.style.width = `${size}px`;
    svg.style.height = `${size}px`;

    const handleResize = () => {
      const newSize = Math.min(window.innerWidth, window.innerHeight) * 0.3;
      svg.style.width = `${newSize}px`;
      svg.style.height = `${newSize}px`;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute glow and animation metrics from frequency data
  const glowIntensity = frequencyData
    ? (frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length) / 255
    : 0;

  const analysis = frequencyData ? analyzeFrequencyData(frequencyData) : null;
  const pulseFactor = isRecording ? 1 + glowIntensity * 0.2 : 1;
  
  // Apply GSAP animation for smooth morphing
  useEffect(() => {
    if (!pathRef.current || !isRecording) return;

    const scale = 1 + (analysis?.energy || 0) * 0.15;
    
    gsap.to(pathRef.current, {
      attr: {
        d: generateBlobPath(scale, glowIntensity),
      },
      duration: 0.3,
      ease: 'power1.inOut',
    });
  }, [glowIntensity, analysis, isRecording]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      className={`${isRecording ? 'animate-glow-pulse' : 'animate-blob-breathe'}`}
      style={{
        filter: `drop-shadow(0 0 ${20 + glowIntensity * 40}px rgba(168, 85, 247, ${0.3 + glowIntensity * 0.8}))`,
        transform: `scale(${pulseFactor})`,
      }}
    >
      {/* Define gradients */}
      <defs>
        <linearGradient id="blobGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'rgb(168, 85, 247)', stopOpacity: 0.9 }} />
          <stop offset="50%" style={{ stopColor: 'rgb(139, 92, 246)', stopOpacity: 0.85 }} />
          <stop offset="100%" style={{ stopColor: 'rgb(96, 165, 250)', stopOpacity: 0.9 }} />
        </linearGradient>
      </defs>

      {/* Main blob shape with morphing animation */}
      <path
        ref={pathRef}
        d={generateBlobPath(1, 0)}
        fill="url(#blobGradient)"
        className="animate-blob-morph"
        style={{
          filter: `blur(1px)`,
        }}
      />

      {/* Inner glow */}
      <circle
        cx="100"
        cy="100"
        r={30 * pulseFactor}
        fill="rgba(255, 255, 255, 0.3)"
        opacity={0.5 + glowIntensity * 0.5}
      />

      {/* Voice indicator rings */}
      {isRecording && (
        <>
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={`ring-${i}`}
              cx="100"
              cy="100"
              r={50 + i * 15}
              fill="none"
              stroke={`rgba(168, 85, 247, ${0.4 - i * 0.08})`}
              strokeWidth="2"
              opacity={1 - i * 0.2}
              style={{
                animation: `pulse 2s ease-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </>
      )}
    </svg>
  );
}

// Generate blob path with dynamic morphing based on audio
function generateBlobPath(scale: number, audioIntensity: number): string {
  const center = 100;
  const baseRadius = 45;
  
  // Create 8 control points around the blob
  const points = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    
    // Vary radius based on angle and audio intensity
    const variation = Math.sin(angle * 3 + Date.now() / 500) * audioIntensity * 15;
    const radius = baseRadius * scale + variation;
    
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    
    points.push({ x, y, angle });
  }

  // Create smooth bezier path through points
  let pathData = `M ${points[0].x},${points[0].y}`;
  
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    
    // Calculate control points for smooth curve
    const cp1x = current.x + Math.cos(current.angle) * baseRadius * 0.4;
    const cp1y = current.y + Math.sin(current.angle) * baseRadius * 0.4;
    const cp2x = next.x - Math.cos(next.angle) * baseRadius * 0.4;
    const cp2y = next.y - Math.sin(next.angle) * baseRadius * 0.4;
    
    pathData += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }
  
  pathData += ' Z';
  return pathData;
}
