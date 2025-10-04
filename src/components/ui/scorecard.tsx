"use client";

import { ArrowDownIcon, ArrowUpIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";
import type { JSX, SVGProps, ComponentType } from "react";
import { MiniSparkline } from "./mini-sparkline";
import { KpiProgressBar } from "./kpi-progress-bar";

type ScoreCardProps = {
  label: string;
  value: number | string;
  growthRate?: number;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  source?: string;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "info";
  className?: string;
  onClick?: () => void; // optional, non-breaking
  // Optional provider for inline sparkline
  getSeries?: (args: { start: string; end: string; grain: any; filters: any }) => Promise<{ x: number; y: number }[]>;
  size?: "default" | "compact";
  appearance?: "default" | "analytics"; // New appearance variant for analytics cards
  comparisonLabel?: string | null; // For delta chip text like "vs. previous month"
  // Progress bar props
  showProgress?: boolean;
  progressGoal?: number;
  progressUnit?: string;
};

// Metric-specific color tokens for analytics appearance - all using red theme
const metricColors = {
  sessions: { bg: "bg-red-100", icon: "text-red-600" },
  engagedSessions: { bg: "bg-red-100", icon: "text-red-600" },
  activeUsers: { bg: "bg-red-100", icon: "text-red-600" },
  pageviews: { bg: "bg-red-100", icon: "text-red-600" },
  engagementRate: { bg: "bg-red-100", icon: "text-red-600" },
  avgEngagementTime: { bg: "bg-red-100", icon: "text-red-600" },
  default: { bg: "bg-red-100", icon: "text-red-600" },
};

const variantStyles = {
  default: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
  },
  primary: {
    accentBar: "bg-red",
    iconBg: "bg-red/10", 
    iconColor: "text-red",
  },
  success: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
  },
  warning: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
  },
  error: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
  },
  info: {
    accentBar: "bg-red",
    iconBg: "bg-red/10",
    iconColor: "text-red",
  },
};

