export interface Verification {
  status: 'Verified' | 'Minor Discrepancy' | 'Unverified';
  notes: string;
  sources: string[];
}

export interface Phone {
  [key: string]: string | number | boolean | Verification | undefined;
  Name: string;
  Price: number | string;
  Currency: string;
  CPU: string;
  Battery: string;
  "Screen Tech": string;
  Cameras: string;
  "Refresh Rate": string;
  "Screen Size": string;
  "Charging Speed": string;
  "Wireless Charging": boolean;
  "Video Recording": string;
  "Screen Resolution": string;
  "3.5mm Jack": boolean;
  "SIM Slots": string;
  verification?: Verification;
}

export interface Recommendation {
  name: string;
  justification: string;
}

export interface RecommendationWithImage extends Recommendation {
  imageUrl: string | null;
}

export interface RecommendationResponse {
  primary: RecommendationWithImage;
  runnerUp: RecommendationWithImage | null;
}

export interface GeminiRecommendation {
    phoneName: string;
    justification: string;
}

export interface GeminiResponse {
    primaryRecommendation: GeminiRecommendation;
    runnerUp?: GeminiRecommendation;
}

export interface Review {
  author: string;
  rating: number;
  comment: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'loading';
  content: string;
  isThinking?: boolean;
}

export interface StoreDetails {
  name: string;
  mapsUrl: string;
  price: string | null;
  phoneNumber: string | null;
  placeId: string;
}

export interface TranscriptEntry {
  speaker: 'user' | 'model';
  text: string;
}

export interface PhoneConstraints {
  price_min?: number;
  price_max?: number;
  currency?: string;
  primary_use_case?: string; // e.g., "gaming", "photography", "general use"
  required_features?: string[]; // e.g., "high refresh rate", "large battery", "good camera"
  excluded_brands?: string[];
  target_brands?: string[];
  model_series?: string[]; // e.g., ["Galaxy S", "iPhone Pro"]
  release_year_min?: number;
  exclude_latest_generation?: boolean;
}