'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  isLowFaithfulness?: boolean;
}

interface ContractQAProps {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ContractQA({ contractId, isOpen, onClose }: ContractQAProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: 'Ask me anything about this contract (e.g., "What are the payment terms?" or "Are there any late fees?").'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isThinking, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isThinking) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue.trim()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsThinking(true);

    try {
      const response = await apiFetch(`/api/contracts/${contractId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.text })
      });

      const isLowFaithfulness = response.faithfulness_score !== undefined && response.faithfulness_score < 0.5;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response.answer,
        isLowFaithfulness
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error('QA failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: 'Sorry, I encountered an error while trying to answer that question.'
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity animate-in fade-in duration-base"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[400px] lg:w-[450px] bg-bg-surface/95 border-l border-border-default z-50 flex flex-col shadow-modal animate-in slide-in-from-right duration-base ease-spring">
        <div className="h-16 px-6 flex items-center justify-between border-b border-border-subtle shrink-0">
          <div className="flex items-center gap-2 text-accent">
            <Sparkles className="w-5 h-5" strokeWidth={1.5} />
            <h2 className="font-semibold text-text-primary text-base">Contract AI</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-text-secondary hover:text-text-primary transition-colors rounded-full hover:bg-bg-elevated cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col bg-bg-base/30">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-3'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-md bg-accent-subtle border border-accent/20 flex items-center justify-center shrink-0 text-accent mt-0.5">
                  <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                </div>
              )}
              
              <div 
                className={`max-w-[85%] rounded-md px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-accent text-text-inverse font-medium' 
                    : msg.isLowFaithfulness 
                      ? 'bg-warning/5 border border-warning/30 text-text-primary'
                      : 'bg-bg-elevated border border-border-subtle text-text-primary'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                {msg.isLowFaithfulness && (
                  <div className="mt-3 pt-3 border-t border-warning/20 text-xs text-warning flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    Couldn't explicitly verify this from the document.
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isThinking && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-md bg-accent-subtle border border-accent/20 flex items-center justify-center shrink-0 text-accent mt-0.5">
                <Sparkles className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="bg-bg-elevated border border-border-subtle rounded-md px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Input box */}
        <div className="p-4 border-t border-border-subtle bg-bg-surface shrink-0">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question about this contract..."
              className="w-full bg-bg-base border border-border-default rounded-md pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-accent focus:shadow-accent transition-all text-text-primary placeholder:text-text-muted"
              disabled={isThinking}
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isThinking}
              className="absolute right-2 top-2 bottom-2 w-8 flex items-center justify-center bg-accent hover:brightness-105 active:scale-[0.98] text-text-inverse rounded-md transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
