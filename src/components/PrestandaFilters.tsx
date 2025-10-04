"use client";
import { useFilters } from "./GlobalFilters";
import FilterDropdown from "./FilterDropdown";

export default function PrestandaFilters() {
  const { state, setState } = useFilters();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3" suppressHydrationWarning>
      <FilterDropdown
        label="Enhet"
        items={[
          { value: "Alla", label: "Alla" },
          { value: "Desktop", label: "Desktop" },
          { value: "Mobil", label: "Mobil" },
          { value: "Surfplatta", label: "Surfplatta" },
        ]}
        values={state.device}
        onChange={(values) => setState((p) => ({ ...p, device: values }))}
      />

      {/* Selected filter chips - only show device filters */}
      {state.device.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {state.device.map((d) => (
            <button
              key={`chip-device-${d}`}
              className="inline-flex items-center gap-2 rounded-full border border-stroke bg-white px-2 py-0.5 text-xs shadow-sm dark:border-dark-3 dark:bg-dark-2"
              onClick={() => setState((p) => ({ ...p, device: p.device.filter((v) => v !== d) }))}
              aria-label={`Ta bort filter Enhet: ${d}`}
              title={`Enhet: ${d}`}
            >
              <span className="text-gray-600 dark:text-gray-200">Enhet: {d}</span>
              <span className="ml-1 inline-grid size-4 place-items-center rounded-full bg-gray-200 text-gray-700 dark:bg-[#FFFFFF1A] dark:text-gray-200">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
