/**
 * Riksbyggen Brand Theme Tokens
 * Centralized color and design tokens for consistent UI theming
 */

export const brandColors = {
  // Primary brand colors
  primary: {
    DEFAULT: "#E01E26", // Riksbyggen red
    50: "#FEF2F2",
    100: "#FEE2E2", 
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#E01E26", // Main brand color
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },
  
  // Accent colors for variety
  accent: {
    blue: "#3C50E0",
    green: "#22AD5C", 
    orange: "#F59460",
    purple: "#8155FF",
  },
  
  // Status colors
  status: {
    success: {
      DEFAULT: "#22AD5C",
      light: "#E9FBF0",
      text: "#004434",
    },
    warning: {
      DEFAULT: "#F59E0B", 
      light: "#FFFBEB",
      text: "#9D5425",
    },
    error: {
      DEFAULT: "#F23030",
      light: "#FEF3F3", 
      text: "#BC1C21",
    },
    info: {
      DEFAULT: "#3C50E0",
      light: "#E1E8FF",
      text: "#1C3FB7",
    },
  },
  
  // Neutral colors
  neutral: {
    50: "#F9FAFB",
    100: "#F3F4F6", 
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2A37",
    900: "#111928",
  },
} as const;

export const chartColors = {
  primary: brandColors.primary.DEFAULT,
  secondary: brandColors.accent.blue,
  success: brandColors.status.success.DEFAULT,
  warning: brandColors.status.warning.DEFAULT,
  error: brandColors.status.error.DEFAULT,
  info: brandColors.status.info.DEFAULT,
  neutral: brandColors.neutral[500],
  muted: brandColors.neutral[400],
} as const;

/**
 * Riksbyggen Chart Color Palette
 * Monochromatic red palette for cohesive brand visualization
 */
export const riksbyggenChartPalette = [
  "#E01E26", // Primary Riksbyggen red (darkest/most saturated)
  "#F23030", // Bright red
  "#F87171", // Light red
  "#FCA5A5", // Lighter red
  "#FECACA", // Very light red
  "#FEE2E2", // Pale red
  "#DC2626", // Deep red (alternative)
  "#B91C1C", // Darker red
  "#991B1B", // Very dark red
  "#7F1D1D", // Darkest red
] as const;

/**
 * Get chart colors for a specific number of data points
 * Returns appropriate red shades based on data length
 */
export function getChartColors(count: number): string[] {
  if (count <= 3) {
    // For small datasets, use well-spaced colors
    return ["#E01E26", "#F87171", "#FCA5A5"];
  } else if (count <= 6) {
    // Medium datasets
    return ["#E01E26", "#F23030", "#F87171", "#FCA5A5", "#FECACA", "#DC2626"];
  } else {
    // Large datasets - use full palette
    return riksbyggenChartPalette.slice(0, Math.min(count, riksbyggenChartPalette.length));
  }
}

export const spacing = {
  xs: "0.25rem",
  sm: "0.5rem", 
  md: "1rem",
  lg: "1.5rem",
  xl: "2rem",
  "2xl": "3rem",
} as const;

export const borderRadius = {
  sm: "0.25rem",
  md: "0.5rem",
  lg: "0.75rem", 
  xl: "1rem",
  full: "9999px",
} as const;

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
} as const;

