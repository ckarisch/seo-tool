import { isDevelopment, isTest } from "@/crawler/errorChecker";
import { recursiveCrawlResponse } from "@/crawler/recursiveCrawl";

// logger.ts
export interface LogEntry {
  text: string;
  level?: 'info' | 'warn' | 'error';
}

export type Logger = {
  verbose: (text: string) => Generator<LogEntry>;
  log: (text: string) => Generator<LogEntry>;
  warn: (text: string) => Generator<LogEntry>;
  error: (text: string) => Generator<LogEntry>;
}

export function createLogger(category?: string): Logger {
  const prefix = category ? `[${category}] ` : '';

  return {
    *verbose(text: string): Generator<LogEntry> {
      const message = `${prefix}${text}`;
      if (isDevelopment || isTest) {
        console.log(message);
        yield { text: message };
      }
    },
    *log(text: string): Generator<LogEntry> {
      const message = `${prefix}${text}`;
      console.log(message);
      yield { text: message };
    },
    *warn(text: string): Generator<LogEntry> {
      const message = `${prefix}${text}`;
      console.warn(message);
      yield { text: message, level: 'warn' };
    },
    *error(text: string): Generator<LogEntry> {
      const message = `${prefix}${text}`;
      console.error(message);
      yield { text: message, level: 'error' };
    }
  };
}

export type LoggerFunctionWithReturn<T> = (logger: Logger) => AsyncGenerator<LogEntry, T, unknown>;

export type CrawlResponseYieldType = LogEntry | { type: 'result', value: recursiveCrawlResponse };

// Type guard function
export function isLogEntry(value: CrawlResponseYieldType): value is LogEntry {
  return 'timestamp' in value && 'message' in value; // adjust properties based on your LogEntry type
}
