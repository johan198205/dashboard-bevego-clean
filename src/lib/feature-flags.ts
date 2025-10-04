// Feature flags for UI functionality
// TODO: Set to true to re-enable Konverteringar section
export const FEATURE_FLAGS = {
  conversions: false, // Set to true to enable Konverteringar section
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
