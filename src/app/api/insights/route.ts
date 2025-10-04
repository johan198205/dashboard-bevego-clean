import { NextRequest } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type InsightsRequest = {
  metricId: string;
  metricName: string;
  dateRange: { start: string; end: string };
  series: Array<{ date: string; value: number }>;
  comparisonSeries?: Array<{ date: string; value: number }>;
  anomalies?: Array<{ date: string; value: number; delta: number; severity: string }>;
  filters?: any;
  distributionContext?: string;
};

type InsightsResponse = {
  observations: string[];
  insights: string[];
  explanations: string[];
  recommendations: string[];
  note?: string;
};

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.warn('OPENAI_API_KEY not configured, returning mock insights');
      return Response.json({ 
        error: 'OpenAI API key not configured',
        useMock: true 
      }, { status: 503 });
    }

    const body: InsightsRequest = await req.json();
    const { metricId, metricName, dateRange, series, comparisonSeries, anomalies = [], filters, distributionContext } = body;

    // Validate input
    if (!metricId || !metricName || !series || series.length === 0) {
      return Response.json({ 
        error: 'Missing required fields: metricId, metricName, series' 
      }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    // Prepare compact data summary for token efficiency
    const values = series.map(p => p.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const first = values[0];
    const last = values[values.length - 1];
    const changePct = first ? ((last - first) / first) * 100 : 0;
    
    // Trend: compare first third vs last third
    const third = Math.floor(values.length / 3);
    const startAvg = values.slice(0, third).reduce((a, b) => a + b, 0) / third;
    const endAvg = values.slice(-third).reduce((a, b) => a + b, 0) / third;
    const trendPct = startAvg ? ((endAvg - startAvg) / startAvg) * 100 : 0;

    // Comparison period statistics
    let comparisonStats = '';
    if (comparisonSeries && comparisonSeries.length > 0) {
      const compValues = comparisonSeries.map(p => p.value);
      const compAvg = compValues.reduce((a, b) => a + b, 0) / compValues.length;
      const compTotal = compValues.reduce((a, b) => a + b, 0);
      const currentTotal = values.reduce((a, b) => a + b, 0);
      const vsComparisonPct = compAvg ? ((avg - compAvg) / compAvg) * 100 : 0;
      const vsComparisonTotal = compTotal ? ((currentTotal - compTotal) / compTotal) * 100 : 0;
      
      comparisonStats = `\nJämförelse mot föregående period:
- Föregående medel: ${Math.round(compAvg)}
- Förändring i medel: ${vsComparisonPct >= 0 ? '+' : ''}${vsComparisonPct.toFixed(1)}%
- Totalt nuvarande period: ${Math.round(currentTotal)}
- Totalt föregående period: ${Math.round(compTotal)}
- Total förändring: ${vsComparisonTotal >= 0 ? '+' : ''}${vsComparisonTotal.toFixed(1)}%`;
    }

    const filtersSummary = [
      filters?.device?.length ? `enheter: ${filters.device.join(', ')}` : null,
      filters?.channel?.length ? `kanaler: ${filters.channel.join(', ')}` : null,
      filters?.audience?.length ? `målgrupper: ${filters.audience.join(', ')}` : null
    ].filter(Boolean).join('; ') || 'inga filter';

    // Compact anomaly summary
    const anomalySummary = anomalies.length 
      ? `${anomalies.length} avvikelser: ${anomalies.map(a => `${a.date} (${a.delta > 0 ? '+' : ''}${Math.round(a.delta)})`).join(', ')}`
      : 'inga avvikelser';

    // System prompt: instruct GPT to be a data analyst
    const systemPrompt = `Du är en erfaren data-analytiker för en svensk bostadsrättsförening (Riksbyggen). 
Analysera webbanalytik-data och ge konkreta, actionable insikter på svenska.
Fokusera på trender, mönster, och rekommendationer för att förbättra användarupplevelse och konverteringar.
Svara ALLTID med exakt denna JSON-struktur (inga extra fält):
{
  "observations": ["sträng1", "sträng2", "sträng3"],
  "insights": ["sträng1", "sträng2"],
  "explanations": ["sträng1", "sträng2", "sträng3"],
  "recommendations": ["sträng1", "sträng2", "sträng3", "sträng4"]
}`;

    // User prompt: adapt based on whether it's a distribution or time series
    const isDistribution = !!distributionContext;
    
    let userPrompt = '';
    
    if (isDistribution) {
      // For distributions (channels, devices, cities, usage patterns)
      userPrompt = `Metrik: ${metricName} (${metricId})
Period: ${dateRange.start} → ${dateRange.end}
Filter: ${filtersSummary}

DATA - Fördelning av ${metricName}:
${distributionContext}

VIKTIGT: Detta är en FÖRDELNING (inte en tidsserie). Analysera mönstret i fördelningen ovan:
- Vilka kategorier dominerar?
- Finns det obalanser eller koncentration?
- Vad kan fördelningen berätta om användarnas beteende?
- Vilka insikter kan man dra för att förbättra användarupplevelsen?

Ge koncisa, actionable insikter i JSON-format enligt instruktionerna.`;
    } else {
      // For time series (sessions, pageviews, etc.)
      userPrompt = `Metrik: ${metricName} (${metricId})
Period: ${dateRange.start} → ${dateRange.end} (${series.length} datapunkter)
Filter: ${filtersSummary}

Statistik (nuvarande period):
- Medel: ${Math.round(avg)}
- Min: ${Math.round(min)}, Max: ${Math.round(max)}
- Första: ${Math.round(first)}, Senaste: ${Math.round(last)}
- Förändring (första→senaste): ${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%
- Trend (början→slut): ${trendPct >= 0 ? '+' : ''}${trendPct.toFixed(1)}%
- ${anomalySummary}${comparisonStats}

VIKTIGT: Analysera förändringen mot föregående period (om tillgänglig) och ge insikter om vad som driver skillnaden.

Ge koncisa, actionable insikter i JSON-format enligt instruktionerna.`;
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective model for structured data
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800, // Limit for cost control
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    const parsed = JSON.parse(content) as InsightsResponse;

    // Validate response structure
    if (!parsed.observations || !parsed.insights || !parsed.explanations || !parsed.recommendations) {
      throw new Error('Invalid response structure from OpenAI');
    }

    // Add filter note if applicable
    if (filtersSummary !== 'inga filter') {
      parsed.note = `Filter: ${filtersSummary}`;
    }

    return Response.json(parsed);

  } catch (error: any) {
    console.error('OpenAI Insights API error:', error);
    
    return Response.json({ 
      error: 'Failed to generate insights',
      details: error.message,
      useMock: true
    }, { status: 500 });
  }
}
