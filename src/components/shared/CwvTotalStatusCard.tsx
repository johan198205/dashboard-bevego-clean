import type { JSX, SVGProps } from "react";
import { CwvStatus } from "@/lib/types";
import { Gauge } from "@/components/ui/gauge";
import { cn } from "@/lib/utils";

type PropsType = {
  label: string;
  data: {
    value: string;
    percentage: number;
    status: CwvStatus;
    target: string;
    description: string;
  };
  Icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
  comparisonLabel?: string;
};


export function CwvTotalStatusCard({ label, data, comparisonLabel = "vs. previous period", ...rest }: PropsType & { onClick?: () => void }) {
  const pct = Math.max(0, Math.min(100, data.percentage));
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[5px] bg-white shadow-sm border border-stroke dark:bg-gray-dark dark:border-dark-3",
        "px-6 py-5"
      )}
      onClick={rest.onClick}
      role={rest.onClick ? "button" : undefined}
      tabIndex={rest.onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="text-base font-bold text-neutral-600 dark:text-dark-5">{label}</div>
      </div>
      <div className="flex items-center gap-6">
        <Gauge valuePct={pct} size={180} />
        <div>
          <div className="text-4xl font-semibold text-neutral-900 dark:text-white leading-none mb-2">
            {data.value}
          </div>
          <div className="text-sm text-neutral-600 dark:text-dark-5">{data.description}</div>
          <div className="mt-2 inline-flex items-center gap-2 text-xs text-neutral-600 dark:text-dark-5">
            <span className="rounded-full bg-yellow-50 text-yellow-700 px-2 py-1 border border-yellow-200">
              {data.target}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
