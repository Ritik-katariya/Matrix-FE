'use client';

import React from 'react';
import { FloatingPanel } from './FloatingPanel';
import { AIEntity } from './AIEntity';
import { VoiceVisualizer } from './VoiceVisualizer';
import { MessagePanel } from './MessagePanel';
import { ControlPanel } from './ControlPanel';
import OrbitalSphere from './AiGlobUi';

function AIAssistantContent() {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-background via-background to-primary/10">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/11 rounded-full blur-3xl animate-blob-breathe" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/13 rounded-full blur-3xl animate-blob-breathe" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-blob-breathe" style={{ animationDelay: '2s' }} />
      </div>

      {/* Main content area */}
     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
  <div className="pointer-events-auto">
    <OrbitalSphere />
  </div>
</div>
    </div>
  );
}

export function AIAssistant() {
  return <AIAssistantContent />;
}




//  <div className="relative w-full h-full flex items-center justify-center">
//         {/* Central energy entity */}
//         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//           {/* <AIEntity /> */}
//           <OrbitalSphere />
//         </div>

//         Top left panel - Control Panel
//         <FloatingPanel 
//           position="top-left"
//           className="w-64 z-10 pointer-events-auto"
//           ariaLabel="Voice control panel"
//           role="region"
//         >
//           <ControlPanel />
//         </FloatingPanel>

//         Top right panel - Voice Visualizer
//         <FloatingPanel 
//           position="top-right"
//           className="w-80 z-10 pointer-events-auto"
//           delay={0.2}
//           ariaLabel="Voice input visualization"
//           role="region"
//         >
//           <VoiceVisualizer />
//         </FloatingPanel>

//         Bottom right panel - Message Panel
//         <FloatingPanel 
//           position="bottom-right"
//           className="w-96 h-96 flex flex-col z-10 pointer-events-auto"
//           delay={0.1}
//           ariaLabel="Chat messages panel"
//           role="region"
//         >
//           <MessagePanel />
//         </FloatingPanel>
//       </div>