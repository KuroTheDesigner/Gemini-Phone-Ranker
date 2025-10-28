import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, Phone } from '../types';
import { answerTableQuestion } from '../services/geminiService';
import { PaperAirplaneIcon, XMarkIcon, SparklesIcon, BrainCircuitIcon } from './icons';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  phoneData: Phone[];
}

const WelcomeMessage: React.FC = () => (
    <div className="p-4 bg-blue-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-start gap-3">
            <div className="bg-blue-500 rounded-full p-2 self-start">
                <SparklesIcon className="w-5 h-5 text-white"/>
            </div>
            <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">AI Expert</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Hello! Ask me anything about the phones in the table.
                    <br/>
                    For example: <em className="italic">"Which of these has the best battery life?"</em>
                </p>
            </div>
        </div>
    </div>
);

const ChatMessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
    const isUser = message.role === 'user';
    const isLoading = message.role === 'loading';
    
    if (isLoading) {
        return (
            <div className="flex justify-start items-center gap-3 p-3">
                <div className="bg-blue-500 rounded-full p-2">
                    <SparklesIcon className="w-5 h-5 text-white"/>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                </div>
            </div>
        );
    }
    
    return (
        <div className={`flex items-start gap-3 p-3 ${isUser ? 'justify-end' : ''}`}>
            {!isUser && (
                 <div className="bg-blue-500 rounded-full p-2 self-start">
                    <SparklesIcon className="w-5 h-5 text-white"/>
                </div>
            )}
            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100'}`}>
                {message.isThinking && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 mb-1.5 font-semibold">
                        <BrainCircuitIcon className="w-4 h-4" />
                        <span>Thinking Mode</span>
                    </div>
                )}
                {isUser ? (
                    <p className="text-sm break-words">{message.content}</p>
                ) : (
                    <div className="text-sm break-words">
                        <MarkdownRenderer content={message.content} />
                    </div>
                )}
            </div>
        </div>
    );
};

const ThinkingModeToggle: React.FC<{ isThinkingMode: boolean; setIsThinkingMode: (value: boolean) => void; }> = ({ isThinkingMode, setIsThinkingMode }) => {
    return (
        <div className="flex items-center gap-2" title="Toggle deep thinking mode for complex questions">
            <BrainCircuitIcon className={`w-5 h-5 transition-colors ${isThinkingMode ? 'text-blue-500' : 'text-gray-400 dark:text-gray-500'}`} />
            <style>{`
                .dot { transform: ${isThinkingMode ? 'translateX(100%)' : 'translateX(0)'}; background-color: white; }
                .toggle-bg { background-color: ${isThinkingMode ? '#2563EB' : '#4B5563'}; }
            `}</style>
            <label htmlFor="thinking-toggle" className="flex items-center cursor-pointer">
                <div className="relative">
                    <input type="checkbox" id="thinking-toggle" className="sr-only" checked={isThinkingMode} onChange={() => setIsThinkingMode(!isThinkingMode)} />
                    <div className="toggle-bg block w-10 h-6 rounded-full transition-colors"></div>
                    <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform"></div>
                </div>
            </label>
        </div>
    );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ isOpen, onClose, phoneData }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isThinkingMode, setIsThinkingMode] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: ChatMessage = { role: 'user', content: input };
        const newMessages: ChatMessage[] = [...messages, userMessage];
        
        setMessages([...newMessages, { role: 'loading', content: '' }]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await answerTableQuestion(newMessages, phoneData, isThinkingMode);
            const assistantMessage: ChatMessage = { role: 'assistant', content: response, isThinking: isThinkingMode };
            setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Sorry, I couldn't get an answer.";
            const assistantMessage: ChatMessage = { role: 'assistant', content: `**Error:** ${errorMessage}` };
            setMessages(prev => [...prev.slice(0, -1), assistantMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-4 right-4 w-[90vw] max-w-md h-[70vh] max-h-[600px] z-50 flex flex-col bg-white dark:bg-gray-800 shadow-2xl rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0">
                <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">AI Expert</h3>
                <div className="flex items-center gap-4">
                    <ThinkingModeToggle isThinkingMode={isThinkingMode} setIsThinkingMode={setIsThinkingMode} />
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </div>
            </header>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <WelcomeMessage />
                {messages.map((msg, index) => (
                    <ChatMessageBubble key={index} message={msg} />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <footer className="p-4 border-t dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a question..."
                        disabled={isLoading || phoneData.length === 0}
                        className="w-full pl-3 pr-12 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim() || phoneData.length === 0}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-500 transition-colors"
                        aria-label="Send message"
                    >
                        <PaperAirplaneIcon className="w-5 h-5" />
                    </button>
                </div>
                 {phoneData.length === 0 && <p className="text-xs text-center text-gray-500 mt-2">Please generate a phone list to enable chat.</p>}
            </footer>
        </div>
    );
};