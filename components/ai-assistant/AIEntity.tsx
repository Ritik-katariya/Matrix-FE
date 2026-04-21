'use client';

import React from 'react';
import { AnimatedEnergyRing } from './AnimatedEnergyRing';
import OrbitalCanvas from './AiGlobUi';

export function AIEntity() {
  return (
    <div className="relative flex items-center justify-center">
      {/* <AnimatedEnergyRing /> */}
      <OrbitalCanvas />
    </div>
  );
}
