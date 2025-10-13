"use client";
import { LeadsBlock } from "./primara-kpi/_components/LeadsBlock";
import { SalesBlock } from "./primara-kpi/_components/SalesBlock";
import { EfficiencyBlock } from "./primara-kpi/_components/EfficiencyBlock";

export default function ClientHome() {
  return (
    <div className="space-y-8" role="main" aria-label="Primära KPI:er dashboard">
      {/* Page Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Primära KPI:er
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Affärsöversikt och måluppföljning för leads, försäljning och effektivitet
        </p>
      </header>

      {/* Leads & Förfrågningar Block */}
      <section aria-labelledby="leads-heading" aria-describedby="leads-description">
        <LeadsBlock />
      </section>

      {/* Försäljning & Intäkter Block */}
      <section aria-labelledby="sales-heading" aria-describedby="sales-description">
        <SalesBlock />
      </section>

      {/* Effektivitet Block */}
      <section aria-labelledby="efficiency-heading" aria-describedby="efficiency-description">
        <EfficiencyBlock />
      </section>
    </div>
  );
}


