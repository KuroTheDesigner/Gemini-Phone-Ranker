import type { Phone } from './types';

export const PHONE_SPECS: (keyof Phone)[] = [
  "Price",
  "CPU",
  "Battery",
  "Screen Tech",
  "Cameras",
  "Refresh Rate",
  "Screen Size",
  "Charging Speed",
  "Wireless Charging",
  "Video Recording",
  "Screen Resolution",
  "3.5mm Jack",
  "SIM Slots"
];

// PHONE_DATA is removed as the application will now dynamically generate phone lists using the AI pipeline.
// If you need a default list, consider adding it via the ListGenerator component.