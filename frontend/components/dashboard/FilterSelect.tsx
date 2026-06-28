"use client";

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`;

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  label: string;
}

export function FilterSelect<T extends string>({ value, onChange, options, label }: Props<T>) {
  const isFiltered = value !== options[0]?.value;

  return (
    <div className="relative flex items-center">
      {isFiltered && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-blue-500 z-10 pointer-events-none" />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={`h-9 rounded-lg border bg-white pr-8 text-sm font-medium text-gray-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer appearance-none transition-colors ${
          isFiltered
            ? "border-blue-300 pl-6 text-blue-700"
            : "border-gray-200 pl-3"
        }`}
        style={{ backgroundImage: CHEVRON, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
        aria-label={label}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
