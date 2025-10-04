import * as Icons from "../icons";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export const NAV_DATA = [
  {
    label: "Bevego",
    items: [
      {
        title: "Översikt",
        icon: Icons.HomeIcon,
        items: [
          { title: "KPI Dashboard", url: "/" },
          { title: "GA4 Dashboard", url: "/oversikt/besok" },
        ],
      },
      { title: "Användning", url: "/anvandning", icon: Icons.Table, items: [] },
      // TODO: Konverteringar section - controlled by FEATURE_FLAGS.conversions
      ...(FEATURE_FLAGS.conversions ? [{ title: "Konverteringar", url: "/konverteringar", icon: Icons.PieChart, items: [] }] : []),
      // { title: "Prestanda", url: "/prestanda", icon: Icons.Table, items: [] }, // Hidden for now
      { title: "Inställningar", url: "/installningar", icon: Icons.Alphabet, items: [] },
    ],
  },
  // Optional legacy demos below can be re-enabled if needed
];
