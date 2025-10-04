"use client";

import { ScoreCard } from "@/components/ui/scorecard";
import { CheckIcon } from "@/assets/icons";

export default function WcagCard() {
  return (
    <ScoreCard
      label="WCAG-status"
      value="Placeholder. Förbättringsområde identifierat."
      Icon={CheckIcon}
      variant="error"
      source="Mock"
    />
  );
}


