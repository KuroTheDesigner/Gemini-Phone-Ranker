import React, { useEffect, useRef } from 'react';
import { useLiveSession } from '../hooks/useLiveSession';
import type { TranscriptEntry } from '../types';
import { MicrophoneIcon } from './icons';

interface LiveRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (summary: string) => void;
}

const StatusIndicator: React.FC<{ status: string }> = ({ status }) => {
    let color = 'bg-gray-400';
    let text = 'Idle';
    switch (status) {
        case 'CONNECTING':
            color = 'bg-yellow-500 animate-pulse';
            text = 'Connecting...';
            break;
        case 'ACTIVE':
            color = 'bg-green-500';
            text = 'Listening...';
            break;
        case 'ERROR':
            color = 'bg-red-500';
            text = 'Error';
            break;
        case 'ENDED':
            color = 'bg-gray-500';
            text = 'Session Ended';
            break;
    }
    return (
        <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${color}`}></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{text}</span>
        </div>
    );
};

const TranscriptView: React.FC<{ transcript: TranscriptEntry[] }> = ({ transcript }) => {
    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-4">
            {transcript.map((entry, index) => (
                <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${entry.speaker === 'user' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'}`}>
                        <p className="text-sm break-words">{entry.text}</p>
                    </div>
                </div>
            ))}
            <div ref={endOfMessagesRef} />
        </div>
    );
};

export const LiveRecommendationModal: React.FC<LiveRecommendationModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { status, transcript, startSession, endSession } = useLiveSession({ onComplete });

  useEffect(() => {
    if (isOpen) {
      startSession();
    } else {
      endSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 m-4 max-w-2xl w-full h-[80vh] max-h-[700px] flex flex-col transform transition-all" onClick={(e) => e.stopPropagation()}>
        <header className="flex justify-between items-center pb-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
                <MicrophoneIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Describe Your Needs</h2>
            </div>
            <StatusIndicator status={status} />
        </header>

        <div className="flex-1 my-4 flex flex-col">
            <TranscriptView transcript={transcript} />
            {status === 'ERROR' && (
                <p className="text-red-500 text-sm text-center mt-2">
                    A connection error occurred. Please check your microphone permissions and try again.
                </p>
            )}
        </div>

        <footer className="flex items-center justify-end gap-4 pt-4 border-t dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-md text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500"
          >
            {status === 'ACTIVE' || status === 'CONNECTING' ? 'Cancel' : 'Close'}
          </button>
        </footer>
      </div>
    </div>
  );
};
