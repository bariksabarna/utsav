/**
 * Error handling for the Utsav API.
 *
 * Responsibilities: return RFC 7807 problem details, hide internal errors, and
 * preserve a request id for support without leaking request content.
 * FR IDs: FR-SEC-003, FR-SEC-005.
 */

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/** An expected HTTP error with a safe public message. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly detail: string;

  constructor(status: number, code: string, title: string, detail: string) {
    super(title);
    this.status = status;
    this.code = code;
    this.title = title;
    this.detail = detail;
  }
}

/**
 * Sends an RFC 7807 problem document.
 *
 * @param res - Express response
 * @param status - HTTP status
 * @param body - Problem fields
 * @param requestId - Correlation id
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function sendProblem(
  res: Response,
  status: number,
  body: Record<string, unknown>,
  requestId: string,
): void {
  res
    .status(status)
    .type('application/problem+json')
    .json({ type: 'about:blank', status, requestId, ...body });
}

/** Converts validation failures into a safe 400 problem. */
export function validationError(
  message = 'The request contains invalid fields.',
): HttpError {
  return new HttpError(400, 'VALIDATION_ERROR', 'Invalid request', message);
}

/** Handles unknown routes. */
export function notFoundHandler(req: Request, res: Response): void {
  sendProblem(
    res,
    404,
    {
      code: 'NOT_FOUND',
      title: 'Route not found',
      detail: `No route matches ${req.method} ${req.path}.`,
    },
    String(res.locals.requestId ?? 'unknown'),
  );
}

/** Central error handler. */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = String(res.locals.requestId ?? 'unknown');
  if (error instanceof ZodError) {
    sendProblem(
      res,
      400,
      {
        code: 'VALIDATION_ERROR',
        title: 'Invalid request',
        detail: 'One or more fields are invalid.',
        errors: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        requestId,
      },
      requestId,
    );
    return;
  }

  if (error instanceof HttpError) {
    sendProblem(
      res,
      error.status,
      { code: error.code, title: error.title, detail: error.detail },
      requestId,
    );
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    sendProblem(
      res,
      400,
      {
        code: 'INVALID_JSON',
        title: 'Malformed JSON',
        detail: 'The request body must be valid JSON.',
      },
      requestId,
    );
    return;
  }

  if (isRecord(error) && error.status === 413) {
    sendProblem(
      res,
      413,
      {
        code: 'PAYLOAD_TOO_LARGE',
        title: 'Request too large',
        detail: 'Keep JSON request bodies under 32 kB.',
      },
      requestId,
    );
    return;
  }

  req.log?.error({ err: error, requestId }, 'unhandled request error');
  sendProblem(
    res,
    500,
    {
      code: 'INTERNAL_ERROR',
      title: 'Something went wrong',
      detail: 'The server could not complete the request. Please retry shortly.',
    },
    requestId,
  );
}
