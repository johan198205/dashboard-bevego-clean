import SourceToggle from "@/components/SourceToggle";
import mf from "@/lib/mockData/fixtures/microfrontends.json";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export default function Page() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="card">
        <div className="title mb-2">Funktioner</div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Konverteringar</span>
            <span className={`badge ${FEATURE_FLAGS.conversions ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {FEATURE_FLAGS.conversions ? 'Aktiverad' : 'Inaktiverad'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Ändra FEATURE_FLAGS.conversions i installningar/page.tsx för att aktivera
          </div>
        </div>
      </div>

      <div className="card">
        <div className="title mb-2">Källa</div>
        <SourceToggle />
      </div>

      <div className="card">
        <div className="title mb-2">Event-taxonomi</div>
        <div className="space-y-2 text-sm">
          <div>
            <div className="font-medium">Tasks</div>
            <code className="block rounded bg-gray-100 p-2 text-xs">task_submitted_fault_report, task_invoice_attested, task_legal_booking, task_news_created, task_expense_uploaded, task_doc_uploaded, task_doc_downloaded</code>
            <div className="text-gray-600">Params: task_id, section, role, group, microfrontend_id</div>
          </div>
          <div>
            <div className="font-medium">Features</div>
            <code className="block rounded bg-gray-100 p-2 text-xs">feature_read_report, feature_read_news, feature_view_faq, feature_view_vendor_invoice, feature_visit_boardroom, feature_view_avi</code>
            <div className="text-gray-600">Params: content_id, content_type, section, role, group</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="title mb-2">Mätluckor</div>
        <ul className="divide-y text-sm">
          {mf.map((m) => (
            <li key={m.name} className="flex items-center justify-between py-2">
              <span>{m.name}</span>
              <span className="flex items-center gap-2">
                <span className="badge">{m.status}</span>
                <span className="text-gray-500">{m.owner}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}


