# Avvikelsedetektion

Detta dokument beskriver hur systemet detekterar och klassificerar avvikelser (anomalier) i tidsseriedata.

## Översikt

Avvikelsesystemet använder en statistisk metod baserad på glidande medelvärde och standardavvikelse för att identifiera onormala värden i tidsserier. Detekteringen sker i `ScorecardDetailsDrawer.tsx`.

## Grundläggande Krav

- **Minsta datamängd**: Minst 8 datapunkter krävs för att köra avvikelsedetektering
- **Glidande fönster**: Ett 7-dagars fönster används för att beräkna baseline-statistik
- **Detektering startar**: Från datapunkt 8 och framåt (efter första 7-dagars fönstret)

## Detekteringsalgoritm

För varje datapunkt beräknas följande:

### 1. Baseline-statistik
- **Fönster**: De 7 föregående datapunkterna
- **Medelvärde (μ)**: Genomsnittligt värde för fönstret
- **Standardavvikelse (σ)**: Spridning i fönstret

### 2. Delta-beräkning
```
delta = aktuellt_värde - medelvärde
```

### 3. Avvikelsekontroll

En punkt markeras som avvikelse om **båda** följande villkor är uppfyllda:

1. `σ > 0` (standardavvikelsen är större än 0)
2. `|delta| > max(2σ, 0.05 × max(1, μ))`

Detta innebär att avvikelsen måste vara **minst**:
- **2 standardavvikelser** från medelvärdet, ELLER
- **5% av medelvärdet** (vilket som är störst)

Den dubbla kontrollen säkerställer att:
- Vi fångar stora relativa förändringar (5%-regeln)
- Vi använder statistisk signifikans (2σ-regeln)

## Allvarlighetsgrader

När en avvikelse detekteras klassificeras den i tre nivåer:

| Severity | Villkor | Beskrivning |
|----------|---------|-------------|
| **high** | `\|delta\| > 3σ` | Mer än 3 standardavvikelser från medelvärdet |
| **medium** | `\|delta\| > 2.5σ` | Mer än 2.5 standardavvikelser från medelvärdet |
| **low** | `\|delta\| > 2σ` | Mer än 2 standardavvikelser från medelvärdet |

## Praktiskt Exempel

### Scenario
- Medelvärde (μ) för senaste 7 dagar: 1000 besökare
- Standardavvikelse (σ): 100 besökare

### Beräkning
- Tröskel: `max(2 × 100, 0.05 × 1000) = max(200, 50) = 200`
- Avvikelse detekteras vid: värde < 800 eller värde > 1200

### Klassificering
| Värde | Delta | Severity | Förklaring |
|-------|-------|----------|------------|
| 1350 | +350 | high | \|350\| > 3 × 100 = 300 |
| 1270 | +270 | medium | \|270\| > 2.5 × 100 = 250 |
| 1220 | +220 | low | \|220\| > 2 × 100 = 200 |
| 1150 | +150 | - | Ingen avvikelse (under tröskeln) |
| 750 | -250 | medium | \|-250\| > 2.5 × 100 = 250 |

## Teknisk Implementation

### Kodstruktur

```typescript
type Anomaly = { 
  date: string; 
  value: number; 
  delta: number; 
  severity: "low" | "medium" | "high" 
};

function detectAnomalies(series: TimePoint[]): Anomaly[]
```

### Algoritm (pseudokod)

```
FÖR varje punkt i från dag 8 till slutet:
  1. Ta ut fönster: de 7 föregående punkterna
  2. Beräkna μ = medelvärde(fönster)
  3. Beräkna σ = standardavvikelse(fönster)
  4. Beräkna delta = punkt[i].värde - μ
  5. OM σ > 0 OCH |delta| > max(2σ, 5% av μ):
     a. Beräkna severity:
        - OM |delta| > 3σ → "high"
        - ANNARS OM |delta| > 2.5σ → "medium"
        - ANNARS → "low"
     b. Lägg till avvikelse i resultat
```

## Metodval och Motivering

### Varför glidande fönster?
- **Anpassningsbar baseline**: Systemet anpassar sig till säsongsvariation och trender
- **Lokal kontext**: Jämför mot nyligt beteende snarare än global historik
- **7 dagar**: Täcker en hel vecka, fångar veckomönster

### Varför 2 standardavvikelser?
- **Statistisk signifikans**: ~95% konfidensintervall i normalfördelning
- **Balans**: Fångar verkliga anomalier utan för många false positives
- **Branschstandard**: Vanligt använd tröskel i anomalydetektion

### Varför 5%-regeln?
- **Skyddar mot platta kurvor**: När σ är liten men relativa förändringar är stora
- **Affärsmässig relevans**: 5% förändring kan vara betydelsefull oavsett statistik

## Användning i UI

Avvikelser visas i "Scorecard Details Drawer" under sektionen **"3. Avvikelser"**:
- Om inga avvikelser: "Inga avvikelser."
- Vid avvikelser: Lista med datum, värden och severity-indikation

Avvikelserna skickas också till OpenAI API:et för att generera insikter och rekommendationer.

## Begränsningar

1. **Kräver minst 8 punkter**: Fungerar inte på korta tidsserier
2. **Gradvis skiftande baseline**: Stora men långsamma förändringar kan missas
3. **Förutsätter normalfördelning**: Fungerar bäst med data som inte är extremt skev
4. **Ingen säsongsjustering**: Årliga säsongsmönster fångas inte automatiskt

## Framtida Förbättringar

Potentiella förbättringar att överväga:
- Säsongsjustering (t.ex. jämföra mot samma dag föregående vecka/månad)
- Exponentiell utjämning för bättre hantering av trender
- Maskininlärningsbaserad detektering för mer avancerade mönster
- Användaranpassningsbara tröskelvärden per metrik

