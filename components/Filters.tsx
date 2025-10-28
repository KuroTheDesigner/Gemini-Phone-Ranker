import React from 'react';

interface FiltersProps {
  filters: {
    searchTerm: string;
    priceRange: number[];
    hasWirelessCharging: boolean;
    has35mmJack: boolean;
  };
  setFilters: React.Dispatch<React.SetStateAction<FiltersProps['filters']>>;
  minPrice: number;
  maxPrice: number;
  disabled?: boolean;
}

export const Filters: React.FC<FiltersProps> = ({ filters, setFilters, minPrice, maxPrice, disabled = false }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setFilters(prev => ({
      ...prev,
      priceRange: [prev.priceRange[0], value],
    }));
  };
  
  const formattedMaxPrice = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(filters.priceRange[1]);

  return (
    <div className={`bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 mb-6 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <fieldset disabled={disabled} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Search Input */}
        <div>
          <label htmlFor="searchTerm" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Search by Name
          </label>
          <input
            type="text"
            id="searchTerm"
            name="searchTerm"
            value={filters.searchTerm}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 disabled:bg-gray-200 dark:disabled:bg-gray-700"
            placeholder="e.g., Pixel 8"
          />
        </div>

        {/* Price Range Slider */}
        <div className="md:col-span-2">
            <label htmlFor="priceRange" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Max Price: <span className="font-bold">{formattedMaxPrice}</span>
            </label>
            <input
                type="range"
                id="priceRange"
                name="priceRange"
                min={minPrice}
                max={maxPrice}
                value={filters.priceRange[1]}
                onChange={handlePriceChange}
                className="mt-1 block w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
        </div>

        {/* Checkboxes */}
        <div className="flex items-end justify-start space-x-6">
          <div className="flex items-center">
            <input
              id="hasWirelessCharging"
              name="hasWirelessCharging"
              type="checkbox"
              checked={filters.hasWirelessCharging}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700"
            />
            <label htmlFor="hasWirelessCharging" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">
              Wireless Charging
            </label>
          </div>
          <div className="flex items-center">
            <input
              id="has35mmJack"
              name="has35mmJack"
              type="checkbox"
              checked={filters.has35mmJack}
              onChange={handleInputChange}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-100 dark:bg-gray-700"
            />
            <label htmlFor="has35mmJack" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">
              3.5mm Jack
            </label>
          </div>
        </div>

      </fieldset>
    </div>
  );
};