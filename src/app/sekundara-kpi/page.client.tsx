"use client";
import ProductCategoryBlock from "./sections/ProductCategoryBlock";
import FunnelBlock from "./sections/FunnelBlock";
import ChannelsBlock from "./sections/ChannelsBlock";
import EngagementBlock from "./sections/EngagementBlock";

export default function SekundaraKpiPage() {
  return (
    <div className="space-y-8" role="main" aria-label="Sekundära KPI:er dashboard">
      {/* Page Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Sekundära KPI:er – Analys & Optimering
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Förstå drivkrafter och flaskhalsar längs resan och per kanal/kategori
        </p>
      </header>

      <section aria-labelledby="product-category-heading" aria-describedby="product-category-description">
        <ProductCategoryBlock />
      </section>

      <section aria-labelledby="funnel-heading" aria-describedby="funnel-description">
        <FunnelBlock />
      </section>

      <section aria-labelledby="channels-heading" aria-describedby="channels-description">
        <ChannelsBlock />
      </section>

      <section aria-labelledby="engagement-heading" aria-describedby="engagement-description">
        <EngagementBlock />
      </section>
    </div>
  );
}


