import { cn } from "@/lib/utils";

type StatusPillProps = {
  children: React.ReactNode;
  variant: "success" | "warning" | "error" | "info" | "neutral";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const statusVariants = {
  success: "bg-green-light-6 text-green border-green/20 shadow-sm",
  warning: "bg-yellow-light-4 text-yellow-dark border-yellow-dark/20 shadow-sm", 
  error: "bg-red-light-6 text-red border-red/20 shadow-sm",
  info: "bg-blue-light-5 text-blue border-blue/20 shadow-sm",
  neutral: "bg-neutral-100 text-neutral-600 border-neutral-200 shadow-sm",
};

const sizeVariants = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm", 
  lg: "px-3 py-1.5 text-base",
};

export function StatusPill({ 
  children, 
  variant, 
  size = "md",
  className 
}: StatusPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        statusVariants[variant],
        sizeVariants[size],
        className
      )}
    >
      {children}
    </span>
  );
}
