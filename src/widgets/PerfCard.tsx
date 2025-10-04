"use client";

import { ScoreCard } from "@/components/ui/scorecard";
import { GlobeIcon } from "@/assets/icons";

export default function PerfCard({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <ScoreCard
      label={title}
      value={value}
      Icon={GlobeIcon}
      variant="warning"
      source="Mock"
    />
  );
}


