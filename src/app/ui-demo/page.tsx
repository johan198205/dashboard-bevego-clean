"use client";

import { ScoreCard } from "@/components/ui/scorecard";
import { ModernTable } from "@/components/Tables/modern-table";
import { StatusPill } from "@/components/ui/status-pill";
import { GhostButton } from "@/components/ui/ghost-button";
import { PencilSquareIcon, TrashIcon, UserIcon, GlobeIcon } from "@/assets/icons";
import { Views, Profit, Product, Users } from "@/app/(home)/_components/overview-cards/icons";

export default function UIDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-dark dark:text-white mb-2">
            Riksbyggen UI Components Demo
          </h1>
          <p className="text-dark-6 dark:text-dark-4">
            Modern, consistent UI components following Riksbyggen's design system
          </p>
        </div>

        {/* ScoreCards Section */}
        <section>
          <h2 className="text-2xl font-semibold text-dark dark:text-white mb-6">
            ScoreCards / KPI Cards
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <ScoreCard
              label="Total Views"
              value="42,643"
              growthRate={0.45}
              Icon={Views}
              variant="success"
              source="GA4 API"
            />
            <ScoreCard
              label="Total Sessions"
              value="143K"
              growthRate={2.76}
              Icon={GlobeIcon}
              variant="primary"
              source="GA4 API"
            />
            <ScoreCard
              label="Bounce Rate"
              value="91.6%"
              growthRate={-3.85}
              Icon={UserIcon}
              variant="warning"
              source="GA4 API"
            />
            <ScoreCard
              label="Avg Session Duration"
              value="2m 27s"
              growthRate={-2.44}
              Icon={Product}
              variant="error"
              source="GA4 API"
            />
          </div>
        </section>

        {/* Status Pills Section */}
        <section>
          <h2 className="text-2xl font-semibold text-dark dark:text-white mb-6">
            Status Pills
          </h2>
          <div className="flex flex-wrap gap-4">
            <StatusPill variant="success">Active</StatusPill>
            <StatusPill variant="warning">Pending</StatusPill>
            <StatusPill variant="error">Blocked</StatusPill>
            <StatusPill variant="info">Processing</StatusPill>
            <StatusPill variant="neutral">Inactive</StatusPill>
          </div>
        </section>

        {/* Ghost Buttons Section */}
        <section>
          <h2 className="text-2xl font-semibold text-dark dark:text-white mb-6">
            Ghost Action Buttons
          </h2>
          <div className="flex flex-wrap gap-4">
            <GhostButton variant="default" size="sm">
              <PencilSquareIcon className="h-4 w-4" />
            </GhostButton>
            <GhostButton variant="danger" size="sm">
              <TrashIcon className="h-4 w-4" />
            </GhostButton>
            <GhostButton variant="primary" size="md">
              <UserIcon className="h-5 w-5" />
            </GhostButton>
            <GhostButton variant="default" size="lg">
              <GlobeIcon className="h-6 w-6" />
            </GhostButton>
          </div>
        </section>

        {/* Modern Table Section */}
        <section>
          <h2 className="text-2xl font-semibold text-dark dark:text-white mb-6">
            Modern Table with Status Pills & Ghost Actions
          </h2>
          <ModernTable />
        </section>

        {/* Color Palette Section */}
        <section>
          <h2 className="text-2xl font-semibold text-dark dark:text-white mb-6">
            Riksbyggen Color Palette
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <h3 className="font-medium text-dark dark:text-white">Primary</h3>
              <div className="space-y-1">
                <div className="h-12 bg-primary rounded flex items-center justify-center text-white font-medium">
                  #E01E26
                </div>
                <div className="h-8 bg-primary/10 rounded flex items-center justify-center text-primary font-medium">
                  Light
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-dark dark:text-white">Success</h3>
              <div className="space-y-1">
                <div className="h-12 bg-green rounded flex items-center justify-center text-white font-medium">
                  #22AD5C
                </div>
                <div className="h-8 bg-green-light-6 rounded flex items-center justify-center text-green font-medium">
                  Light
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-dark dark:text-white">Warning</h3>
              <div className="space-y-1">
                <div className="h-12 bg-yellow-dark rounded flex items-center justify-center text-white font-medium">
                  #F59E0B
                </div>
                <div className="h-8 bg-yellow-light-4 rounded flex items-center justify-center text-yellow-dark font-medium">
                  Light
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-dark dark:text-white">Error</h3>
              <div className="space-y-1">
                <div className="h-12 bg-red rounded flex items-center justify-center text-white font-medium">
                  #F23030
                </div>
                <div className="h-8 bg-red-light-6 rounded flex items-center justify-center text-red font-medium">
                  Light
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Summary */}
        <section className="bg-white dark:bg-gray-dark rounded-lg p-6 shadow-sm border border-stroke dark:border-dark-3">
          <h2 className="text-2xl font-semibold text-dark dark:text-white mb-4">
            UI Improvements Summary
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="font-medium text-dark dark:text-white mb-2">ScoreCards</h3>
              <ul className="text-sm text-dark-6 dark:text-dark-4 space-y-1">
                <li>• Accent bar with brand colors</li>
                <li>• Icon badges with proper theming</li>
                <li>• YoY growth chips in corner</li>
                <li>• Source attribution</li>
                <li>• Multiple variants (success, warning, error, info)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-dark dark:text-white mb-2">Tables</h3>
              <ul className="text-sm text-dark-6 dark:text-dark-4 space-y-1">
                <li>• Sticky headers for better navigation</li>
                <li>• Zebra striping for readability</li>
                <li>• Status pills for data states</li>
                <li>• Ghost action buttons</li>
                <li>• Improved typography and spacing</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-dark dark:text-white mb-2">Charts</h3>
              <ul className="text-sm text-dark-6 dark:text-dark-4 space-y-1">
                <li>• Clear Current vs Comparison distinction</li>
                <li>• Dashed lines for comparison data</li>
                <li>• Improved legend positioning</li>
                <li>• Better color contrast</li>
                <li>• Consistent typography</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-dark dark:text-white mb-2">Accessibility</h3>
              <ul className="text-sm text-dark-6 dark:text-dark-4 space-y-1">
                <li>• WCAG AA compliant colors</li>
                <li>• Proper aria-labels on buttons</li>
                <li>• Focus states maintained</li>
                <li>• Screen reader friendly</li>
                <li>• Keyboard navigation support</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
