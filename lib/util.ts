export type ApiErrorCode =
  | "ZOD_VALIDATION_ERROR"
  | "INTERNAL_SERVER_ERROR"
  | "INPUT_FORMAT_ERROR";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
};

/**
 * Create a normalized error response
 */
export function createErrorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

export function parseTaskString(taskStr: string): string[] | undefined {
  if (!taskStr.startsWith("T:")) {
    return;
  }
  return taskStr.split("::").map((segment) => segment.replace("T:", ""));
}

export function validatePassword(password: string): boolean {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()-])[A-Za-z\d!@#$%^&*()-]{8,}$/.test(
    password,
  );
}

export function calculateDurationInSeconds(
  startedAt: Date,
  stoppedAt: Date,
): number {
  return Math.floor((stoppedAt.getTime() - startedAt.getTime()) / 1000);
}

export type TimeUnit = "min" | "sec" | "ms";
export type TimeFormat = "HH:MM" | "MM:SS" | "HH:MM:SS";

/**
 * Format a raw time value into a human-readable string.
 *
 * @param total        - The raw time value.
 * @param unit         - The unit of `total`: "min", "sec", or "ms".
 * @param format       - Output format: "HH:MM" (hours:minutes), "MM:SS" (minutes:seconds), or "HH:MM:SS".
 * @param leading_zeros - When true, always shows the leading component even if zero (e.g. "0:45").
 *                        When false, omits leading zero components (e.g. "45", or "1:05" when only hours are zero).
 *
 * @example
 * formatTime(90, "min", "HH:MM", true)       // "1:30"
 * formatTime(45, "min", "HH:MM", true)       // "0:45"
 * formatTime(45, "min", "HH:MM", false)      // "45"
 * formatTime(75, "sec", "MM:SS", true)       // "1:15"
 * formatTime(45, "sec", "MM:SS", false)      // "45"
 * formatTime(3661, "sec", "HH:MM:SS", true)  // "1:01:01"
 * formatTime(61, "sec", "HH:MM:SS", false)   // "1:01"
 * formatTime(45, "sec", "HH:MM:SS", false)   // "45"
 */
export function formatTime(
  total: number,
  unit: TimeUnit,
  format: TimeFormat,
  leading_zeros: boolean,
): string {
  const ms =
    unit === "ms" ? total : unit === "sec" ? total * 1_000 : total * 60_000;

  const pad = (n: number) => String(n).padStart(2, "0");

  if (format === "HH:MM") {
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    if (!leading_zeros && hours === 0) return String(minutes);
    return `${leading_zeros ? pad(hours) : hours}:${pad(minutes)}`;
  } else if (format === "MM:SS") {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1_000);
    if (!leading_zeros && minutes === 0) return String(seconds);
    return `${leading_zeros ? pad(minutes) : minutes}:${pad(seconds)}`;
  } else {
    const hours = Math.floor(ms / 3_600_000);
    const minutes = Math.floor((ms % 3_600_000) / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1_000);
    if (!leading_zeros && hours === 0 && minutes === 0) return String(seconds);
    if (!leading_zeros && hours === 0) return `${minutes}:${pad(seconds)}`;
    return `${leading_zeros ? pad(hours) : hours}:${pad(minutes)}:${pad(seconds)}`;
  }
}
