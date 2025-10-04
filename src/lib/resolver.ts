import { type KpiResponse, type Params, type Grain, type Filters, type KpiPoint } from "./types";
import { buildKpiResponse, buildAverageKpiResponse, generateTimeseries, aggregate, aggregateAverage, buildBreakdown } from "./mockData/generators";
import { sumSeries } from "./yoy";

function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

function previousYoyRange(range: { start: string; end: string }) {
  return { start: addYears(range.start, -1), end: addYears(range.end, -1) };
}

function previousPeriodRange(range: { start: string; end: string }): { start: string; end: string } {
  // Compute duration in days and subtract that from start
  const start = new Date(range.start);
  const end = new Date(range.end);
  const lengthDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1);
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (lengthDays - 1));
  return { start: prevStart.toISOString().slice(0, 10), end: prevEnd.toISOString().slice(0, 10) };
}

function ensureGrain(grain?: Grain): Grain { return grain || "day"; }

// Proportional mock scaling based on UI filters
const AUDIENCE_WEIGHTS: Record<string, number> = {
  "Styrelse": 0.1,
  "Medlem": 0.7,
  "Leverantör": 0.1,
  "Förvaltare": 0.1,
};
const DEVICE_WEIGHTS: Record<string, number> = {
  "Desktop": 0.6,
  "Mobil": 0.3,
  "Surfplatta": 0.1,
};
const CHANNEL_WEIGHTS: Record<string, number> = {
  "Direkt": 0.35,
  "Organiskt": 0.4,
  "Kampanj": 0.15,
  "E-post": 0.1,
};

function weightSum(values: string[] | undefined, weights: Record<string, number>): number {
  if (!values || values.length === 0) return 1;
  return values.reduce((acc, v) => acc + (weights[v] ?? 0), 0);
}

function computeScale(filters?: Filters): number {
  if (!filters) return 1;
  const a = weightSum(filters.audience, AUDIENCE_WEIGHTS);
  const d = weightSum(filters.device, DEVICE_WEIGHTS);
  const c = weightSum(filters.channel, CHANNEL_WEIGHTS);
  return a * d * c;
}

function scaleSeries(series: { date: string; value: number }[], factor: number) {
  if (factor === 1) return series;
  return series.map((p) => ({ ...p, value: Math.round(p.value * factor) }));
}

