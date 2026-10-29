/**
 * Correlation id middleware.
 *
 * Responsibilities: attach a validated request id for logs and problem details.
 * FR IDs: FR-SEC-005.
 */

import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const SAFE_ID = /^[A-Za-z0-9._:-]{1,100}$/;

/** Adds `x-request-id` and stores it on `res.locals`. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const id = incoming && SAFE_ID.test(incoming) ? incoming : randomUUID();
  res.locals.requestId = id;
  res.setHeader('x-request-id', id);
  next();
}
