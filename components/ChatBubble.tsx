import React from 'react';
import { ChatBubbleOvalLeftEllipsisIcon } from './icons';

interface ChatBubbleProps {
  onClick: () => void;
  messageCount?: number; // Optional: for future notification badge
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ onClick, messageCount = 0 }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 z-40 w-16 h-16 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center transition-transform hover:scale-110"
      aria-label="Open AI chat"
    >
      <ChatBubbleOvalLeftEllipsisIcon className="w-8 h-8" />
      {messageCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
          {messageCount}
        </span>
      )}
    </button>
  );
};
