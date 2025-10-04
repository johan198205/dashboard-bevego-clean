import { CwvStatus } from '@/lib/types';
import { ScoreCard } from '@/components/ui/scorecard';
import { JSX, SVGProps } from 'react';

// Simple performance icon
function PerformanceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
        fill="currentColor"
      />
    </svg>
  );
}

type CwvCardProps = {
  title: string;
  value: string;
  target: string;
  status: CwvStatus;
  description?: string;
  Icon?: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

function getStatusVariant(status: CwvStatus): "default" | "primary" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case 'Pass':
      return 'success';
    case 'Needs Improvement':
      return 'warning';
    case 'Fail':
      return 'error';
  }
}

function getStatusText(status: CwvStatus): string {
  switch (status) {
    case 'Pass':
      return 'Pass';
    case 'Needs Improvement':
      return 'Behöver förbättring';
    case 'Fail':
      return 'Misslyckad';
  }
}

export default function CwvCard({ title, value, target, status, description, Icon }: CwvCardProps) {
  return (
    <div className="relative">
      {/* Card */}
      <div className="relative">
        <ScoreCard
          label={title}
          value={value}
          Icon={Icon || PerformanceIcon}
          variant={getStatusVariant(status)}
          source="Mock"
          className="pb-16"
        />
        {/* Inline meta inside card - bottom-left */}
        <div className="absolute left-6 bottom-4 text-xs text-black dark:text-white space-y-1 pointer-events-none">
          <div>Mål: {target}</div>
          {description && (
            <div>{description}</div>
          )}
        </div>
        {/* Status badge in bottom-right corner */}
        <div className="absolute bottom-4 right-4 pointer-events-none">
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
            status === 'Pass' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
            status === 'Needs Improvement' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
            'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {getStatusText(status)}
          </span>
        </div>
      </div>
    </div>
  );
}
