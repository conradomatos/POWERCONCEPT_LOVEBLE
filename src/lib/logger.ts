export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  operation?: string;
  userId?: string;
  userAction?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  error?: Error | unknown;
  context?: LogContext;
  stack?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, undefined, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, undefined, context);
  }

  warn(message: string, error?: unknown, context?: LogContext): void {
    this.log('warn', message, error, context);
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.log('error', message, error, context);
  }

  private log(
    level: LogLevel,
    message: string,
    error?: unknown,
    context?: LogContext,
  ): void {
    const entry: LogEntry = {
      level,
      message,
      error,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
      stack: error instanceof Error ? error.stack : undefined,
    };

    // Store in memory (limited size)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output in development only
    if (this.isDevelopment) {
      this.consoleLog(entry);
    }

    // Could extend for production logging service
  }

  private consoleLog(entry: LogEntry): void {
    const prefix = `[${entry.context?.timestamp}] [${entry.level.toUpperCase()}]`;
    const details = entry.context ? JSON.stringify(entry.context) : '';

    switch (entry.level) {
      case 'debug':
        console.debug(prefix, entry.message, details);
        break;
      case 'info':
        console.info(prefix, entry.message, details);
        break;
      case 'warn':
        console.warn(prefix, entry.message, entry.error, details);
        break;
      case 'error':
        console.error(prefix, entry.message, entry.error, details);
        break;
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }
    // CSV format
    const headers = ['timestamp', 'level', 'message', 'operation'];
    const rows = this.logs.map((log) => [
      log.context?.timestamp || '',
      log.level,
      log.message,
      log.context?.operation || '',
    ]);
    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    return csvContent;
  }
}

export const logger = new Logger();
