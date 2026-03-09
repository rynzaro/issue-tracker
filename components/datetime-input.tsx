"use client";

import clsx from "clsx";

/**
 * Reusable date + time input pair.
 * Combines two native inputs into a single Date value.
 *
 * Versatile enough for: forms with Field/Label, inline toolbars, dialogs, etc.
 * Supports error states, date constraints, and flexible layouts.
 *
 * Usage patterns:
 * 1. With inline label: `<DateTimeInput label="Start:" ... />`
 * 2. With Field/Label: `<Field><Label>Start</Label><DateTimeInput ... /></Field>`
 * 3. Stacked layout: `<DateTimeInput layout="stacked" ... />`
 */
export default function DateTimeInput({
  value,
  onChange,
  label,
  disabled = false,
  invalid = false,
  min,
  max,
  layout = "inline",
  className,
  dateClassName,
  timeClassName,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
  /** Optional inline label. For Field/Label pattern, omit this and wrap in Field. */
  label?: string;
  disabled?: boolean;
  /** Error state styling (red border). Matches other form components. */
  invalid?: boolean;
  /** Minimum allowed date (inclusive). */
  min?: Date;
  /** Maximum allowed date (inclusive). */
  max?: Date;
  /** Layout direction: inline (default) or stacked. */
  layout?: "inline" | "stacked";
  /** Container className. */
  className?: string;
  /** Override className for date input. */
  dateClassName?: string;
  /** Override className for time input. */
  timeClassName?: string;
}) {
  const dateStr = value ? toLocalDateString(value) : "";
  const timeStr = value ? toLocalTimeString(value) : "";
  const minDateStr = min ? toLocalDateString(min) : undefined;
  const maxDateStr = max ? toLocalDateString(max) : undefined;

  function handleDateChange(newDateStr: string) {
    if (!newDateStr) return;
    const timePart = timeStr || "00:00";
    const combined = parseDateAndTime(newDateStr, timePart);
    if (combined) onChange(combined);
  }

  function handleTimeChange(newTimeStr: string) {
    if (!newTimeStr) return;
    const datePart = dateStr || toLocalDateString(new Date());
    const combined = parseDateAndTime(datePart, newTimeStr);
    if (combined) onChange(combined);
  }

  const inputBaseClasses = clsx(
    "min-w-0 rounded-md border bg-white px-2 py-1 text-sm",
    "dark:bg-zinc-800 dark:text-white dark:color-scheme-dark",
    "[&::-webkit-calendar-picker-indicator]:dark:invert [&::-webkit-calendar-picker-indicator]:dark:brightness-90",
    "focus:outline-none focus:ring-2",
    invalid
      ? "border-red-500 dark:border-red-600 focus:ring-red-500"
      : "border-zinc-300 dark:border-zinc-600 focus:ring-zinc-500",
    disabled && "opacity-50 cursor-not-allowed",
  );

  return (
    <div
      className={clsx(
        "flex gap-2",
        layout === "inline" ? "items-center" : "flex-col",
        className,
      )}
    >
      {label && (
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 shrink-0">
          {label}
        </span>
      )}
      <div
        className={clsx(
          "flex gap-2",
          layout === "inline" ? "items-center" : "flex-col",
        )}
      >
        <input
          type="date"
          value={dateStr}
          onChange={(e) => handleDateChange(e.target.value)}
          disabled={disabled}
          min={minDateStr}
          max={maxDateStr}
          className={dateClassName ?? clsx(inputBaseClasses, "flex-1")}
          aria-label={label ? undefined : "Datum"}
        />
        <input
          type="time"
          value={timeStr}
          onChange={(e) => handleTimeChange(e.target.value)}
          disabled={disabled}
          className={timeClassName ?? inputBaseClasses}
          aria-label={label ? undefined : "Uhrzeit"}
        />
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD in local timezone */
function toLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Format a Date as HH:MM in local timezone */
function toLocalTimeString(d: Date): string {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Parse a YYYY-MM-DD date string and HH:MM time string into a Date */
function parseDateAndTime(dateStr: string, timeStr: string): Date | null {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  if ([year, month, day, hours, minutes].some((v) => isNaN(v))) return null;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}
