import { NextResponse } from 'next/server';

export interface SuccessResponse<T> {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorResponse {
  ok: false;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const body: SuccessResponse<T> = { ok: true, data, meta };
  return NextResponse.json(body, { status });
}

export function apiError(code: string, message: string, fieldErrors?: Record<string, string[]>, status = 400) {
  const body: ErrorResponse = { ok: false, code, message, fieldErrors };
  return NextResponse.json(body, { status });
}
