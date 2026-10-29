/**
 * Streaming assistant endpoint.
 *
 * Responsibilities: validate chat input, stream short answer chunks, and send at
 * most one patch proposal for explicit user confirmation.
 * FR IDs: FR-AST-001, FR-AST-002, FR-AST-004, FR-AI-006.
 */

import { Router } from 'express';
import { AssistantRequestSchema } from '../schemas.js';
import type { AiService } from '../llm/service.js';

/**
 * Serialises a server-sent event.
 *
 * @param event - Event name
 * @param data - JSON-serialisable payload
 * @returns SSE frame
 */
function frame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Splits text into small chunks without breaking inside a word.
 *
 * @param text - Full answer
 * @param size - Target chunk size
 * @returns Chunks that concatenate back to the input
 */
function chunks(text: string, size = 90): string[] {
  const result: string[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + size);
    if (end < text.length) {
      const space = text.lastIndexOf(' ', end);
      if (space > cursor + size / 2) end = space + 1;
    }
    result.push(text.slice(cursor, end));
    cursor = end;
  }
  return result;
}

/**
 * Creates the assistant router.
 *
 * @param service - AI service with fallback and cache
 * @returns Express router
 */
export function assistantRouter(service: AiService): Router {
  const router = Router();
  router.post('/', async (req, res) => {
    const request = AssistantRequestSchema.parse(req.body);
    const result = await service.assistant(request);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(frame('meta', { source: result.source, model: result.model ?? null }));
    for (const chunk of chunks(result.data.text)) {
      if (res.writableEnded) return;
      res.write(frame('token', { text: chunk }));
    }
    if (result.data.patch) {
      res.write(frame('patch', result.data.patch));
    }
    res.write(frame('done', { ok: true }));
    res.end();
  });
  return router;
}
