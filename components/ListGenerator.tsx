import React, { useState } from 'react';
import { SparklesIcon } from './icons';

interface ListGeneratorProps {
  isLoading: boolean;
  onSubmit: (description: string) => void;
  currentStage: number;
  totalStages: number;
  currentStageText: string;
}

export const ListGenerator: React.FC<ListGeneratorProps> = ({ isLoading, onSubmit, currentStage, totalStages, currentStageText }) => {
  const [description, setDescription] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(description);
  };

  // This component's own loading spinner and text are not used when `isLoading` is true,
  // as the full-screen overlay in App.tsx handles that.
  // The props `currentStage`, `totalStages`, `currentStageText` are intended for the App.tsx overlay.

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-blue-300 dark:border-blue-700/50 relative mt-8">
      <div className="absolute -top-3 left-4 bg-blue-600 text-white px-3 py-1 text-sm font-bold rounded-full">NEW FEATURE</div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="description" className="block text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
          Generate a New Comparison List
        </label>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Describe the kinds of phones you're interested in, and the AI will create a custom comparison table for you.
          <br/>
          e.g., "Best camera phones of 2024" or "Budget gaming phones under ₦400,000"
        </p>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Describe the phones to compare..."
          disabled={isLoading}
        />
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !description.trim()}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating List...
              </>
            ) : (
                <>
                    <SparklesIcon className="-ml-1 mr-2 h-5 w-5" />
                    Generate List
                </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};