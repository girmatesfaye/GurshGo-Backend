import type { Response } from "express";

type ApiErrorPayload = {
  code: string;
  message: string;
  field: string | null;
};

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  error: null;
  meta: Record<string, unknown> | null;
};

type ApiErrorEnvelope = {
  success: false;
  data: null;
  error: ApiErrorPayload;
  meta: null;
};

export function sendSuccess<T>(
  response: Response,
  statusCode: number,
  data: T,
  meta: Record<string, unknown> | null = null,
) {
  const payload: ApiSuccessEnvelope<T> = {
    success: true,
    data,
    error: null,
    meta,
  };

  return response.status(statusCode).json(payload);
}

export function sendError(
  response: Response,
  statusCode: number,
  code: string,
  message: string,
  field: string | null = null,
) {
  const payload: ApiErrorEnvelope = {
    success: false,
    data: null,
    error: {
      code,
      message,
      field,
    },
    meta: null,
  };

  return response.status(statusCode).json(payload);
}
