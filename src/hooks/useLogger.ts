import { useCallback } from 'react';
import { logger } from '@/lib/logger';
import type { LogContext } from '@/lib/logger';

export function useLogger(operationName: string) {
  const logDebug = useCallback(
    (message: string, context?: LogContext) => {
      logger.debug(message, { operation: operationName, ...context });
    },
    [operationName],
  );

  const logError = useCallback(
    (message: string, error?: unknown, context?: LogContext) => {
      logger.error(message, error, { operation: operationName, ...context });
    },
    [operationName],
  );

  const logWarn = useCallback(
    (message: string, error?: unknown, context?: LogContext) => {
      logger.warn(message, error, { operation: operationName, ...context });
    },
    [operationName],
  );

  const logInfo = useCallback(
    (message: string, context?: LogContext) => {
      logger.info(message, { operation: operationName, ...context });
    },
    [operationName],
  );

  return { logDebug, logError, logWarn, logInfo };
}