export function ScoreCard({ 
  label, 
  value, 
  growthRate, 
  Icon, 
  source,
  variant = "default",
  className,
  onClick,
  getSeries,
  size = "default",
  appearance = "default",
  comparisonLabel = "vs. previous period",
  showProgress = false,
  progressGoal,
  progressUnit = "",
}: ScoreCardProps) {
  const isDecreasing = growthRate !== undefined && growthRate < 0;
  const styles = variantStyles[variant];
  const isCompact = size === "compact";
  const isAnalytics = appearance === "analytics";

  // Get metric-specific colors for analytics appearance - always return red theme
  const getMetricColor = (label: string) => {
    // Always return red theme for all metrics
    return metricColors.default;
  };

  const metricColor = isAnalytics ? getMetricColor(label) : null;

  // Force analytics layout for all cards
  const forceAnalytics = true;

  // Calculate progress percentage for progress bar
  const calculateProgress = () => {
    if (!showProgress || !progressGoal) return 0;
    
    let numericValue: number;
    
    if (typeof value === 'string') {
      // Handle different string formats
      if (value.includes('/')) {
        // Handle percentage format
        const parts = value.split('/');
        numericValue = parseFloat(parts[0]?.trim() || '0');
      } else {
        // Handle formatted numbers like "37 834" or "177 961"
        numericValue = parseFloat(value.replace(/[^\d.-]/g, ''));
      }
    } else {
      numericValue = value;
    }
    
    if (isNaN(numericValue)) return 0;
    
    return (numericValue / progressGoal) * 100;
  };

  const progressPercentage = showProgress ? calculateProgress() : 0;
  
  // Analytics appearance layout (matches mockup exactly)
  if (forceAnalytics) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-[5px] bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3",
          "transition-transform transition-shadow duration-200 ease-out will-change-transform motion-reduce:transition-none motion-reduce:transform-none",
          "hover:shadow-md hover:border-primary/30 motion-reduce:hover:shadow-sm",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          "hover:scale-[1.01] focus-visible:scale-[1.01] motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100",
          onClick ? "cursor-pointer" : "",
          "px-6 py-5",
          className
        )}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        aria-label={onClick ? `${label} – öppna detaljer` : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (!onClick) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick();
          }
        }}
      >
        <div className="flex items-start justify-between">
          {/* Left column: Label, Value, Delta chip */}
          <div className="flex-1 min-w-0">
            {/* Label */}
            <div className="text-base font-bold text-neutral-600 dark:text-dark-5 mb-1">
              {label}
            </div>
            
            {/* Large Value */}
            <div className="text-4xl font-semibold text-neutral-900 dark:text-white leading-none mb-2">
              {value}
            </div>
            
            {/* Delta chip */}
            {growthRate !== undefined && comparisonLabel && (
              <div className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
                isDecreasing 
                  ? "bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" 
                  : "bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
              )}>
                {isDecreasing ? (
                  <ArrowDownIcon className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <ArrowUpIcon className="h-3 w-3" aria-hidden="true" />
                )}
                {Math.abs(growthRate).toFixed(2)}%
                <span className="text-neutral-600 dark:text-dark-5 ml-1">
                  {comparisonLabel}
                </span>
              </div>
            )}
          </div>

          {/* Right column: Icon badge */}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg shadow-sm bg-red-100 dark:bg-red-900/30">
            <Icon className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
        </div>

        {/* Progress bar */}
        {showProgress && progressGoal && (
          <div className="mt-4">
            <KpiProgressBar 
              progress={progressPercentage}
              goal={progressGoal}
              unit={progressUnit}
            />
          </div>
        )}
      </div>
    );
  }

  // Default appearance (existing layout)
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3",
        // Subtle affordance on hover/focus while respecting reduced motion
        "transition-transform transition-shadow duration-200 ease-out will-change-transform motion-reduce:transition-none motion-reduce:transform-none",
        "hover:shadow-md hover:border-primary/30 motion-reduce:hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        "hover:scale-[1.01] focus-visible:scale-[1.01] motion-reduce:hover:scale-100 motion-reduce:focus-visible:scale-100",
        onClick ? "cursor-pointer" : "",
        isCompact ? "py-3" : "",
        className
      )}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `${label} – öppna detaljer` : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Accent bar - thicker and more prominent */}
      <div className={cn("absolute left-0 top-0 h-full w-1.5", styles.accentBar)} />
      
      <div className={cn("p-4", isCompact && "p-2") }>
        {/* Header with icon and YoY chip */}
        <div className={cn("flex items-start justify-between", isCompact ? "mb-1" : "mb-4") }>
          <div className={cn(
            isCompact ? "flex h-8 w-8 items-center justify-center rounded-lg shadow-sm" : "flex h-10 w-10 items-center justify-center rounded-lg shadow-sm",
            styles.iconBg
          )}>
            <Icon className={cn(isCompact ? "h-4 w-4" : "h-5 w-5", styles.iconColor)} />
          </div>
          
          {/* YoY chip - improved styling */}
          {growthRate !== undefined && (
            <div className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold shadow-sm",
              isDecreasing 
                ? "bg-red-light-6 text-red border border-red/20" 
                : "bg-green-light-6 text-green border border-green/20"
            )}>
              {isDecreasing ? (
                <ArrowDownIcon className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowUpIcon className="h-3 w-3" aria-hidden="true" />
              )}
              {Math.abs(growthRate).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Main content */}
        <div className={cn("space-y-1.5", isCompact && "space-y-0") }>
          <div className={cn(isCompact ? "text-lg" : "text-2xl", "font-bold text-dark dark:text-white tracking-tight") }>
            {value}
          </div>
          <div className={cn(isCompact ? "text-xs" : "text-base", "font-semibold text-dark dark:text-white/90") }>
            {label}
          </div>
        </div>

        {/* Inline sparkline reflecting active filters & date range */}
        {getSeries && (
          <MiniSparkline
            getSeries={getSeries}
            className={cn(isCompact ? "mt-1" : "mt-2")}
            colorClassName={styles.iconColor.replace("text-", "text-")}
            height={isCompact ? 20 : 28}
            amplify={3}
          />
        )}

        {/* Source attribution with info icon */}
        {source && (
          <div className={cn("flex items-center gap-1 text-xs text-dark-5 dark:text-dark-6", isCompact ? "mt-1" : "mt-4") }>
            <div className="h-3 w-3 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center">
              <span className="text-[8px] font-bold">i</span>
            </div>
            Källa: {source}
          </div>
        )}
      </div>
    </div>
  );
}
