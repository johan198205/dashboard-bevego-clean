import { CheckIcon, XIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";
import { useId } from "react";

type PropsType = {
  withIcon?: boolean;
  background?: "dark" | "light";
  backgroundSize?: "sm" | "default";
  name?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  ariaLabel?: string;
};

export function Switch({
  background,
  withIcon,
  backgroundSize,
  name,
  checked,
  onChange,
  ariaLabel,
}: PropsType) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="flex max-w-fit cursor-pointer select-none items-center"
    >
      <div className="relative">
        <input 
          type="checkbox" 
          name={name} 
          id={id} 
          className="peer sr-only" 
          checked={checked}
          onChange={(e) => onChange?.(e.target.checked)}
          aria-label={ariaLabel}
        />
        <div
          className={cn(
            "rounded-full bg-gray-3 dark:bg-dark-3 h-8 w-14",
            {
              "h-5 w-10": backgroundSize === "sm",
              "bg-[#212B36] dark:bg-primary": background === "dark",
            }
          )}
        />

        <div
          className={cn(
            "absolute flex items-center justify-center rounded-full bg-white shadow-switch-1 transition peer-checked:[&_.check-icon]:block peer-checked:[&_.x-icon]:hidden",
            {
              // Default track (h-8 w-14): use translate for smooth slide
              "left-1 top-1 size-6 peer-checked:translate-x-full peer-checked:right-1": backgroundSize !== "sm",
              // Small track (h-5 w-10): use explicit left/right without translate
              "top-0.5 left-0.5 size-4 shadow-switch-2 peer-checked:left-auto peer-checked:right-0.5": backgroundSize === "sm",
              "peer-checked:bg-primary peer-checked:dark:bg-white": background !== "dark",
            }
          )}
        >
          {withIcon && (
            <>
              <CheckIcon className="check-icon hidden fill-white dark:fill-dark" />
              <XIcon className="x-icon" />
            </>
          )}
        </div>
      </div>
    </label>
  );
}
