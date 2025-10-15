// Feature flags for UI functionality
// TODO: Set to true to re-enable Konverteringar section
export const FEATURE_FLAGS = {
  conversions: false, // Set to true to enable Konverteringar section
  // Header UI elements
  headerSearch: false, // Set to true to show search field in header
  headerThemeToggle: false, // Set to true to show theme toggle in header
  headerNotifications: false, // Set to true to show notifications in header
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
