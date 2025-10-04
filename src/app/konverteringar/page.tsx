import { redirect } from "next/navigation";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export default function Page() {
  // TODO: Route protection - redirect if Konverteringar feature is disabled
  if (!FEATURE_FLAGS.conversions) {
    redirect("/");
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="card">
        <div className="title">Konverteringar (placeholder)</div>
        <div className="text-sm text-gray-600">Scaffold för tratt kommer här. Mock.</div>
      </div>
      <div className="card">
        <div className="title">Steg i tratt</div>
        <div className="text-sm text-gray-600">Tom för nu.</div>
      </div>
      <div className="card">
        <div className="title">Anteckningar</div>
        <div className="text-sm text-gray-600">Lägg till fynd och hypoteser här.</div>
      </div>
    </div>
  );
}


