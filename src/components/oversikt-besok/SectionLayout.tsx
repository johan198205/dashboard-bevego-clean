'use client';

import { PropsWithChildren } from 'react';

type Props = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
};

export default function SectionLayout({ title, description, actions, className, children }: PropsWithChildren<Props>) {
  return (
    <section aria-labelledby={title.replace(/\s+/g, '-').toLowerCase()} className={className}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 id={title.replace(/\s+/g, '-').toLowerCase()} className="text-xl font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {/* Description hidden globally per request */}
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>
      <div className="space-y-6">
        {children}
      </div>
    </section>
  );
}


