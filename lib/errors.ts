export type ApiError = {
  code: "ZOD_VALIDATION_ERROR" | "INTERNAL_ERROR";
  message: string;
  details?: unknown;
};

export type ApiErrorResponse = { error: ApiError };

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error
  );
}
