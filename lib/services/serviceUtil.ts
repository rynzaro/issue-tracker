import { Prisma } from "@prisma/client";
import { z } from "zod";

// ─── Error Codes ───────────────────────────────────────────────────────────────

export type ServiceErrorCode =
  | "INTERNAL_SERVER_ERROR"
  | "AUTHORIZATION_ERROR"
  | "UNEXPECTED_ERROR"
  | "VALIDATION_ERROR"
  | "NOT_FOUND";

// ─── Response Types ────────────────────────────────────────────────────────────

export type ServiceErrorResponse = {
  success: false;
  error: {
    code: ServiceErrorCode;
    message: string;
    details?: unknown;
  };
};

export type ServiceResponse =
  | {
      success: true;
    }
  | ServiceErrorResponse;

export type ServiceResponseWithData<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: {
        code: ServiceErrorCode;
        message: string;
        details?: unknown;
      };
    };

// ─── Internal Utilities (not exported) ─────────────────────────────────────────

function logServiceError(context: string, error: unknown): void {
  console.error(`[SERVICE_ERROR] ${context}`, {
    timestamp: new Date().toISOString(),
    error:
      error instanceof Error
        ? { message: error.message, stack: error.stack, name: error.name }
        : error,
  });
}

function isPrismaNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

// ─── Custom Error for Chain/Unwrap ─────────────────────────────────────────────

/**
 * Thrown by `unwrap()` when a service response has `success: false`.
 * Caught by `serviceAction`'s catch block to pass through the original error.
 */
class ServiceError extends Error {
  response: ServiceErrorResponse;
  constructor(response: ServiceErrorResponse) {
    super(response.error.message);
    this.name = "ServiceError";
    this.response = response;
  }
}

// ─── Response Factories ────────────────────────────────────────────────────────

export function createSuccessResponse(): ServiceResponse {
  return { success: true };
}

export function createSuccessResponseWithData<T>(
  data: T,
): ServiceResponseWithData<T> {
  return { success: true, data };
}

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

// ─── Validation Helper ─────────────────────────────────────────────────────────

/**
 * Validates input against a Zod schema.
 * Returns parsed data on success, or a VALIDATION_ERROR with field-level details.
 * Safe to return to the client — `details` contains Zod's flattened errors only.
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): ServiceResponseWithData<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    return createServiceErrorResponse(
      "VALIDATION_ERROR",
      "Invalid input",
      result.error.flatten(),
    );
  }
  return createSuccessResponseWithData(result.data);
}

// ─── Chain Utility ─────────────────────────────────────────────────────────────

/**
 * Extracts `data` from a service response or throws `ServiceError`.
 * Use inside `serviceAction` callbacks to compose multiple service calls
 * without repetitive `if (!result.success) return result` checks.
 *
 * @example
 * return serviceAction(async () => {
 *   const project = unwrap(await getProjectById(id));
 *   const tasks = unwrap(await getTasksByProject(project.id));
 *   return createSuccessResponseWithData(tasks);
 * }, "Failed to load tasks");
 */
export function unwrap<T>(result: ServiceResponseWithData<T>): T {
  if (!result.success) {
    throw new ServiceError(result);
  }
  return result.data;
}

// ─── Service Wrappers ──────────────────────────────────────────────────────────

/**
 * For simple operations that always return data (e.g. findMany → always []).
 * Auto-wraps the result in a success response.
 */
export async function serviceQuery<T>(
  fn: () => Promise<T>,
  errorMessage: string,
): Promise<ServiceResponseWithData<T>> {
  try {
    return createSuccessResponseWithData(await fn());
  } catch (error) {
    logServiceError(errorMessage, error);
    return createServiceErrorResponse("INTERNAL_SERVER_ERROR", errorMessage);
  }
}

/**
 * For operations on a specific resource that may not exist.
 * Handles both null returns (findUnique) and Prisma P2025 throws (update/delete).
 */
export async function serviceQueryOrNotFound<T>(
  fn: () => Promise<T | null>,
  notFoundMessage: string,
  errorMessage: string,
): Promise<ServiceResponseWithData<T>> {
  try {
    const result = await fn();
    if (result === null) {
      return createServiceErrorResponse("NOT_FOUND", notFoundMessage);
    }
    return createSuccessResponseWithData(result);
  } catch (error) {
    if (isPrismaNotFound(error)) {
      return createServiceErrorResponse("NOT_FOUND", notFoundMessage);
    }
    logServiceError(errorMessage, error);
    return createServiceErrorResponse("INTERNAL_SERVER_ERROR", errorMessage);
  }
}

/**
 * For complex operations with validation/auth guards.
 * The callback handles its own success/error returns via `createSuccessResponseWithData`
 * and `createServiceErrorResponse`. Supports `unwrap()` for chaining.
 * Acts as a safety net for unexpected throws.
 */
export async function serviceAction<T>(
  fn: () => Promise<ServiceResponseWithData<T>>,
  errorMessage: string,
): Promise<ServiceResponseWithData<T>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ServiceError) {
      return error.response;
    }
    logServiceError(errorMessage, error);
    return createServiceErrorResponse("INTERNAL_SERVER_ERROR", errorMessage);
  }
}
