Status (initial)

Stack: Next.js + TypeScript (OK). Tester: npm test (TBD konfiguration). Node LTS TBD.

Datakällor: GA4 propertyId TBD. CrUX API key TBD. GA4_PROPERTY_ID env variabel för top pages data.

Caching: In-memory/kv (TBD val; Redis föreslås).

Tidsram v1: 4–6 veckor (TBD exakt).

Öppna frågor

GA4 property-ID samt exakta metrik/dimensioner för första widgets.


CrUX API integration: Chrome UX Report API för Core Web Vitals data (LCP, INP, CLS p75 värden för mobil/desktop). Kräver CRUX_API_KEY env variabel.

Val av cache (Redis/Upstash vs Edge-cache vs in-process).


Exakta success-trösklar (paritets-% per KPI).

Om AI-insikter i v1: minimal summarizer på datasetet eller vänta v1.1?

Nästa steg (tekniska)

Skapa kontraktstyper, resolver-skeletton, dummy-clients, och minimal tidsserie-widget.

Sätta upp test-rigg med fixtures för GA4.

---

Bevego GA4 – Sektion 3 alignment (signals)

- Trafik & Användare
  - Signals: `summary.sessions`, `summary.totalUsers`, `summary.returningUsers`, `summary.engagedSessions`, `summary.engagementRatePct`, `summary.avgEngagementTimeSec`, `summary.pageviews`, `timeseries[*]` for samma nycklar.
  - Reagerar på UI-state: `range(start,end,comparisonMode)`, `channel`, `device`, `audience(role)`, `unit` via `/api/ga4/overview` params.

- Trafikfördelning
  - Signals: `channels[]`, `devices[]`, `cities[]`, `summary.sessions` (för % av total i donuts/tabeller).
  - Referral pages Top 10: TODO – saknas i `OverviewPayload`; kräver ny endpoint eller utökad respons (kolumner: Page, Sessions, % av total, Δ period).

- Beteende
  - Signals: `weekdayHour[]` (heatmap), `timeseries[*]` för mini-trender: `avgEngagementTimeSec`, `engagementRatePct`, beräknad `pagesPerSession = pageviews/sessions`.
  - Bounce rate: TODO – om signal finns i state, visa total + per vald sektion.

A11y
- Sektionstitlar är semantiska `<h2>` via `SectionLayout`; grafer/tablåer har titlar via `AnalyticsBlock` och beskrivningar.

Tester
- Minimal render/snapshot tests: TODO – test-infrastruktur saknas i repo; inför vid nästa steg utan att ändra build-konfigurationen.