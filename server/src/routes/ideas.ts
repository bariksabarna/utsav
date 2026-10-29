/**
 * Ideas endpoint.
 *
 * Responsibilities: validate the request, return personalised ideas, and expose
 * whether the answer came from Gemini or the curated fallback.
 * FR IDs: FR-IDE-001, FR-IDE-004, FR-AI-003.
 */

import { Router } from 'express';
import { IdeasRequestSchema } from '../schemas.js';
import type { AiService } from '../llm/service.js';

/**
 * Creates the ideas router.
 *
 * @param service - AI service with fallback and cache
 * @returns Express router
 */
export function ideasRouter(service: AiService): Router {
  const router = Router();
  router.post('/', async (req, res) => {
    const request = IdeasRequestSchema.parse(req.body);
    const result = await service.ideas(request);
    res.json({
      ideas: result.data,
      source: result.source,
      ...(result.model ? { model: result.model } : {}),
    });
  });
  return router;
}
