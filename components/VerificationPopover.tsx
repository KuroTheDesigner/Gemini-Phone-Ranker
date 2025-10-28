import React from 'react';
import type { Verification } from '../types';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon } from './icons';

interface VerificationPopoverProps {
  verification: Verification;
  onClose: () => void;
}

const statusConfig = {
    'Verified': {
        icon: <CheckCircleIcon className="w-6 h-6 text-green-500" />,
        text: 'Verified',
        textColor: 'text-green-600 dark:text-green-400',
    },
    'Minor Discrepancy': {
        icon: <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />,
        text: 'Minor Discrepancy',
        textColor: 'text-yellow-600 dark:text-yellow-400',
    },
    'Unverified': {
        icon: <XCircleIcon className="w-6 h-6 text-red-500" />,
        text: 'Unverified',
        textColor: 'text-red-600 dark:text-red-400',
    },
};

export const VerificationPopover: React.FC<VerificationPopoverProps> = ({ verification, onClose }) => {
  const config = statusConfig[verification.status];

  return (
    <div className="absolute top-full mt-2 left-0 w-80 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl p-4 animate-fade-in-up">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
            {config.icon}
            <h4 className={`text-lg font-bold ${config.textColor}`}>{config.text}</h4>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">&times;</button>
      </div>

      <div className="space-y-3">
        <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">AI Research Notes:</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 italic break-words">"{verification.notes}"</p>
        </div>
        
        {verification.sources && verification.sources.length > 0 && (
            <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sources:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                    {verification.sources.map((source, index) => (
                        <li key={index} className="text-sm truncate">
                            <a 
                                href={source} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                {new URL(source).hostname}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
    </div>
  );
};