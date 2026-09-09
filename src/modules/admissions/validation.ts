import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, asApiError, toApiResult } from "@/src/lib/api-error";

export async function validationBoundary(run: () => Promise<Response>): Promise<Response> {
  try { return await run(); } catch (error: unknown) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      const appError = error instanceof ZodError
        ? new AppError("VALIDATION_ERROR", "Dados inválidos.", crypto.randomUUID())
        : asApiError(error, crypto.randomUUID(), "Dados inválidos.");
      return NextResponse.json(toApiResult(appError), { status: 400 });
    }
    throw error;
  }
}
