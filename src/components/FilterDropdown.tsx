"use client";

import { useState } from "react";
import { Dropdown, DropdownContent, DropdownTrigger } from "./ui/dropdown";
import { ChevronUpIcon } from "@/assets/icons";
import { cn } from "@/lib/utils";

type Item = { value: string; label: string };

type Props = {
  label: string;
  items: Item[];
  values: string[];
  onChange: (next: string[]) => void;
};

export default function FilterDropdown({ label, items, values, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  function toggle(value: string) {
    const has = values.includes(value);
    const next = has ? values.filter((v) => v !== value) : [...values, value];
    onChange(next);
  }

  const display = values.length === 0 ? "Alla" : items.filter(i => values.includes(i.value)).map(i => i.label).join(", ");

  return (
    <div className="card filter-box">
      <span className="title">{label}</span>
      <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
        <DropdownTrigger
          className={cn(
            "flex h-6 items-center gap-x-2 rounded-md px-2 text-sm font-medium text-dark-5 outline-none dark:text-white",
          )}
        >
          <span className="line-clamp-1">{display}</span>
          <ChevronUpIcon className="size-4 rotate-180 transition-transform" />
        </DropdownTrigger>

        <DropdownContent align="start" className="min-w-[12rem] overflow-hidden rounded-lg border border-[#E8E8E8] bg-white p-1 text-sm shadow-md dark:border-dark-3 dark:bg-dark-2">
          <ul role="menu" aria-label={label}>
            <li>
              <button
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-[#F9FAFB] dark:hover:bg-[#FFFFFF1A]"
                onClick={() => onChange([])}
              >
                <span className="inline-block size-4 rounded border border-stroke dark:border-dark-3 bg-white" aria-hidden />
                Alla
              </button>
            </li>
            {items.map((item) => (
              <li key={item.value}>
                <button
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-left hover:bg-[#F9FAFB] dark:hover:bg-[#FFFFFF1A]"
                  onClick={() => toggle(item.value)}
                >
                  <span
                    className={cn(
                      "grid size-4 place-items-center rounded border border-stroke dark:border-dark-3",
                      values.includes(item.value) && "bg-primary text-white"
                    )}
                    aria-checked={values.includes(item.value)}
                    role="checkbox"
                  >
                    {values.includes(item.value) ? "✓" : ""}
                  </span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </DropdownContent>
      </Dropdown>
    </div>
  );
}


