import Link from "next/link";
import { FEATURE_FLAGS } from "@/lib/feature-flags";

interface BreadcrumbProps {
  pageName: string;
}

const Breadcrumb = ({ pageName }: BreadcrumbProps) => {
  // TODO: Handle breadcrumbs for disabled features
  // If Konverteringar is disabled and user somehow reaches this page, show appropriate breadcrumb
  const isDisabledFeature = pageName === "Konverteringar" && !FEATURE_FLAGS.conversions;
  
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h2 className="text-[26px] font-bold leading-[30px] text-dark dark:text-white">
        {isDisabledFeature ? "Sidan inte tillgänglig" : pageName}
      </h2>

      <nav>
        <ol className="flex items-center gap-2">
          <li>
            <Link className="font-medium" href="/">
              KPI Dashboard /
            </Link>
          </li>
          <li className="font-medium text-primary">
            {isDisabledFeature ? "Sidan inte tillgänglig" : pageName}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default Breadcrumb;
