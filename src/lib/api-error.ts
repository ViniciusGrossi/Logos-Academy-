import type { ApiError, ApiResult } from "@/specs/api.contracts";

type ApiErrorCode = ApiError["code"];

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly requestId: string,
    public readonly fieldErrors?: ApiError["fieldErrors"],
  ) {
    super(message);
  }
}

/** Converte falhas de parsing no limite HTTP em uma resposta de cliente. */
export function asApiError(error: unknown, requestId: string, fallback: string): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof SyntaxError) return new AppError("VALIDATION_ERROR", "JSON inválido.", requestId);
  logOperationError("http.unhandled", requestId);
  return new AppError("INTERNAL_ERROR", fallback, requestId);
}

const SAFE_PROVIDER_CODES = new Set([
  "PGRST202", "23505", "23514", "42501", "22023", "P0002", "40001",
  "over_email_send_rate_limit", "over_request_rate_limit", "email_exists", "user_already_exists",
]);

/** Never forward provider messages, details, exceptions or stacks containing student data. */
export function logOperationError(operation: "http.unhandled" | "admissions.rpc" | "admissions.auth", requestId: string, code?: string): void {
  console.error({ operation, requestId, code: code && SAFE_PROVIDER_CODES.has(code) ? code : "UNEXPECTED" });
}

export function toApiResult<T>(error: AppError): ApiResult<T> {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      requestId: error.requestId,
    },
  };
}
