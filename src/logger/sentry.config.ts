import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import { Logger } from '@nestjs/common';

const logger = new Logger('SentryConfig');

export function initializeSentry() {
  if (!process.env.SENTRY_DSN) {
    logger.warn('SENTRY_DSN is not set. Sentry will be disabled.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      nodeProfilingIntegration(),
    ],
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || (process.env.NODE_ENV === 'production' ? '0.1' : '1.0')),
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || (process.env.NODE_ENV === 'production' ? '0.1' : '1.0')),
  });
}
