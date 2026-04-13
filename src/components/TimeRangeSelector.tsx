"use client";

import type { TimeRange } from "@/types/database";

const RANGES: { value: TimeRange; label: string }[] = [
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "180d", label: "6M" },
  { value: "1y", label: "1Y" },
];

interface TimeRangeSelectorProps {
  selected: TimeRange;
  onChange: (range: TimeRange) => void;
}

export default function TimeRangeSelector({
  selected,
  onChange,
}: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-1 bg-gray-800/50 rounded-lg p-1">
      {RANGES.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            selected === value
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-700/50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
