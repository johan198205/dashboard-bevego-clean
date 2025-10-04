"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type AnalyticsBlockProps = {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
  icon?: ReactNode;
};

export function AnalyticsBlock({ title, description, headerRight, children, className, icon }: AnalyticsBlockProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[5px] bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3",
        "px-6 py-5",
        className
      )}
    >
      {/* Corner Icon */}
      {icon && (
        <div className="absolute top-4 right-4 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 flex items-center justify-center">
          <div className="text-red-500 dark:text-red-400">
            {icon}
          </div>
        </div>
      )}

      {(title || description || headerRight) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && (
              <h3 className="text-base font-bold text-neutral-700 dark:text-white truncate">{title}</h3>
            )}
            {description && (
              <p className="text-sm text-neutral-500 dark:text-dark-5 mt-0.5">{description}</p>
            )}
          </div>
          {headerRight}
        </div>
      )}
      {children}
    </div>
  );
}


