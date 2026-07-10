'use client';

import { useState, useRef, useEffect } from 'react';
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
        className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-[400px] lg:w-[450px] glass-surface border-l z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="h-16 px-6 flex items-center justify-between border-b border-gray-200/50 dark:border-gray-800/50">
          <div className="flex items-center gap-2 text-accent-600 dark:text-accent-400">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-semibold">Contract AI</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col bg-white/30 dark:bg-black/10">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start gap-3'}`}
            >
              {msg.role === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center shrink-0 text-accent-600 dark:text-accent-400 mt-1">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}
              
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tr-sm' 
                    : msg.isLowFaithfulness 
                      ? 'bg-amber-500/5 border border-amber-500/20 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'
                      : 'bg-accent-500/5 border border-accent-500/20 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                {msg.isLowFaithfulness && (
                  <div className="mt-3 pt-3 border-t border-amber-500/20 text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Couldn't explicitly verify this from the document.
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isThinking && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-500/10 flex items-center justify-center shrink-0 text-accent-600 dark:text-accent-400 mt-1">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="bg-accent-500/5 border border-accent-500/20 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-accent-500/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-accent-500/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-accent-500/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4" />
        </div>

        <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-black/50 backdrop-blur-md">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-full pl-5 pr-12 py-3 text-sm focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500 transition-shadow"
              disabled={isThinking}
            />
            <button 
              type="submit"
              disabled={!inputValue.trim() || isThinking}
              className="absolute right-2 top-1.5 bottom-1.5 w-9 flex items-center justify-center bg-accent-500 hover:bg-accent-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4 -ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
