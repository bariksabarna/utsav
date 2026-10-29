/**
 * Plan review endpoint.
 *
 * Responsibilities: validate a compact plan digest and return at most six
 * prioritised risks with a concrete fix for each.
 * FR IDs: FR-DSH-004, FR-AI-003.
 */

import { Router } from 'express';
import { z } from 'zod';
import { PlanDigestSchema } from '../schemas.js';
import type { AiService } from '../llm/service.js';

const ReviewRequestSchema = z.object({
  plan: PlanDigestSchema,
  locale: z.enum(['en', 'hi', 'bn']),
});

/**
 * Creates the review router.
 *
 * @param service - AI service with fallback and cache
 * @returns Express router
 */
export function reviewRouter(service: AiService): Router {
  const router = Router();
  router.post('/', async (req, res) => {
    const request = ReviewRequestSchema.parse(req.body);
    const result = await service.review(request.plan, request.locale);
    res.json({
      risks: result.data,
      source: result.source,
      ...(result.model ? { model: result.model } : {}),
    });
  });
  return router;
}
