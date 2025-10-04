"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import GlobalFilters from "./GlobalFilters";

export function ConditionalFilters() {
  const pathname = usePathname();
  
  // Don't show global filters on Prestanda page
  if (pathname.startsWith('/prestanda')) {
    return null;
  }
  
  return (
    <Suspense fallback={<div>Loading filters...</div>}>
      <GlobalFilters />
    </Suspense>
  );
}
