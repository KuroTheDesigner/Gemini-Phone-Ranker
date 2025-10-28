import React from 'react';
import { SparklesIcon, MicrophoneIcon } from './icons';

interface UserInputProps {
  isLoading: boolean;
  onSubmit: () => void;
  priorities: string;
  setPriorities: (value: string) => void;
  onOpenLiveChat: () => void;
}

export const UserInput: React.FC<UserInputProps> = ({ isLoading, onSubmit, priorities, setPriorities, onOpenLiveChat }) => {

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit}>
        <div className="flex justify-between items-center mb-2">
            <label htmlFor="priorities" className="block text-lg font-semibold text-gray-800 dark:text-gray-100">
            What are you looking for in a phone?
            </label>
            <button
                type="button"
                onClick={onOpenLiveChat}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-full text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors"
                title="Use Voice to describe your needs"
            >
                <MicrophoneIcon className="w-5 h-5" />
                <span>Describe with Voice</span>
            </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          e.g., "A great camera for low-light photos and a long battery life for under ₦300,000"
        </p>
        <textarea
          id="priorities"
          value={priorities}
          onChange={(e) => setPriorities(e.target.value)}
          className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Describe your perfect phone..."
          disabled={isLoading}
        />
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !priorities.trim()}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Getting Suggestion...
              </>
            ) : (
                <>
                    <SparklesIcon className="-ml-1 mr-2 h-5 w-5" />
                    Suggest Best Phone For Me
                </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};