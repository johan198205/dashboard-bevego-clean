Komponenter

UI: components/SourceToggle, widgets/TimeSeries, widgets/ChannelTable, widgets/TotalDiffCard.

Server: lib/resolver.ts, lib/ga4Client.ts, lib/cache.ts.

Flöde

[User Toggle GA4]
        |
        v
[resolver.getKpi(params, dataSource)]
        |
   [ga4Client]
        |
 [normalize -> contract schema]
        |
   [return to UI + source_label + explainer]


GA4 Integration

Hämtar data direkt från GA4 Data API med:
- Sessions, engagedSessions, screenPageViews, totalUsers
- Dimensioner: date, sessionDefaultChannelGroup
- Top pages data för Core Web Vitals analys

Paritet

Normalisera nycklar: date, channel_group (GA4: sessionDefaultChannelGroup).

Dokumentera avvikelser i UI.