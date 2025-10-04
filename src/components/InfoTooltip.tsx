"use client";
import { useState } from "react";

export default function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button className="badge" onClick={() => setOpen((o) => !o)} aria-label="info">
        i
      </button>
      {open && (
        <div className="absolute left-1/2 z-10 mt-2 w-64 -translate-x-1/2 rounded-md border bg-white p-3 text-xs shadow">
          {text}
        </div>
      )}
    </div>
  );
}


