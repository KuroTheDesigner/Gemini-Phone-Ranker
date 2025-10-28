import React, { useState } from 'react';
import type { Phone } from '../types';
import { Rating } from './Rating';
import { CheckCircleIcon, ExclamationTriangleIcon, XCircleIcon, InformationCircleIcon } from './icons';
import { VerificationPopover } from './VerificationPopover';

interface PhoneComparisonTableProps {
  phones: Phone[];
  specs: (keyof Phone)[];
  onAddReview: (phone: Phone) => void;
  getAverageRatingForPhone: (phoneName: string) => number;
}

const VerificationStatusIcon: React.FC<{ status: 'Verified' | 'Minor Discrepancy' | 'Unverified' }> = ({ status }) => {
  switch (status) {
    case 'Verified':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    case 'Minor Discrepancy':
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    case 'Unverified':
      return <XCircleIcon className="w-5 h-5 text-red-500" />;
    default:
      return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
  }
};


export const PhoneComparisonTable: React.FC<PhoneComparisonTableProps> = ({ phones, specs, onAddReview, getAverageRatingForPhone }) => {
  const [activePopover, setActivePopover] = useState<string | null>(null);
  
  const formatValue = (value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return value;
  };

  const formatPrice = (price: number | string, currency: string) => {
    if (typeof price !== 'number') {
      return price; // Return "N/A" or other strings as-is
    }
    try {
      // Use Intl.NumberFormat for robust currency formatting.
      return new Intl.NumberFormat(undefined, { // `undefined` lets browser pick locale
        style: 'currency',
        currency: currency || 'USD', // Fallback currency
        minimumFractionDigits: 0,
      }).format(price);
    } catch (e) {
      // If currency code is invalid, fallback to a simpler format.
      console.warn(`Invalid currency code provided: ${currency}`, e);
      return `${currency || ''} ${price.toLocaleString()}`;
    }
  };

  if (phones.length === 0) {
    return (
      <div className="text-center py-12 px-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200">No Phones to Display</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Try generating a new list above or adjusting your filters.</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th scope="col" className="sticky left-0 z-20 bg-gray-50 dark:bg-gray-700 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap border-r dark:border-gray-600">
              Feature
            </th>
            {phones.map((phone) => (
              <th key={phone.Name} scope="col" className="px-6 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider whitespace-nowrap relative">
                <div className="flex items-center gap-2">
                  <span>{phone.Name}</span>
                  {phone.verification && (
                    <button onClick={() => setActivePopover(phone.Name === activePopover ? null : phone.Name)} className="transition-transform hover:scale-110">
                       <VerificationStatusIcon status={phone.verification.status} />
                    </button>
                  )}
                </div>
                {activePopover === phone.Name && phone.verification && (
                  <VerificationPopover
                    verification={phone.verification}
                    onClose={() => setActivePopover(null)}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {specs.map((specKey) => (
            <tr key={String(specKey)} className="dark:odd:bg-gray-800 dark:even:bg-gray-700/50 odd:bg-white even:bg-gray-50">
              <th scope="row" className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-left border-r dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                {String(specKey)}
              </th>
              {phones.map((phone) => (
                <td key={`${phone.Name}-${String(specKey)}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                  {specKey === 'Price'
                    ? formatPrice(phone.Price, phone.Currency)
                    : formatValue(phone[specKey])}
                </td>
              ))}
            </tr>
          ))}
            <tr className="dark:odd:bg-gray-800 dark:even:bg-gray-700/50 odd:bg-white even:bg-gray-50">
                <th scope="row" className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-left border-r dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    Rating
                </th>
                {phones.map((phone) => (
                    <td key={`${phone.Name}-rating`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        <Rating rating={getAverageRatingForPhone(phone.Name)} />
                    </td>
                ))}
            </tr>
            <tr className="dark:odd:bg-gray-800 dark:even:bg-gray-700/50 odd:bg-white even:bg-gray-50">
                <th scope="row" className="sticky left-0 z-10 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-left border-r dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                    Actions
                </th>
                {phones.map((phone) => (
                    <td key={`${phone.Name}-actions`} className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                            onClick={() => onAddReview(phone)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                        >
                            Add Review
                        </button>
                    </td>
                ))}
            </tr>
        </tbody>
      </table>
    </div>
  );
};