export type ServiceErrorCode = "INTERNAL_SERVER_ERROR" | "UNAUTHORIZED";

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
      data: any;
    }
  | ServiceErrorResponse;

export type ServiceResponseWithData<T> =
  | {
      success: true;
      data: T;
    }
  | ServiceErrorResponse;

export function createSuccessResponse<T>(data: T): ServiceResponse {
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
      ...(details ? { details } : {}),
    },
  };
}
