import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type GhostButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "default" | "danger" | "primary";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const variants = {
  default: "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-800",
  danger: "text-red hover:text-red-700 hover:bg-red-light-6 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20",
  primary: "text-primary hover:text-primary-700 hover:bg-primary/10 dark:text-primary-400 dark:hover:text-primary-300 dark:hover:bg-primary/20",
};

const sizes = {
  sm: "h-8 w-8 p-1",
  md: "h-9 w-9 p-1.5", 
  lg: "h-10 w-10 p-2",
};

export function GhostButton({
  children,
  variant = "default",
  size = "md", 
  className,
  ...props
}: GhostButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
