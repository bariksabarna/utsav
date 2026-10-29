/**
 * Runtime configuration for the Utsav API.
 *
 * Responsibilities: read environment variables once, apply safe defaults, and
 * expose typed settings to the app. Secrets never leave this module.
 * FR IDs: FR-SEC-002, FR-SEC-004.
 */

/** Typed server configuration. */
export interface ServerConfig {
  port: number;
  nodeEnv: string;
  logLevel: string;
  allowedOrigins: string[];
  geminiApiKey: string;
  primaryModel: string;
  fallbackModel: string;
  aiRequestsPerMinute: number;
  cacheTtlMs: number;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * Reads configuration from an environment object.
 *
 * @param env - Process environment or test double
 * @returns Validated server settings with safe defaults
 */
export function readConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const origins = (env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((origin) => trimTrailingSlash(origin.trim()))
    .filter(Boolean);

  return {
    port: Number(env.PORT ?? 8080),
    nodeEnv: env.NODE_ENV ?? 'development',
    logLevel: env.LOG_LEVEL ?? 'info',
    allowedOrigins: origins,
    geminiApiKey: env.GEMINI_API_KEY ?? '',
    primaryModel: env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    fallbackModel: env.GEMINI_FALLBACK_MODEL ?? 'gemini-2.5-flash-lite',
    aiRequestsPerMinute: Number(env.AI_RPM_BUDGET ?? 10),
    cacheTtlMs: Number(env.AI_CACHE_TTL_MS ?? 300_000),
  };
}
