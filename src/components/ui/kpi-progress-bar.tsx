"use client";

import { cn } from "@/lib/utils";

type KpiProgressBarProps = {
  progress: number; // 0-100
  goal: number;
  unit?: string;
  className?: string;
};

export function KpiProgressBar({ progress, goal, unit = "", className }: KpiProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const remainingPct = Math.max(0, 100 - clampedProgress);
  const isComplete = clampedProgress >= 100;
  
  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <div 
        className="w-full h-2 bg-gray-200 dark:bg-dark-3 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progress: ${clampedProgress.toFixed(1)}% of goal`}
      >
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out motion-reduce:transition-none",
            isComplete 
              ? "bg-green" 
              : "bg-red"
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-dark-5">
        <span>
          {isComplete ? "Mål uppnått!" : `${clampedProgress.toFixed(0)}% uppnått`}
        </span>
        <span>
          {goal.toLocaleString('sv-SE')}{unit}
        </span>
      </div>
    </div>
  );
}
