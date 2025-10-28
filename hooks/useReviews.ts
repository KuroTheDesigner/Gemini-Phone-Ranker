import { useState, useCallback, useEffect } from 'react';
import type { Review } from '../types';

type ReviewsState = {
  [phoneName: string]: Review[];
};

const STORAGE_KEY = 'phoneReviews';

export const useReviews = () => {
  const [reviews, setReviews] = useState<ReviewsState>({});

  useEffect(() => {
    try {
      const storedReviews = localStorage.getItem(STORAGE_KEY);
      if (storedReviews) {
        setReviews(JSON.parse(storedReviews));
      }
    } catch (error) {
      console.error("Failed to parse reviews from localStorage", error);
    }
  }, []);

  const saveReviews = (updatedReviews: ReviewsState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReviews));
      setReviews(updatedReviews);
    } catch (error) {
      console.error("Failed to save reviews to localStorage", error);
    }
  };

  const addReview = useCallback((phoneName: string, review: Review) => {
    const updatedReviews = { ...reviews };
    const phoneReviews = updatedReviews[phoneName] || [];
    updatedReviews[phoneName] = [...phoneReviews, review];
    saveReviews(updatedReviews);
  }, [reviews]);

  const getReviewsForPhone = useCallback((phoneName: string): Review[] => {
    return reviews[phoneName] || [];
  }, [reviews]);

  const getAverageRatingForPhone = useCallback((phoneName: string): number => {
    const phoneReviews = reviews[phoneName];
    if (!phoneReviews || phoneReviews.length === 0) {
      return 0;
    }
    const total = phoneReviews.reduce((sum, review) => sum + review.rating, 0);
    return total / phoneReviews.length;
  }, [reviews]);

  return { reviews, addReview, getReviewsForPhone, getAverageRatingForPhone };
};