export async function getKpi(params: Params): Promise<KpiResponse> {
  const { metric, range, filters } = params;
  const grain = ensureGrain(range.grain);
  const comparisonMode: 'none' | 'yoy' | 'prev' = (range.comparisonMode as any) || (range.compareYoy ? 'yoy' : 'none');
  const debugGa4 = process.env.DEBUG_GA4 === '1';

  // Note: All data is mock. CONNECT GA4 HERE LATER by swapping implementation per metric.
  const scale = computeScale(filters);
  if (metric === "mau") {
    // Try GA4 first if configured, otherwise fall back to mock
    const propertyId = process.env.GA4_PROPERTY_ID;

    function buildGa4FilterExpression(host: string, f?: Filters): any {
      const andExpressions: any[] = [
        {
          filter: {
            fieldName: "hostName",
            stringFilter: { matchType: "EXACT", value: host },
          },
        },
      ];
      if (f?.device && f.device.length > 0) {
        const deviceMap: Record<string, string> = { Desktop: "desktop", Mobil: "mobile", Surfplatta: "tablet" };
        const deviceExpr = {
          orGroup: {
            expressions: f.device
              .map((d) => deviceMap[d] || d)
              .map((val) => ({
                filter: {
                  fieldName: "deviceCategory",
                  stringFilter: { matchType: "EXACT", value: val },
                },
              })),
          },
        };
        andExpressions.push(deviceExpr);
      }
      if (f?.channel && f.channel.length > 0) {
        const channelMap: Record<string, string> = {
          "Direkt": "Direct",
          "Organiskt": "Organic Search",
          "Kampanj": "Paid Search",
          "E-post": "Email",
        };
        const channelExpr = {
          orGroup: {
            expressions: f.channel
              .map((c) => channelMap[c] || c)
              .map((val) => ({
                filter: {
                  fieldName: "sessionDefaultChannelGroup",
                  stringFilter: { matchType: "EXACT", value: val },
                },
              })),
          },
        };
        andExpressions.push(channelExpr);
      }
      const expr = { andGroup: { expressions: andExpressions } } as any;
      if (debugGa4) {
        // eslint-disable-next-line no-console
        console.debug('[GA4] filter', JSON.stringify(expr));
      }
      return expr;
    }

    async function queryGa4(rangeInput: { start: string; end: string }) {
      // Prevent client bundling of GA4 SDK; only import on server at runtime
      const isServer = typeof window === "undefined";
      if (!isServer) throw new Error("GA4 client can only run on server");
      // Use an indirect require so the client bundle does not try to resolve
      // the GA4 SDK which depends on Node built-ins like 'fs'. This code path
      // only runs on the server.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = (eval('require'))("@google-analytics/data");
      const client = new BetaAnalyticsDataClient();
      const extraDims: any[] = [];
      if (filters?.device?.length) extraDims.push({ name: "deviceCategory" });
      if (filters?.channel?.length) extraDims.push({ name: "sessionDefaultChannelGroup" });
      const [resp] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: rangeInput.start, endDate: rangeInput.end }],
        dimensions: [{ name: "date" }, ...extraDims],
        metrics: [{ name: "totalUsers" }],
        dimensionFilter: buildGa4FilterExpression("www.bevego.se", filters),
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });
      if (debugGa4) {
        // eslint-disable-next-line no-console
        console.debug('[GA4] MAU rows', resp.rows?.length || 0);
      }
      const rows = resp.rows || [];
      const series = rows.map((r: any) => ({
        date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
        value: Number(r.metricValues?.[0]?.value || 0),
      }));
      return series as { date: string; value: number }[];
    }

    try {
      const isServer = typeof window === "undefined";
      if (propertyId && isServer) {
        const currentDaySeries = await queryGa4({ start: range.start, end: range.end });
        const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
        const previousDaySeries = prevRange ? await queryGa4(prevRange) : undefined;
        const series = aggregateAverage(currentDaySeries, grain);
        const prevAgg = previousDaySeries ? aggregateAverage(previousDaySeries, grain) : undefined;
        return buildKpiResponse("mau", series, prevAgg, [], ["Källa: GA4 API (total användare för perioden)"], "ga4");
      }
    } catch (err) {
      // Fall back to mock if GA4 fails for any reason
      // eslint-disable-next-line no-console
      console.error("GA4 MAU query failed, falling back to mock:", err || "Unknown error");
    }

    // Mock fallback
    const currentRaw = generateTimeseries({ start: range.start, end: range.end, grain }, { base: 1200, noise: 0.1, seedKey: "mau" });
    const current = scaleSeries(currentRaw, scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 1050, noise: 0.1, seedKey: "mau_prev" }), scale) : undefined;
    const series = aggregateAverage(current, grain);
    const prevAgg = previous ? aggregateAverage(previous, grain) : undefined;
    const breakdown = [
      "Direkt",
      "Organiskt",
      "Kampanj",
      "E-post",
      "Referral",
      "Social",
      "Betald sök",
      "Display",
      "Video",
      "Övrigt",
    ];
    const dims = filters?.channel && filters.channel.length > 0 ? breakdown.filter((c) => filters.channel?.includes(c)) : breakdown;
    
    // Generate previous breakdown data for comparison
    let previousBreakdown;
    if (prevRange && dims.length > 0) {
      const prevTotal = prevAgg ? sumSeries(prevAgg) : 0;
      previousBreakdown = buildBreakdown(dims, prevTotal);
    }
    
    return buildKpiResponse("mau", series, prevAgg, dims, ["Källa: Mockdata (Total Users, summa per period)"], "mock", previousBreakdown); 
  }

  if (metric === "pageviews") {
    const propertyId = process.env.GA4_PROPERTY_ID;
    
    function buildGa4FilterExpression(host: string, f?: Filters): any {
      const andExpressions: any[] = [
        {
          filter: {
            fieldName: "hostName",
            stringFilter: { matchType: "EXACT", value: host },
          },
        },
      ];
      if (f?.device && f.device.length > 0) {
        const deviceMap: Record<string, string> = { Desktop: "desktop", Mobil: "mobile", Surfplatta: "tablet" };
        const deviceExpr = {
          orGroup: {
            expressions: f.device
              .map((d) => deviceMap[d] || d)
              .map((val) => ({
                filter: {
                  fieldName: "deviceCategory",
                  stringFilter: { matchType: "EXACT", value: val },
                },
              })),
          },
        };
        andExpressions.push(deviceExpr);
      }
      if (f?.channel && f.channel.length > 0) {
        const channelMap: Record<string, string> = {
          "Direkt": "Direct",
          "Organiskt": "Organic Search",
          "Kampanj": "Paid Search",
          "E-post": "Email",
        };
        const channelExpr = {
          orGroup: {
            expressions: f.channel
              .map((c) => channelMap[c] || c)
              .map((val) => ({
                filter: {
                  fieldName: "sessionDefaultChannelGroup",
                  stringFilter: { matchType: "EXACT", value: val },
                },
              })),
          },
        };
        andExpressions.push(channelExpr);
      }
      const expr = { andGroup: { expressions: andExpressions } } as any;
      if (debugGa4) {
        // eslint-disable-next-line no-console
        console.debug('[GA4] filter', JSON.stringify(expr));
      }
      return expr;
    }
    
    async function queryGa4Pageviews(rangeInput: { start: string; end: string }) {
      const isServer = typeof window === "undefined";
      if (!isServer) throw new Error("GA4 client can only run on server");
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = (eval('require'))("@google-analytics/data");
      const client = new BetaAnalyticsDataClient();
      const extraDims: any[] = [];
      if (filters?.device?.length) extraDims.push({ name: "deviceCategory" });
      if (filters?.channel?.length) extraDims.push({ name: "sessionDefaultChannelGroup" });
      const [resp] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: rangeInput.start, endDate: rangeInput.end }],
        dimensions: [{ name: "date" }, ...extraDims],
        metrics: [{ name: "screenPageViews" }],
        dimensionFilter: buildGa4FilterExpression("www.bevego.se", filters),
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });
      if (debugGa4) {
        // eslint-disable-next-line no-console
        console.debug('[GA4] Pageviews rows', resp.rows?.length || 0);
      }
      const rows = resp.rows || [];
      const series = rows.map((r: any) => ({
        date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
        value: Number(r.metricValues?.[0]?.value || 0),
      }));
      return series as { date: string; value: number }[];
    }

    try {
      const isServer = typeof window === "undefined";
      if (propertyId && isServer) {
        const currentDaySeries = await queryGa4Pageviews({ start: range.start, end: range.end });
        const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
        const previousDaySeries = prevRange ? await queryGa4Pageviews(prevRange) : undefined;
        const series = aggregate(currentDaySeries, grain);
        const prevAgg = previousDaySeries ? aggregate(previousDaySeries, grain) : undefined;
        const breakdown = [
          "Direkt",
          "Organiskt",
          "Kampanj",
          "E-post",
          "Referral",
          "Social",
          "Betald sök",
          "Display",
          "Video",
          "Övrigt",
        ];
        const dims = filters?.channel && filters.channel.length > 0 ? breakdown.filter((c) => filters.channel?.includes(c)) : breakdown;
        
        // Generate previous breakdown data for comparison
        let previousBreakdown;
        if (prevRange && dims.length > 0) {
          const prevTotal = prevAgg ? sumSeries(prevAgg) : 0;
          previousBreakdown = buildBreakdown(dims, prevTotal);
        }
        
        return buildKpiResponse("pageviews", series, prevAgg, dims, ["Källa: GA4 API"], "ga4", previousBreakdown);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("GA4 Pageviews query failed, falling back to mock:", err || "Unknown error");
    }

    // Mock fallback
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 5400, noise: 0.12, seedKey: "pageviews" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 5000, noise: 0.12, seedKey: "pageviews_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    const breakdown = [
      "Direkt",
      "Organiskt",
      "Kampanj",
      "E-post",
      "Referral",
      "Social",
      "Betald sök",
      "Display",
      "Video",
      "Övrigt",
    ];
    const dims = filters?.channel && filters.channel.length > 0 ? breakdown.filter((c) => filters.channel?.includes(c)) : breakdown;
    
    // Generate previous breakdown data for comparison
    let previousBreakdown;
    if (prevRange && dims.length > 0) {
      const prevTotal = prevAgg ? sumSeries(prevAgg) : 0;
      previousBreakdown = buildBreakdown(dims, prevTotal);
    }
    
    return buildKpiResponse("pageviews", series, prevAgg, dims, ["Källa: Mockdata (Sidvisningar - GA4 fel)"], "mock", previousBreakdown);
  }


  if (metric === "tasks") {
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 750, noise: 0.15, seedKey: "tasks" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 680, noise: 0.15, seedKey: "tasks_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    return buildKpiResponse("tasks", series, prevAgg, [
      "task_submitted_fault_report",
      "task_invoice_attested",
      "task_legal_booking",
      "task_news_created",
      "task_expense_uploaded",
      "task_doc_uploaded",
      "task_doc_downloaded",
      "task_profile_updated",
      "task_consent_updated",
      "task_contacted_support",
    ], ["Rate = antal / MAU för perioden (beräknas i widget)", "Källa: Mockdata (Tasks)"]);
  }

  if (metric === "features") {
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 950, noise: 0.14, seedKey: "features" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 900, noise: 0.14, seedKey: "features_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    return buildKpiResponse("features", series, prevAgg, [
      "feature_read_report",
      "feature_read_news",
      "feature_view_faq",
      "feature_view_vendor_invoice",
      "feature_visit_boardroom",
      "feature_view_avi",
      "feature_download_document",
      "feature_search",
      "feature_notifications",
      "feature_settings",
    ], ["Källa: Mockdata (Funktioner)"]);
  }


  if (metric === "tasks_rate") {
    // Generate realistic task completion rate 60-85%
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 72, noise: 0.08, seedKey: "tasks_rate" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 68, noise: 0.08, seedKey: "tasks_rate_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    
    // Clamp to realistic range 60-85%
    const clampedSeries = series.map(p => ({ ...p, value: Math.max(60, Math.min(85, p.value)) }));
    const clampedPrevAgg = prevAgg ? prevAgg.map(p => ({ ...p, value: Math.max(60, Math.min(85, p.value)) })) : undefined;
    
    const currentRate = clampedSeries.reduce((sum, p) => sum + p.value, 0) / clampedSeries.length;
    const prevRate = clampedPrevAgg ? clampedPrevAgg.reduce((sum, p) => sum + p.value, 0) / clampedPrevAgg.length : 0;
    const yoyPct = prevRate ? ((currentRate - prevRate) / Math.abs(prevRate)) * 100 : 0;
    
    return {
      meta: { source: "mock", metric: "tasks_rate", dims: [] },
      summary: { current: currentRate, prev: prevRate, yoyPct },
      timeseries: clampedSeries,
      notes: ["Task completion rate 60-85%", "Källa: Mockdata (Tasks Rate)"]
    };
  }

  if (metric === "features_rate") {
    // Generate realistic feature usage rate 70-90%
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 80, noise: 0.06, seedKey: "features_rate" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 76, noise: 0.06, seedKey: "features_rate_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    
    // Clamp to realistic range 70-90%
    const clampedSeries = series.map(p => ({ ...p, value: Math.max(70, Math.min(90, p.value)) }));
    const clampedPrevAgg = prevAgg ? prevAgg.map(p => ({ ...p, value: Math.max(70, Math.min(90, p.value)) })) : undefined;
    
    const currentRate = clampedSeries.reduce((sum, p) => sum + p.value, 0) / clampedSeries.length;
    const prevRate = clampedPrevAgg ? clampedPrevAgg.reduce((sum, p) => sum + p.value, 0) / clampedPrevAgg.length : 0;
    const yoyPct = prevRate ? ((currentRate - prevRate) / Math.abs(prevRate)) * 100 : 0;
    
    return {
      meta: { source: "mock", metric: "features_rate", dims: [] },
      summary: { current: currentRate, prev: prevRate, yoyPct },
      timeseries: clampedSeries,
      notes: ["Feature usage rate 70-90%", "Källa: Mockdata (Features Rate)"]
    };
  }

  if (metric === "cwv_total") {
    // Use real CrUX data instead of mock
    try {
      const isServer = typeof window === "undefined";
      if (isServer) {
        // Import CrUX service dynamically to avoid client bundling
        const { CruxService } = await import("../services/crux.service");
        const cruxService = new CruxService();
        
        // Get current CWV data
        const cwvData = await cruxService.getCoreWebVitals("https://www.bevego.se");
        const currentRate = cwvData.totalStatus.percentage;
        
        // Get previous period data for comparison
        const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
        let prevRate = 0;
        if (prevRange) {
          try {
            const prevCwvData = await cruxService.getCoreWebVitals("https://www.bevego.se");
            prevRate = prevCwvData.totalStatus.percentage;
          } catch (err) {
            // If previous period fails, use current rate as fallback
            prevRate = currentRate;
          }
        }
        
        const yoyPct = prevRate ? ((currentRate - prevRate) / Math.abs(prevRate)) * 100 : 0;
        
        // Create a simple timeseries with the current value
        const series = [{ date: range.start, value: currentRate }];
        
        return {
          meta: { source: "ga4", metric: "cwv_total", dims: [] },
          summary: { current: currentRate, prev: prevRate, yoyPct },
          timeseries: series,
          notes: ["CWV total status från CrUX API", "Källa: CrUX API"]
        };
      }
    } catch (err) {
      console.error("CrUX CWV Total query failed, falling back to mock:", err || "Unknown error");
    }
    
    // Fallback to mock data if CrUX fails
    const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 70, noise: 0.05, seedKey: "cwv_total" }), scale);
    const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
    const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 68, noise: 0.05, seedKey: "cwv_total_prev" }), scale) : undefined;
    const series = aggregate(current, grain);
    const prevAgg = previous ? aggregate(previous, grain) : undefined;
    
    // Clamp to realistic range 60-80%
    const clampedSeries = series.map(p => ({ ...p, value: Math.max(60, Math.min(80, p.value)) }));
    const clampedPrevAgg = prevAgg ? prevAgg.map(p => ({ ...p, value: Math.max(60, Math.min(80, p.value)) })) : undefined;
    
    const currentRate = clampedSeries.reduce((sum, p) => sum + p.value, 0) / clampedSeries.length;
    const prevRate = clampedPrevAgg ? clampedPrevAgg.reduce((sum, p) => sum + p.value, 0) / clampedPrevAgg.length : 0;
    const yoyPct = prevRate ? ((currentRate - prevRate) / Math.abs(prevRate)) * 100 : 0;
    
    return {
      meta: { source: "mock", metric: "cwv_total", dims: [] },
      summary: { current: currentRate, prev: prevRate, yoyPct },
      timeseries: clampedSeries,
      notes: ["CWV total status 60-80%", "Källa: Mockdata (CWV Total - CrUX fel)"]
    };
  }

  if (metric === "sessions") {
    const propertyId = process.env.GA4_PROPERTY_ID;

    function buildGa4FilterExpression(host: string, f?: Filters): any {
      const andExpressions: any[] = [
        {
          filter: {
            fieldName: "hostName",
            stringFilter: { matchType: "EXACT", value: host },
          },
        },
      ];
      if (f?.device && f.device.length > 0) {
        const deviceMap: Record<string, string> = { Desktop: "desktop", Mobil: "mobile", Surfplatta: "tablet" };
        const deviceExpr = {
          orGroup: {
            expressions: f.device
              .map((d) => deviceMap[d] || d)
              .map((val) => ({
                filter: {
                  fieldName: "deviceCategory",
                  stringFilter: { matchType: "EXACT", value: val },
                },
              })),
          },
        };
        andExpressions.push(deviceExpr);
      }
      if (f?.channel && f.channel.length > 0) {
        const channelExpr = {
          orGroup: {
            expressions: f.channel.map((val) => ({
              filter: {
                fieldName: "sessionDefaultChannelGroup",
                stringFilter: { matchType: "EXACT", value: val },
              },
            })),
          },
        };
        andExpressions.push(channelExpr);
      }
      if (f?.audience && f.audience.length > 0) {
        const audienceExpr = {
          orGroup: {
            expressions: f.audience.map((val) => ({
              filter: {
                fieldName: "userType",
                stringFilter: { matchType: "EXACT", value: val === "Ny användare" ? "new" : "returning" },
              },
            })),
          },
        };
        andExpressions.push(audienceExpr);
      }
      return andExpressions.length === 1 ? andExpressions[0] : { andGroup: { expressions: andExpressions } };
    }
    
    async function queryGa4Sessions(rangeInput: { start: string; end: string }) {
      const isServer = typeof window === "undefined";
      if (!isServer) throw new Error("GA4 client can only run on server");
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = (eval('require'))("@google-analytics/data");
      const client = new BetaAnalyticsDataClient();
      const extraDims: any[] = [];
      if (filters?.device?.length) extraDims.push({ name: "deviceCategory" });
      if (filters?.channel?.length) extraDims.push({ name: "sessionDefaultChannelGroup" });
      const [resp] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: rangeInput.start, endDate: rangeInput.end }],
        dimensions: [{ name: "date" }, ...extraDims],
        metrics: [{ name: "sessions" }],
        dimensionFilter: buildGa4FilterExpression("www.bevego.se", filters),
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });
      if (debugGa4) {
        // eslint-disable-next-line no-console
        console.debug('[GA4] Sessions rows', resp.rows?.length || 0);
      }
      const rows = resp.rows || [];
      const series = rows.map((r: any) => ({
        date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
        value: Number(r.metricValues?.[0]?.value || 0),
      }));
      return series as { date: string; value: number }[];
    }

    try {
      const isServer = typeof window === "undefined";
      if (propertyId && isServer) {
        const currentDaySeries = await queryGa4Sessions({ start: range.start, end: range.end });
        const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
        const previousDaySeries = prevRange ? await queryGa4Sessions(prevRange) : undefined;
        const series = aggregate(currentDaySeries, grain);
        const prevAgg = previousDaySeries ? aggregate(previousDaySeries, grain) : undefined;
        return buildKpiResponse("sessions", series, prevAgg, [], ["Källa: GA4 API"], "ga4");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("GA4 Sessions query failed:", err || "Unknown error");
      // Fall back to mock data instead of throwing
      const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 1200, noise: 0.1, seedKey: "sessions" }), scale);
      const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
      const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 1050, noise: 0.1, seedKey: "sessions_prev" }), scale) : undefined;
      const series = aggregate(current, grain);
      const prevAgg = previous ? aggregate(previous, grain) : undefined;
      return buildKpiResponse("sessions", series, prevAgg, [], ["Källa: Mockdata (Sessions - GA4 fel)"]);
    }

    throw new Error("GA4 Sessions not configured");
  }

  if (metric === "engagedSessions") {
    const propertyId = process.env.GA4_PROPERTY_ID;

    function buildGa4FilterExpression(host: string, f?: Filters): any {
      const andExpressions: any[] = [
        {
          filter: {
            fieldName: "hostName",
            stringFilter: { matchType: "EXACT", value: host },
          },
        },
      ];
      if (f?.device && f.device.length > 0) {
        const deviceMap: Record<string, string> = { Desktop: "desktop", Mobil: "mobile", Surfplatta: "tablet" };
        const deviceExpr = {
          orGroup: {
            expressions: f.device
              .map((d) => deviceMap[d] || d)
              .map((val) => ({
                filter: {
                  fieldName: "deviceCategory",
                  stringFilter: { matchType: "EXACT", value: val },
                },
              })),
          },
        };
        andExpressions.push(deviceExpr);
      }
      if (f?.channel && f.channel.length > 0) {
        const channelExpr = {
          orGroup: {
            expressions: f.channel.map((val) => ({
              filter: {
                fieldName: "sessionDefaultChannelGroup",
                stringFilter: { matchType: "EXACT", value: val },
              },
            })),
          },
        };
        andExpressions.push(channelExpr);
      }
      if (f?.audience && f.audience.length > 0) {
        const audienceExpr = {
          orGroup: {
            expressions: f.audience.map((val) => ({
              filter: {
                fieldName: "userType",
                stringFilter: { matchType: "EXACT", value: val === "Ny användare" ? "new" : "returning" },
              },
            })),
          },
        };
        andExpressions.push(audienceExpr);
      }
      return andExpressions.length === 1 ? andExpressions[0] : { andGroup: { expressions: andExpressions } };
    }
    
    async function queryGa4EngagedSessions(rangeInput: { start: string; end: string }) {
      const isServer = typeof window === "undefined";
      if (!isServer) throw new Error("GA4 client can only run on server");
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = (eval('require'))("@google-analytics/data");
      const client = new BetaAnalyticsDataClient();
      const extraDims: any[] = [];
      if (filters?.device?.length) extraDims.push({ name: "deviceCategory" });
      if (filters?.channel?.length) extraDims.push({ name: "sessionDefaultChannelGroup" });
      const [resp] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: rangeInput.start, endDate: rangeInput.end }],
        dimensions: [{ name: "date" }, ...extraDims],
        metrics: [{ name: "engagedSessions" }],
        dimensionFilter: buildGa4FilterExpression("www.bevego.se", filters),
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });
      if (debugGa4) {
        // eslint-disable-next-line no-console
        console.debug('[GA4] Engaged rows', resp.rows?.length || 0);
      }
      const rows = resp.rows || [];
      const series = rows.map((r: any) => ({
        date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
        value: Number(r.metricValues?.[0]?.value || 0),
      }));
      return series as { date: string; value: number }[];
    }

    try {
      const isServer = typeof window === "undefined";
      if (propertyId && isServer) {
        const currentDaySeries = await queryGa4EngagedSessions({ start: range.start, end: range.end });
        const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
        const previousDaySeries = prevRange ? await queryGa4EngagedSessions(prevRange) : undefined;
        const series = aggregate(currentDaySeries, grain);
        const prevAgg = previousDaySeries ? aggregate(previousDaySeries, grain) : undefined;
        return buildKpiResponse("engagedSessions", series, prevAgg, [], ["Källa: GA4 API"], "ga4");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("GA4 Engaged Sessions query failed:", err || "Unknown error");
      // Fall back to mock data instead of throwing
      const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 800, noise: 0.1, seedKey: "engagedSessions" }), scale);
      const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
      const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 750, noise: 0.1, seedKey: "engagedSessions_prev" }), scale) : undefined;
      const series = aggregate(current, grain);
      const prevAgg = previous ? aggregate(previous, grain) : undefined;
      return buildKpiResponse("engagedSessions", series, prevAgg, [], ["Källa: Mockdata (Engaged Sessions - GA4 fel)"]);
    }

    throw new Error("GA4 Engaged Sessions not configured");
  }

  if (metric === "engagementRate") {
    const propertyId = process.env.GA4_PROPERTY_ID;
    
    async function queryGa4EngagementRate(rangeInput: { start: string; end: string }) {
      const isServer = typeof window === "undefined";
      if (!isServer) throw new Error("GA4 client can only run on server");
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = (eval('require'))("@google-analytics/data");
      const client = new BetaAnalyticsDataClient();
      const [resp] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: rangeInput.start, endDate: rangeInput.end }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "engagementRate" }],
        dimensionFilter: {
          filter: {
            fieldName: "hostName",
            stringFilter: {
              matchType: "EXACT",
              value: "www.bevego.se"
            }
          }
        },
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });
      const rows = resp.rows || [];
      const series = rows.map((r: any) => ({
        date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
        // Normalize: GA4 may return engagementRate as decimal (0.7355) or percentage (73.55)
        // Always convert to percentage (0-100)
        value: (() => {
          const raw = Number(r.metricValues?.[0]?.value || 0);
          if (!isFinite(raw)) return 0;
          return raw <= 1 ? raw * 100 : raw;
        })(),
      }));
      return series as { date: string; value: number }[];
    }

    try {
      const isServer = typeof window === "undefined";
      if (propertyId && isServer) {
        const currentDaySeries = await queryGa4EngagementRate({ start: range.start, end: range.end });
        const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
        const previousDaySeries = prevRange ? await queryGa4EngagementRate(prevRange) : undefined;
        const series = aggregate(currentDaySeries, grain);
        const prevAgg = previousDaySeries ? aggregate(previousDaySeries, grain) : undefined;
        const avg = (arr: { value: number }[] | undefined) => {
          if (!arr || arr.length === 0) return 0;
          const sum = arr.reduce((s, p) => s + p.value, 0);
          return sum / arr.length;
        };
        const currentAvg = avg(series);
        const prevAvg = avg(prevAgg);
        return {
          meta: { source: "ga4", metric: "engagementRate", dims: [] },
          summary: { current: currentAvg, prev: prevAvg, yoyPct: prevAvg ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0 },
          timeseries: series,
          compareTimeseries: prevAgg,
          notes: ["Källa: GA4 API"],
        } as any;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("GA4 Engagement Rate query failed:", err || "Unknown error");
      // Calculate engagement rate from sessions and engagedSessions instead of using GA4 API
      try {
        // Define the functions locally since they're not in scope here
        async function queryGa4SessionsLocal(rangeInput: { start: string; end: string }) {
          const isServer = typeof window === "undefined";
          if (!isServer) throw new Error("GA4 client can only run on server");
          
          const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
          const credentials = JSON.parse(process.env.GA4_SA_JSON || "{}");
          const client = new BetaAnalyticsDataClient({ credentials });
          
          const [response] = await client.runReport({
            property: propertyId,
            dateRanges: [{ startDate: rangeInput.start, endDate: rangeInput.end }],
            dimensions: [{ name: "date" }],
            metrics: [{ name: "sessions" }],
            dimensionFilter: {
              filter: {
                fieldName: "hostName",
                stringFilter: { matchType: "EXACT", value: "www.bevego.se" }
              }
            }
          });
          
          return response.rows?.map(row => ({
            date: row.dimensionValues?.[0]?.value || "",
            value: parseInt(row.metricValues?.[0]?.value || "0")
          })) || [];
        }
        
        async function queryGa4EngagedSessionsLocal(rangeInput: { start: string; end: string }) {
          const isServer = typeof window === "undefined";
          if (!isServer) throw new Error("GA4 client can only run on server");
          
          const { BetaAnalyticsDataClient } = await import("@google-analytics/data");
          const credentials = JSON.parse(process.env.GA4_SA_JSON || "{}");
          const client = new BetaAnalyticsDataClient({ credentials });
          
          const [response] = await client.runReport({
            property: propertyId,
            dateRanges: [{ startDate: rangeInput.start, endDate: rangeInput.end }],
            dimensions: [{ name: "date" }],
            metrics: [{ name: "engagedSessions" }],
            dimensionFilter: {
              filter: {
                fieldName: "hostName",
                stringFilter: { matchType: "EXACT", value: "www.bevego.se" }
              }
            }
          });
          
          return response.rows?.map(row => ({
            date: row.dimensionValues?.[0]?.value || "",
            value: parseInt(row.metricValues?.[0]?.value || "0")
          })) || [];
        }
        
        const sessionsData = await queryGa4SessionsLocal({ start: range.start, end: range.end });
        const engagedSessionsData = await queryGa4EngagedSessionsLocal({ start: range.start, end: range.end });
        
        // Calculate engagement rate manually: engagedSessions / sessions * 100
        const engagementRateData = sessionsData.map((sessionPoint, index) => {
          const engagedPoint = engagedSessionsData[index];
          const rate = sessionPoint.value > 0 ? (engagedPoint.value / sessionPoint.value) * 100 : 0;
          return {
            date: sessionPoint.date,
            value: rate
          };
        });
        
        const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
        let prevEngagementRateData;
        if (prevRange) {
          const prevSessionsData = await queryGa4SessionsLocal(prevRange);
          const prevEngagedSessionsData = await queryGa4EngagedSessionsLocal(prevRange);
          prevEngagementRateData = prevSessionsData.map((sessionPoint, index) => {
            const engagedPoint = prevEngagedSessionsData[index];
            const rate = sessionPoint.value > 0 ? (engagedPoint.value / sessionPoint.value) * 100 : 0;
            return {
              date: sessionPoint.date,
              value: rate
            };
          });
        }
        
        const series = aggregate(engagementRateData, grain);
        const prevAgg = prevEngagementRateData ? aggregate(prevEngagementRateData, grain) : undefined;
        const avg = (arr: { value: number }[] | undefined) => {
          if (!arr || arr.length === 0) return 0;
          const sum = arr.reduce((s, p) => s + p.value, 0);
          return sum / arr.length;
        };
        const currentAvg = avg(series);
        const prevAvg = avg(prevAgg);
        return {
          meta: { source: "ga4", metric: "engagementRate", dims: [] },
          summary: { current: currentAvg, prev: prevAvg, yoyPct: prevAvg ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0 },
          timeseries: series,
          compareTimeseries: prevAgg,
          notes: ["Källa: GA4 API (beräknat från sessions/engagedSessions)"],
        } as any;
      } catch (calcErr) {
        // Final fallback to mock data
        const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 65, noise: 0.05, seedKey: "engagementRate" }), scale);
        const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
        const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 60, noise: 0.05, seedKey: "engagementRate_prev" }), scale) : undefined;
        const series = aggregate(current, grain);
        const prevAgg = previous ? aggregate(previous, grain) : undefined;
        const avg = (arr: { value: number }[] | undefined) => {
          if (!arr || arr.length === 0) return 0;
          const sum = arr.reduce((s, p) => s + p.value, 0);
          return sum / arr.length;
        };
        const currentAvg = avg(series);
        const prevAvg = avg(prevAgg);
        return {
          meta: { source: "mock", metric: "engagementRate", dims: [] },
          summary: { current: currentAvg, prev: prevAvg, yoyPct: prevAvg ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0 },
          timeseries: series,
          compareTimeseries: prevAgg,
          notes: ["Källa: Mockdata (Engagement Rate - GA4 fel)"],
        } as any;
      }
    }

    throw new Error("GA4 Engagement Rate not configured");
  }

  if (metric === "avgEngagementTime") {
    const propertyId = process.env.GA4_PROPERTY_ID;

    function buildGa4FilterExpression(host: string, f?: Filters): any {
      const andExpressions: any[] = [
        {
          filter: {
            fieldName: "hostName",
            stringFilter: { matchType: "EXACT", value: host },
          },
        },
      ];
      if (f?.device && f.device.length > 0) {
        const deviceMap: Record<string, string> = { Desktop: "desktop", Mobil: "mobile", Surfplatta: "tablet" };
        const deviceExpr = {
          orGroup: {
            expressions: f.device
              .map((d) => deviceMap[d] || d)
              .map((val) => ({
                filter: {
                  fieldName: "deviceCategory",
                  stringFilter: { matchType: "EXACT", value: val },
                },
              })),
          },
        };
        andExpressions.push(deviceExpr);
      }
      if (f?.channel && f.channel.length > 0) {
        const channelExpr = {
          orGroup: {
            expressions: f.channel.map((val) => ({
              filter: {
                fieldName: "sessionDefaultChannelGroup",
                stringFilter: { matchType: "EXACT", value: val },
              },
            })),
          },
        };
        andExpressions.push(channelExpr);
      }
      if (f?.audience && f.audience.length > 0) {
        const audienceExpr = {
          orGroup: {
            expressions: f.audience.map((val) => ({
              filter: {
                fieldName: "userType",
                stringFilter: { matchType: "EXACT", value: val === "Ny användare" ? "new" : "returning" },
              },
            })),
          },
        };
        andExpressions.push(audienceExpr);
      }
      return andExpressions.length === 1 ? andExpressions[0] : { andGroup: { expressions: andExpressions } };
    }
    
    async function queryGa4AvgEngagementTime(rangeInput: { start: string; end: string }) {
      const isServer = typeof window === "undefined";
      if (!isServer) throw new Error("GA4 client can only run on server");
      
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { BetaAnalyticsDataClient } = (eval('require'))("@google-analytics/data");
      const client = new BetaAnalyticsDataClient();
      const extraDims: any[] = [];
      if (filters?.device?.length) extraDims.push({ name: "deviceCategory" });
      if (filters?.channel?.length) extraDims.push({ name: "sessionDefaultChannelGroup" });
      const [resp] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: rangeInput.start, endDate: rangeInput.end }],
        dimensions: [{ name: "date" }, ...extraDims],
        metrics: [{ name: "averageSessionDuration" }],
        dimensionFilter: buildGa4FilterExpression("www.bevego.se", filters),
        orderBys: [{ dimension: { dimensionName: "date" } }],
      });
      if (debugGa4) {
        // eslint-disable-next-line no-console
        console.debug('[GA4] AvgEngagementTime rows', resp.rows?.length || 0);
      }
      const rows = resp.rows || [];
      const series = rows.map((r: any) => ({
        date: `${r.dimensionValues?.[0]?.value?.slice(0,4)}-${r.dimensionValues?.[0]?.value?.slice(4,6)}-${r.dimensionValues?.[0]?.value?.slice(6,8)}`,
        value: Number(r.metricValues?.[0]?.value || 0),
      }));
      return series as { date: string; value: number }[];
    }

    try {
      const isServer = typeof window === "undefined";
      if (propertyId && isServer) {
        const currentDaySeries = await queryGa4AvgEngagementTime({ start: range.start, end: range.end });
        const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
        const previousDaySeries = prevRange ? await queryGa4AvgEngagementTime(prevRange) : undefined;
        const series = aggregateAverage(currentDaySeries, grain);
        const prevAgg = previousDaySeries ? aggregateAverage(previousDaySeries, grain) : undefined;
        return buildAverageKpiResponse("avgEngagementTime", series, prevAgg, [], ["Källa: GA4 API"], "ga4");
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("GA4 Average Engagement Time query failed:", err || "Unknown error");
      // Fall back to mock data instead of throwing
      const current = scaleSeries(generateTimeseries({ start: range.start, end: range.end, grain }, { base: 180, noise: 0.1, seedKey: "avgEngagementTime" }), scale);
      const prevRange = comparisonMode === 'yoy' ? previousYoyRange(range) : comparisonMode === 'prev' ? previousPeriodRange(range) : null;
      const previous = prevRange ? scaleSeries(generateTimeseries({ start: prevRange.start, end: prevRange.end, grain }, { base: 160, noise: 0.1, seedKey: "avgEngagementTime_prev" }), scale) : undefined;
      const series = aggregateAverage(current, grain);
      const prevAgg = previous ? aggregateAverage(previous, grain) : undefined;
      return buildAverageKpiResponse("avgEngagementTime", series, prevAgg, [], ["Källa: Mockdata (Avg Engagement Time - GA4 fel)"]);
    }

    throw new Error("GA4 Average Engagement Time not configured");
  }

  if (metric === "perf") {
    // Static placeholders
    const series = [{ date: params.range.start, value: 1 }];
    return {
      meta: { source: "mock", metric: "perf", dims: [] },
      summary: { current: 1, prev: 1, yoyPct: 0 },
      timeseries: series,
      notes: ["Svarstid, Uptime och WCAG är placeholders", "Källa: Mockdata (Prestanda)"]
    };
  }

  // Fallback
  return {
    meta: { source: "mock", metric, dims: [] },
    summary: { current: 0, prev: 0, yoyPct: 0 },
    timeseries: [],
    notes: ["Okänt mått", "Källa: Mockdata"]
  };
}

// Temporary shim to avoid breaking existing imports in the template
export type DataSource = "ga4";
export type SessionsKpiInput = { startDate: string; endDate: string; dataSource: DataSource };
export type SessionsKpiResult = { total_sessions: number; source_label: "Mock" };
export async function getSessionsKpi(input: SessionsKpiInput): Promise<SessionsKpiResult> {
  const res = await getKpi({ metric: "mau", range: { start: input.startDate, end: input.endDate, compareYoy: false, grain: "day" } });
  return { total_sessions: res.summary.current, source_label: "Mock" };
}

