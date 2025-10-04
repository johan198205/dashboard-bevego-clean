## GA4 API – host‑filter

- Alla anrop till GA4 Data API ska filtreras på `hostName = bevego.se`.
- Gäller både totalsiffror och tidsserier.
- Syfte: isolera trafik för Mitt Riksbyggen och undvika att andra hosts påverkar KPI:er.

Touch only: filer listade i varje uppgift/prompt.

Unified diffs only; inga hela filers ersättning om inte nyskap.

Smallest possible change; inga orelaterade refactors.

Leave TODO if uncertain; stop.

Keep public APIs stable.

UI är single source of truth för datakälla; inga server-overrides.

Ändra inte configs/linters/CI utan explicit tillåtelse.

Timezone konsistens: alltid Europe/Stockholm i API-range.

Labela källa på varje widget och visa explainer.