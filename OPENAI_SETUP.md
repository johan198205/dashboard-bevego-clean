# OpenAI Integration Setup

## Översikt

GA4 score-cards på `/oversikt/besok` har nu AI-genererade insikter via OpenAI GPT-4o-mini.

## Konfiguration

### 1. Skaffa OpenAI API-nyckel

1. Gå till [OpenAI Platform](https://platform.openai.com/api-keys)
2. Logga in eller skapa ett konto
3. Skapa en ny API-nyckel
4. Kopiera nyckeln (börjar med `sk-...`)

### 2. Lägg till i .env.local

Skapa eller uppdatera `.env.local` i projektets root:

```bash
# OpenAI API Key för AI-insikter
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Starta om dev-servern

```bash
npm run dev
```

## Användning

När du klickar på ett GA4-kort (Sessions, Total users, etc.) öppnas en sidebar med:

1. **Diagram** - tidsserie för vald metrik
2. **AI-insikter** - genererade av OpenAI baserat på data
   - Iakttagelser (3 punkter)
   - Insikter (djupare analys)
   - Möjliga förklaringar (hypoteser)
   - Rekommendationer (actionable steg)
3. **Avvikelser** - automatisk detektion av anomalier
4. **Rekommendationer** - konkreta nästa steg

## Fallback

Om `OPENAI_API_KEY` inte är konfigurerad eller API:et misslyckas:
- Systemet använder automatiskt mock-insikter (heuristik-baserad)
- Ingen felmeddelande visas för slutanvändare
- UI visar "Källa: Mock – AI" istället för "Källa: OpenAI (GPT-4o-mini)"

## Kostnadshantering

- **Modell**: GPT-4o-mini (kostnadseffektivt val)
- **Max tokens**: 800 per anrop
- **Input-optimering**: Komprimerad data-sammanfattning istället för full tidsserie
- **Caching**: Inga redundanta anrop (sker endast vid drawer-öppning)

### Uppskattad kostnad

För 1000 score-card klick/månad:
- ~1000 API-anrop
- ~500k input tokens + ~400k output tokens
- Kostnad: ca $0.15-0.30/månad (GPT-4o-mini priser)

## Felsökning

### "Källa: Mock – AI" visas istället för OpenAI

1. Kontrollera att `OPENAI_API_KEY` finns i `.env.local`
2. Verifiera att nyckeln börjar med `sk-`
3. Starta om dev-servern efter att ha lagt till nyckeln
4. Öppna browser console → kolla efter `✓ Using real OpenAI insights` meddelande

### API-fel i console

```
OpenAI insights unavailable, using mock data
```

**Möjliga orsaker:**
- Ogiltig API-nyckel
- Utgången nyckel (behöver förnyas)
- Rate limit nått (vänta eller uppgradera plan)
- Nätverksproblem

**Lösning:**
1. Kontrollera nyckeln på [OpenAI Dashboard](https://platform.openai.com/api-keys)
2. Verifiera usage limits under [Usage](https://platform.openai.com/usage)
3. Kolla nätverksanrop i Network-tab (Status 401/429 indikerar key/rate-problem)

## Implementation

### API Endpoint

`POST /api/insights`

**Request:**
```json
{
  "metricId": "sessions",
  "metricName": "Sessions",
  "dateRange": { "start": "2025-09-01", "end": "2025-09-30" },
  "series": [
    { "date": "2025-09-01", "value": 1234 },
    { "date": "2025-09-02", "value": 1456 }
  ],
  "anomalies": [
    { "date": "2025-09-15", "value": 2000, "delta": 500, "severity": "high" }
  ],
  "filters": { "device": ["mobile"], "channel": ["Organic Search"] }
}
```

**Response:**
```json
{
  "observations": ["Punkt 1", "Punkt 2", "Punkt 3"],
  "insights": ["Insikt 1", "Insikt 2"],
  "explanations": ["Förklaring 1", "Förklaring 2", "Förklaring 3"],
  "recommendations": ["Rekommendation 1", "Rekommendation 2"],
  "note": "Filter: enheter: mobile; kanaler: Organic Search"
}
```

### Filer

- `/src/app/api/insights/route.ts` - OpenAI API integration
- `/src/components/ScorecardDetailsDrawer.tsx` - UI som anropar endpoint
- `/src/components/oversikt-besok/KpiCards.tsx` - Klickbara kort

## Dokumentation

Se även:
- [SYSTEM.md](docs/SYSTEM.md) - Arkitektur och PDD-principer
- [RULES.md](docs/RULES.md) - Kodningsregler
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Systemöversikt
