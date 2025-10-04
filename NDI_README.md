# NDI Dashboard System

Ett komplett system för att hantera och visualisera Net Promoter Index (NDI) data från Excel-filer.

## Översikt

Systemet stöder:
- Uppladdning av aggregerade och nedbrutna Excel-filer
- Automatisk parsing och normalisering av data
- Beräkning av QoQ, YoY och rullande 4-kvartal metrics
- Interaktiva visualiseringar och rapporter
- Filhantering och versionskontroll

## Datamodell

### FileUpload
- `id`: Unik identifierare
- `kind`: 'AGGREGATED' eller 'BREAKDOWN'
- `originalName`: Ursprungligt filnamn
- `storedPath`: Sökväg till sparad fil
- `uploadedAt`: Uppladdningsdatum
- `period`: Detekterade perioder (kommaseparerade)
- `active`: Om filen är aktiv (soft delete)

### MetricPoint
- `id`: Unik identifierare
- `period`: Tidsperiod (format: YYYYQ1, YYYYQ2, etc.)
- `metric`: Måttnamn (t.ex. 'NDI')
- `value`: Numeriskt värde
- `weight`: Viktning (antal svar, valfritt)
- `source`: 'AGGREGATED' eller 'BREAKDOWN'
- `groupA/B/C`: Generiska grupperingsfält för kategorier

## API Endpoints

### Filhantering
- `POST /api/files/upload` - Ladda upp Excel-fil
- `GET /api/files` - Lista alla filer
- `DELETE /api/files/[id]` - Ta bort fil (soft delete)

### Metrics
- `GET /api/metrics/ndi/summary?period=YYYYQn` - NDI sammanfattning för period
- `GET /api/metrics/ndi/series?from=YYYYQn&to=YYYYQn` - NDI tidsserie
- `GET /api/metrics/ndi/breakdown?period=YYYYQn` - Nedbrytningar för period
- `GET /api/metrics/ndi/latest-period` - Senaste tillgängliga period

## Filformat

### Aggregerad fil
- En rad med "NDI" som identifierar måttet
- Kvartalskolumner i format YYYYQ1, YYYYQ2, etc.
- Numeriska värden i kvartalskolumnerna

Exempel:
```
Mått     | 2024Q1 | 2024Q2 | 2024Q3
NDI      | 45.2   | 47.8   | 46.5
```

### Nedbrytningar
- Kolumn "Period" eller liknande för tidsperiod
- Kolumn med NDI-värden (kan heta "NDI", "Index", etc.)
- Kategorikolumner (mappas till Grupp A, B, C)
- Valfri kolumn "Antal svar" för viktning

Exempel:
```
Period | Kategori      | NDI  | Antal svar
2024Q1 | Kundservice   | 42.0 | 100
2024Q1 | Produktkvalitet| 48.5| 150
2024Q1 | Leverans      | 45.0 | 80
```

## Beräkningar

### Viktat snitt
När viktning finns: `SUM(value * weight) / SUM(weight)`

### Enkelt snitt
När ingen viktning: `AVG(value)`

### QoQ (Quarter over Quarter)
`((current - previous) / previous) * 100`

### YoY (Year over Year)
`((current - lastYear) / lastYear) * 100`

### Rullande 4Q
Genomsnitt av aktuell period och tre föregående kvartal.

## UI Komponenter

### NDICard
Visar fyra scorecards:
- NDI - Senaste kvartal
- Förändring QoQ
- Förändring YoY
- NDI - Rullande 4Q

### NDIChart
Linjediagram med:
- NDI per kvartal (röd linje)
- Rullande 4Q (grön streckad linje)
- Interaktiva tooltips

### NDISummaryTable
Tabell med alla perioder och beräkningar:
- Period, NDI, QoQ, YoY, Rullande 4Q
- Sorterbar, nyast först

### NDIBreakdownHeatmap
Heatmap för nedbrytningar:
- Färgkodning baserat på NDI-värden
- Sökfunktion
- CSV-export

### NDITopBottom
Visar bästa och sämsta prestanda:
- Top 3 och bottom 3 kategorier
- Med antal svar om tillgängligt

## Sidor

### /ndi - Översikt
- Scorecards med senaste data
- Tidsseriegraf
- Sammanfattningstabell
- Top/bottom performers

### /ndi/details - Detaljer
- Periodväljare
- Breakdown heatmap
- Sök och filtrera
- Exportfunktioner

### /ndi/settings - Inställningar
- Filuppladdning (aggregerad och nedbrytningar)
- Filhantering
- Valideringsrapporter
- Filformat-information

## Installation och Setup

1. Installera dependencies:
```bash
npm install
```

2. Konfigurera databas:
```bash
npx prisma generate
npx prisma migrate dev
```

3. Starta utvecklingsserver:
```bash
npm run dev
```

## Användning

1. Gå till "Kundnöjdhet > NDI Inställningar"
2. Ladda upp aggregerad Excel-fil
3. Ladda upp nedbrytningar Excel-fil
4. Gå till "NDI Dashboard" för att se resultat
5. Använd "NDI Detaljer" för djupare analys

## Validering och Felhantering

Systemet validerar:
- Filformat (.xlsx, .xls)
- Periodformat (YYYYQ1, YYYYQ2, etc.)
- Numeriska värden
- Kolumnstruktur

Varningar genereras för:
- Saknade perioder
- Ogiltiga värden
- Okända kolumner
- Tomma rader

## Säkerhet

- Endast inloggade användare kan ladda upp/ta bort filer
- Filstorlek begränsad till 25MB
- Rate limiting på uppladdning
- Validering av filinnehåll

## Prestanda

- Parser körs server-side
- Caching av beräkningar
- Optimerade databasfrågor
- Lazy loading av komponenter

## Framtida utveckling

- Manuell kolumnmapping i UI
- Kommentarer per period
- E-postnotifieringar
- Ytterligare exportformat
- Avancerade filter
- Automatisk datauppdatering
