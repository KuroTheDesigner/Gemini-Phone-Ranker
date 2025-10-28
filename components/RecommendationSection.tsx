import React, { useState } from 'react';
import type { RecommendationResponse, RecommendationWithImage, StoreDetails } from '../types';
import { PhoneIcon, MapPinIcon } from './icons';
import { Rating } from './Rating';
import { findNearbyStores } from '../services/geminiService';

const StoreList: React.FC<{ stores: StoreDetails[] }> = ({ stores }) => (
    <div className="mt-4 border-t pt-4">
        <h5 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-2">Nearby Stores:</h5>
        <ul className="space-y-3">
            {stores.map(store => (
                <li key={store.placeId}>
                    <a 
                        href={store.mapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                        {store.name}
                    </a>
                    <div className="text-sm text-gray-500 dark:text-gray-400 pl-2">
                        {store.price ? (
                            <p className="font-semibold text-green-700 dark:text-green-400">{store.price}</p>
                        ) : store.phoneNumber ? (
                            <p>
                                {store.phoneNumber} - <span className="italic">Call for Price</span>
                            </p>
                        ) : (
                            <p className="italic">Contact store for price and availability</p>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    </div>
);


const RecommendationCard: React.FC<{ recommendation: RecommendationWithImage, title: string, rating: number }> = ({ recommendation, title, rating }) => {
    const [stores, setStores] = useState<StoreDetails[] | null>(null);
    const [isLoadingStores, setIsLoadingStores] = useState(false);
    const [storeError, setStoreError] = useState<string | null>(null);

    const handleFindStores = () => {
        setIsLoadingStores(true);
        setStoreError(null);
        setStores(null);
        if (!navigator.geolocation) {
            setStoreError("Geolocation is not supported by your browser.");
            setIsLoadingStores(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const results = await findNearbyStores(recommendation.name, position.coords.latitude, position.coords.longitude);
                if (results.length === 0) {
                    setStoreError(`No nearby stores found that might sell the ${recommendation.name}.`);
                } else {
                    setStores(results);
                }
            } catch (e) {
                setStoreError(e instanceof Error ? e.message : "An error occurred while finding stores.");
            } finally {
                setIsLoadingStores(false);
            }
        }, () => {
            setStoreError("Unable to retrieve your location. Please enable location permissions in your browser.");
            setIsLoadingStores(false);
        });
    };

    return (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-xl dark:hover:shadow-blue-900/50">
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4">{title}</h3>
            <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-shrink-0 w-full sm:w-1/3 h-64 sm:h-auto rounded-lg overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                {recommendation.imageUrl ? (
                <img
                    src={recommendation.imageUrl}
                    alt={recommendation.name}
                    className="w-full h-full object-contain"
                />
                ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                    <PhoneIcon className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                </div>
                )}
            </div>
            <div className="flex-1">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{recommendation.name}</h4>
                <div className="mt-2">
                    <Rating rating={rating} />
                </div>
                <p className="mt-3 text-gray-600 dark:text-gray-300 leading-relaxed">{recommendation.justification}</p>
                <div className="mt-6">
                    <button
                        onClick={handleFindStores}
                        disabled={isLoadingStores}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 dark:disabled:bg-gray-600"
                    >
                         {isLoadingStores ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                         ) : (
                            <MapPinIcon className="w-5 h-5" />
                         )}
                        Find Nearby Stores
                    </button>
                    {storeError && <p className="text-red-500 text-sm mt-2">{storeError}</p>}
                    {stores && <StoreList stores={stores} />}
                </div>
            </div>
            </div>
        </div>
    );
};

const LoadingSkeleton: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4 animate-pulse-fast"></div>
        <div className="flex flex-col sm:flex-row gap-6">
            <div className="flex-shrink-0 w-full sm:w-1/3 h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse-fast"></div>
            <div className="flex-1 space-y-4 py-1">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse-fast"></div>
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse-fast"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse-fast"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse-fast"></div>
                </div>
            </div>
        </div>
    </div>
);


export const RecommendationSection: React.FC<{ 
    recommendations: RecommendationResponse | null; 
    isLoading: boolean;
    getAverageRatingForPhone: (phoneName: string) => number;
}> = ({ recommendations, isLoading, getAverageRatingForPhone }) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Your Personalized Recommendations</h2>
        <LoadingSkeleton title="Primary Recommendation" />
        <LoadingSkeleton title="Runner-up" />
      </div>
    );
  }

  if (!recommendations) {
    return null;
  }

  return (
    <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Your Personalized Recommendations</h2>
        <div className="space-y-6">
            <RecommendationCard 
              recommendation={recommendations.primary} 
              title="Primary Recommendation"
              rating={getAverageRatingForPhone(recommendations.primary.name)}
            />
            {recommendations.runnerUp && (
                <RecommendationCard 
                  recommendation={recommendations.runnerUp} 
                  title="Runner-up"
                  rating={getAverageRatingForPhone(recommendations.runnerUp.name)}
                />
            )}
        </div>
    </div>
  );
};