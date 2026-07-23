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

// ─── Service Errors ────────────────────────────────────────────────────────────

export type ServiceErrorCode =
  | "INTERNAL_SERVER_ERROR"
  | "AUTHORIZATION_ERROR"
  | "UNEXPECTED_ERROR"
  | "VALIDATION_ERROR"
  // A hierarchy move the rules do not allow on a sound tree — the user's to
  // fix, not a fault. Raised by the transition policy (#14); UNEXPECTED_ERROR
  // keeps its meaning of "this should not be possible".
  | "TRANSITION_INVALID"
  | "TRANSITION_UNAUTHORIZED_CASCADE"
  | "NOT_FOUND";

export type ServiceErrorResponse = {
  success: false;
  error: {
    code: ServiceErrorCode;
    message: string;
    details?: unknown;
  };
};

export function createServiceErrorResponse(
  code: ServiceErrorCode,
  message: string,
  details?: unknown,
): ServiceErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
}
