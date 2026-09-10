import { config } from '../config/env';

type LogContext = Record<string, unknown>;

const REDACTED = '[redacted]';
const SENSITIVE_KEYS = ['token', 'password', 'authorization', 'apikey', 'anonkey', 'email', 'session'];

/** Strips credentials and PII before anything reaches a log sink. */
function redact(context: LogContext): LogContext {
  const safe: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    const isSensitive = SENSITIVE_KEYS.some((needle) => key.toLowerCase().includes(needle));
    safe[key] = isSensitive ? REDACTED : value;
  }
  return safe;
}

/**
 * Structured logger. Debug and info are development-only; warnings and errors
 * are the hook where a crash reporter (Sentry/Crashlytics) gets wired in one place.
 */
export const logger = {
  debug(message: string, context: LogContext = {}): void {
    if (!config.isDevelopment) return;
    globalThis.console.debug(message, redact(context));
  },
  warn(message: string, context: LogContext = {}): void {
    globalThis.console.warn(message, redact(context));
  },
  error(message: string, error: unknown, context: LogContext = {}): void {
    const detail = error instanceof Error ? error.message : String(error);
    globalThis.console.error(message, { ...redact(context), detail });
    // TODO: forward to crash reporter once Sentry/Crashlytics is configured.
  },
};
