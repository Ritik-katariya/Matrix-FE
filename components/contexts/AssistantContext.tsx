'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface AssistantContextType {
  // Voice state
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  isMicAvailable: boolean;
  setIsMicAvailable: (value: boolean) => void;
  audioLevel: number;
  setAudioLevel: (value: number) => void;
  frequencyData: Uint8Array | null;
  setFrequencyData: (data: Uint8Array | null) => void;

  // Message state
  messages: Message[];
  addMessage: (message: Omit<Message, 'id'>) => void;
  clearMessages: () => void;

  // UI state
  isThinking: boolean;
  setIsThinking: (value: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export function AssistantProvider({ children }: { children: ReactNode }) {
  // Voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isMicAvailable, setIsMicAvailable] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [frequencyData, setFrequencyData] = useState<Uint8Array | null>(null);

  // Message state
  const [messages, setMessages] = useState<Message[]>([]);

  // UI state
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: `${Date.now()}-${Math.random()}`,
    };
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <AssistantContext.Provider
      value={{
        isRecording,
        setIsRecording,
        isMicAvailable,
        setIsMicAvailable,
        audioLevel,
        setAudioLevel,
        frequencyData,
        setFrequencyData,
        messages,
        addMessage,
        clearMessages,
        isThinking,
        setIsThinking,
        error,
        setError,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within AssistantProvider');
  }
  return context;
}
