"use client";
import TasksTable from "@/widgets/TasksTable";
import FeaturesTable from "@/widgets/FeaturesTable";
import { TopPages } from "@/components/oversikt-besok/TopPages";
import { useFilters } from "@/components/GlobalFilters";
import { useState, useEffect } from "react";
import type { OverviewPayload } from "@/app/api/ga4/overview/route";

export default function Page() {
  const { state } = useFilters();
  const range = state.range;
  const [topPagesData, setTopPagesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopPages = async () => {
      try {
        const params = new URLSearchParams({
          start: range.start,
          end: range.end,
          grain: range.grain || 'day',
          compare: 'yoy'
        });
        
        const response = await fetch(`/api/ga4/overview?${params.toString()}`);
        if (response.ok) {
          const data: OverviewPayload = await response.json();
          setTopPagesData(data.topPages || []);
        }
      } catch (error) {
        console.error('Failed to fetch top pages data:', error);
        setTopPagesData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopPages();
  }, [range.start, range.end, range.grain]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-1 gap-4">
          <TasksTable range={range} />
          <FeaturesTable range={range} />
        </div>
      </div>
      
      {/* Top Pages Section */}
      <div className="grid grid-cols-1 gap-6">
        {!loading && topPagesData.length > 0 && (
          <TopPages data={topPagesData} />
        )}
      </div>
    </div>
  );
}


