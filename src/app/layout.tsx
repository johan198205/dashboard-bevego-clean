import "@/css/satoshi.css";
import "@/css/style.css";

import { ConditionalSidebar } from "@/components/Layouts/ConditionalSidebar";

import "flatpickr/dist/flatpickr.min.css";
import "jsvectormap/dist/jsvectormap.css";
import "@/styles/globals.css";

import { Header } from "@/components/Layouts/header";
import { ConditionalFilters } from "@/components/ConditionalFilters";
import { FiltersProvider } from "@/components/GlobalFilters";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import type { PropsWithChildren } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    template: "%s | NextAdmin - Next.js Dashboard Kit",
    default: "NextAdmin - Next.js Dashboard Kit",
  },
  description:
    "Next.js admin dashboard toolkit with 200+ templates, UI components, and integrations for fast dashboard development.",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <NextTopLoader color="#E01E26" showSpinner={false} />

          <div className="flex min-h-screen">
            <ConditionalSidebar />

            <div className="w-full bg-[#fafafa] dark:bg-[#0F1419]">
              <Header />

              <FiltersProvider>
                <div className="isolate mx-auto w-full max-w-screen-2xl overflow-hidden p-4 md:p-6 2xl:p-10">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <ConditionalFilters />
                  </div>
                  <main>
                    {children}
                  </main>
                </div>
              </FiltersProvider>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
