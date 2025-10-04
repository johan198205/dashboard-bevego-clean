Syfte
Minsta möjliga ändringar per iteration (PDD). Spec → Test → Kod. Håll publik API stabil.

Arkitektur (översikt)

UI (NextF
}


Käll-explainerTOS

GA4: “Inkluderar Consent Mode-modellering, Signals, spamfilter. Kan ändras av Google.”


Data & tidszon
DeMTJVMENVäe
Tidszon: Europe/Stockholm.

GA4-läge: hämta sessions, engagedSessions, screenPageViews, totalUsers med dimensioner date, sessionDefaultChannelGroup. Top pages data för Core Web Vitals analys. Kräver GA4_PROPERTY_ID env variabel.


Prestanda & cache

GA4: kvot-aware cache‐nyckel = (metrics,dims,filters,dateRange).


PDD-principer

Smallest possible change.

Unified diffs only.

Touch only specificerade filer.

Leave TODO if uncertain; stop.

Keep public APIs stable.

Ändra aldrig configs/linters utan uttryckligt OK.

Testning

Test runner: npm test (TBD setup).

Enhetstester för resolver. Snapshot-tester för UI-widgets. Minimal mock av GA4.