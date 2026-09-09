export type RpcErrorCode = "FORBIDDEN" | "VALIDATION_ERROR" | "CONFLICT" | "NOT_FOUND" | "INTERNAL_ERROR";

export function mapRpcError(code: string | undefined): RpcErrorCode {
  if (code === "42501") return "FORBIDDEN";
  if (code === "22023") return "VALIDATION_ERROR";
  if (code === "23505" || code === "23514") return "CONFLICT";
  if (code === "P0002") return "NOT_FOUND";
  return "INTERNAL_ERROR";
}
