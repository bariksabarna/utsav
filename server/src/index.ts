/**
 * Utsav API process entry point.
 *
 * Responsibilities: start the HTTP server, log only operational metadata, and
 * shut down gracefully on platform signals.
 * FR IDs: FR-SEC-005, FR-DEP-002.
 */

import pino from 'pino';
import { createApp } from './app.js';
import { readConfig } from './config.js';

const config = readConfig();
const logger = pino({ level: config.logLevel });
const app = createApp({ config, logger });
const server = app.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      environment: config.nodeEnv,
      ai: config.geminiApiKey ? 'configured' : 'fallback',
    },
    'Utsav API listening',
  );
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'shutting down');
  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'shutdown failed');
      process.exitCode = 1;
    }
    process.exit();
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (error) => {
  logger.error({ err: error }, 'unhandled rejection');
});
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaught exception');
  process.exitCode = 1;
  server.close(() => process.exit(1));
});
