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
