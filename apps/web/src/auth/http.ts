import { NextResponse } from "next/server";
import { z } from "zod";

import { ApiError, isApiError } from "@/src/auth/errors";

type ParseJsonOptions = {
  allowEmpty?: boolean;
  emptyValue?: unknown;
};

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema,
  options?: ParseJsonOptions,
): Promise<z.infer<TSchema>> {
  const contentType = request.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    if (!(options?.allowEmpty && contentType === null)) {
      throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Expected an application/json request body.");
    }
  }

  const rawBody = await request.text();
  const trimmedBody = rawBody.trim();

  let parsedBody: unknown;

  if (!trimmedBody) {
    if (!options?.allowEmpty) {
      throw new ApiError(400, "EMPTY_BODY", "Request body is required.");
    }

    parsedBody = options.emptyValue ?? {};
  } else {
    try {
      parsedBody = JSON.parse(trimmedBody);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON.");
      }

      throw error;
    }
  }

  const result = schema.safeParse(parsedBody);

  if (!result.success) {
    throw new ApiError(400, "INVALID_BODY", "Request body failed validation.", result.error.flatten());
  }

  return result.data;
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return NextResponse.json(body, init);
}

export function errorResponse(error: unknown): Response {
  if (isApiError(error)) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.status },
    );
  }

  throw error;
}
