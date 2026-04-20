'use client';

import React, { useRef, useEffect } from 'react';
import { useAssistant } from '@/components/contexts/AssistantContext';
import { motion } from 'framer-motion';

export function MessagePanel() {
  const { messages, addMessage, isRecording } = useAssistant();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = React.useState('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      addMessage({
        role: 'user',
        content: inputValue,
        timestamp: new Date(),
      });

      // Simulate assistant response with streaming effect
      const responses = [
        'I&apos;m processing your request...',
        'Let me analyze that for you...',
        'Here&apos;s what I found: Your input has been successfully received. I&apos;m ready to assist with more queries!',
      ];

      let delay = 300;
      responses.forEach((response, idx) => {
        setTimeout(() => {
          if (idx === 0) {
            // First message
            addMessage({
              role: 'assistant',
              content: response,
              timestamp: new Date(),
            });
          } else {
            // Add "thinking" indicator then replace
            addMessage({
              role: 'assistant',
              content: response,
              timestamp: new Date(),
            });
          }
        }, delay);
        delay += 800;
      });

      setInputValue('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-sm font-semibold text-foreground mb-4">Chat</h2>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-xs text-muted-foreground text-center">
              No messages yet. Start speaking or type a message.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                message.role === 'user'
                  ? 'bg-primary/60 text-white rounded-br-none'
                  : 'bg-white/10 text-foreground rounded-bl-none border border-white/20'
              }`}
            >
              {message.content}
            </div>
          </motion.div>
        ))}

        {isRecording && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="flex gap-2 items-center text-xs text-muted-foreground"
          >
            <span>Recording...</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1 h-1 bg-primary/60 rounded-full"
                  style={{
                    animation: `pulse 1s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="flex gap-2 pt-4 border-t border-white/10">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
          className="flex-1 bg-black/30 border border-white/20 rounded px-3 py-2 text-sm text-foreground placeholder-muted-foreground outline-none focus:border-primary/50 transition-colors"
        />
        <motion.button
          onClick={handleSendMessage}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-primary/60 hover:bg-primary text-white px-3 py-2 rounded text-sm font-medium transition-colors"
        >
          Send
        </motion.button>
      </div>
    </div>
  );
}
