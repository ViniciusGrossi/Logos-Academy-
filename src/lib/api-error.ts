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
  console.error(`[${requestId}] unhandled error:`, error instanceof Error ? error.stack ?? error.message : error);
  return new AppError("INTERNAL_ERROR", fallback, requestId);
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
