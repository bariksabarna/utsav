/**
 * Express application factory.
 *
 * Responsibilities: compose security middleware, rate limits, routes, static
 * hosting, and error handling. Dependencies are injected so tests never call a
 * live model or the network.
 * FR IDs: FR-SEC-001, FR-SEC-002, FR-SEC-003, FR-SEC-005.
 */

import { existsSync } from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pino, { type Logger } from 'pino';
import { pinoHttp } from 'pino-http';
import { readConfig, type ServerConfig } from './config.js';
import { HttpError, errorHandler, notFoundHandler } from './middleware/errors.js';
import { requestId } from './middleware/request-id.js';
import { FallbackProvider } from './llm/fallback.js';
import { GeminiProvider } from './llm/gemini.js';
import { AiService } from './llm/service.js';
import { assistantRouter } from './routes/assistant.js';
import { ideasRouter } from './routes/ideas.js';
import { reviewRouter } from './routes/review.js';

/** Options for the app factory. */
export interface AppOptions {
  config?: ServerConfig;
  service?: AiService;
  logger?: Logger;
}

function rateLimitHandler(_req: Request, res: Response): void {
  res
    .status(429)
    .type('application/problem+json')
    .json({
      type: 'about:blank',
      status: 429,
      code: 'RATE_LIMITED',
      title: 'Too many requests',
      detail: 'Please wait a minute before trying again.',
      requestId: String(res.locals.requestId ?? 'unknown'),
    });
}

function requireJson(req: Request, _res: Response, next: NextFunction): void {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && !req.is('application/json')) {
    next(new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'JSON required', 'Send a JSON body.'));
    return;
  }
  next();
}

/**
 * Builds the API service from configuration.
 *
 * @param config - Server configuration
 * @param logger - Logger used for fallback warnings
 * @returns AI service with primary or fallback-only provider
 */
export function buildAiService(config: ServerConfig, logger: Logger): AiService {
  const fallback = new FallbackProvider();
  const primary = config.geminiApiKey
    ? new GeminiProvider({
        apiKey: config.geminiApiKey,
        models: [config.primaryModel, config.fallbackModel],
      })
    : null;

  return new AiService({
    primary,
    fallback,
    ttlMs: config.cacheTtlMs,
    onFallback: (error) => {
      logger.warn(
        { reason: error instanceof Error ? error.message : 'unknown' },
        'AI provider failed; using curated fallback',
      );
    },
  });
}

/**
 * Creates the Express app.
 *
 * @param options - Injected config, service, and logger
 * @returns Configured Express application
 */
export function createApp(options: AppOptions = {}): express.Express {
  const config = options.config ?? readConfig();
  const logger =
    options.logger ??
    pino({
      level: config.nodeEnv === 'test' ? 'silent' : config.logLevel,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body',
          'res.headers["set-cookie"]',
        ],
        remove: true,
      },
    });
  const service = options.service ?? buildAiService(config, logger);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (_req, res) => String(res.locals.requestId ?? 'unknown'),
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'"],
          'style-src': ["'self'"],
          'img-src': ["'self'", 'data:'],
          'connect-src': ["'self'"],
          'font-src': ["'self'"],
          'manifest-src': ["'self'"],
          'worker-src': ["'self'"],
          'object-src': ["'none'"],
          'frame-ancestors': ["'none'"],
          'base-uri': ["'self'"],
          'form-action': ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
      hsts: config.nodeEnv === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  );
  app.use(compression());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || config.allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new HttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origin not allowed', 'CORS blocked.'));
      },
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api', requireJson);
  app.use(express.json({ limit: '32kb', type: ['application/json'] }));

  const globalLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
  });
  const aiLimiter = rateLimit({
    windowMs: 60_000,
    limit: Math.max(1, config.aiRequestsPerMinute),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: rateLimitHandler,
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), ai: config.geminiApiKey ? 'configured' : 'fallback' });
  });
  app.use('/api', globalLimiter);
  app.use(['/api/ideas', '/api/assistant', '/api/review'], aiLimiter);
  app.use('/api/ideas', ideasRouter(service));
  app.use('/api/assistant', assistantRouter(service));
  app.use('/api/review', reviewRouter(service));

  const distDir = path.resolve(process.cwd(), 'dist');
  if (existsSync(path.join(distDir, 'index.html'))) {
    app.use(
      express.static(distDir, {
        index: false,
        maxAge: '1y',
        immutable: true,
        setHeaders(res, filePath) {
          if (!filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        next();
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
