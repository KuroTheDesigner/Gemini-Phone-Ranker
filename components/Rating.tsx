import React from 'react';
import { StarIcon } from './icons';

interface RatingProps {
  rating: number;
  maxRating?: number;
}

export const Rating: React.FC<RatingProps> = ({ rating, maxRating = 5 }) => {
  if (rating === 0) {
    return <span className="text-sm text-gray-500 dark:text-gray-400">No reviews yet</span>;
  }

  return (
    <div className="flex items-center">
      {Array.from({ length: maxRating }, (_, index) => (
        <StarIcon
          key={index}
          className={`w-5 h-5 ${rating > index ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-500'}`}
          filled={rating > index}
        />
      ))}
      <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">{rating.toFixed(1)} / {maxRating}</span>
    </div>
  );
};
