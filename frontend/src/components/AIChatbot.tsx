import React, { useState, useRef, useEffect } from 'react';
import { Cpu, Send, Sparkles, User, RefreshCw, Bot, MessageSquare, X, ChevronDown, Minimize2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { queryAIChatbot } from '../services/api';

interface AIChatbotProps {
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export const AIChatbot: React.FC<AIChatbotProps> = ({ initialPrompt, onClearInitialPrompt }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello! I am **Ask Fix-It Felix**, your AI Civic Maintenance Assistant. I am connected directly to your municipal database. Ask me anything about local complaints, high-priority issues, or department progress.`,
      timestamp: new Date().toISOString()
    }
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const samplePrompts = [
    'How many complaints are pending?',
    'Show all high-priority issues.',
    'Which department has the most complaints?',
    'Summarize today\'s reported issues.'
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (initialPrompt) {
      setIsOpen(true);
      handleSendQuery(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: queryText.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const answer = await queryAIChatbot(queryText);

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: answer || 'No response generated.',
        timestamp: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Chatbot error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: `Error querying AWS Chatbot: ${error.message || 'Please check network connection.'}`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          if (line.startsWith('### ')) {
            return <h4 key={idx} className="font-bold text-[#C86A53] text-xs mt-2 mb-0.5">{line.replace('### ', '')}</h4>;
          }

          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const content = line.trim().substring(2);
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-[#6B8E7B] font-bold mt-0.5">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatBold(content) }} />
              </div>
            );
          }

          return <p key={idx} dangerouslySetInnerHTML={{ __html: formatBold(line) }} />;
        })}
      </div>
    );
  };

  const formatBold = (str: string) => {
    return str.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#3A3F3B] font-bold">$1</strong>');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      
      {/* Closed State: Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="btn-terracotta p-4 rounded-full shadow-2xl flex items-center gap-2.5 group hover:scale-105 transition-all transform active:scale-95"
          title="Open Ask Fix-It Felix"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#6B8E7B] rounded-full border-2 border-white animate-pulse"></span>
          </div>
          <span className="font-bold text-sm hidden sm:inline text-white">Ask Fix-It Felix</span>
        </button>
      )}

      {/* Open State: Floating Chat Window */}
      {isOpen && (
        <div className="urban-card w-[360px] sm:w-[400px] h-[520px] max-w-[calc(100vw-2rem)] flex flex-col shadow-2xl border border-[#E5E0D8] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="p-3.5 bg-white border-b border-[#E5E0D8] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#C86A53] flex items-center justify-center text-white shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#3A3F3B]">Ask Fix-It Felix</h3>
                <span className="text-[10px] text-[#6B8E7B] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6B8E7B]"></span>
                  Connected to Gemini AI
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                className="p-1.5 text-[#3A3F3B]/60 hover:text-[#3A3F3B] hover:bg-[#F7F5F0] rounded-lg transition-colors"
                title="Clear Chat"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-[#3A3F3B]/60 hover:text-[#3A3F3B] hover:bg-[#F7F5F0] rounded-lg transition-colors"
                title="Minimize Chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F7F5F0]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#C86A53] flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs ${
                    m.role === 'user'
                      ? 'bg-[#C86A53] text-white font-medium rounded-tr-none'
                      : 'bg-white border border-[#E5E0D8] text-[#3A3F3B] rounded-tl-none'
                  }`}
                >
                  {m.role === 'assistant' ? renderFormattedMarkdown(m.content) : m.content}
                  <span
                    className={`text-[9px] block text-right mt-1 font-mono ${
                      m.role === 'user' ? 'text-white/70' : 'text-[#3A3F3B]/40'
                    }`}
                  >
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {m.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[#6B8E7B] flex items-center justify-center text-white shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-start gap-2 justify-start">
                <div className="w-7 h-7 rounded-lg bg-[#C86A53] flex items-center justify-center text-white shrink-0">
                  <Bot className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div className="bg-white border border-[#E5E0D8] rounded-2xl rounded-tl-none px-3 py-2 text-xs text-[#6B8E7B] flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-[#C86A53]" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Shortcuts */}
          <div className="p-2 bg-white border-t border-[#E5E0D8] overflow-x-auto no-scrollbar flex items-center gap-1.5">
            {samplePrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendQuery(prompt)}
                disabled={isLoading}
                className="px-2.5 py-1 rounded-full bg-[#F7F5F0] hover:bg-[#EAE6DF] border border-[#E5E0D8] text-[11px] text-[#3A3F3B] whitespace-nowrap transition-colors shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-[#E5E0D8]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuery(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about local civic issues..."
                disabled={isLoading}
                className="flex-1 bg-[#F7F5F0] border border-[#E5E0D8] rounded-xl px-3 py-2 text-xs text-[#3A3F3B] placeholder-[#3A3F3B]/40 focus:outline-none focus:ring-1 focus:ring-[#C86A53]"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="btn-terracotta p-2 rounded-xl text-white disabled:opacity-50 transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </div>
      )}

    </div>
  );
};
