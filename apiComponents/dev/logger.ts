// logger.ts
export interface LogEntry {
  text: string;
  level?: 'info' | 'warn' | 'error';
}

export type Logger = {
  log: (text: string) => Generator<LogEntry>;
  warn: (text: string) => Generator<LogEntry>;
  error: (text: string) => Generator<LogEntry>;
}

export function createLogger(category?: string): Logger {
  const prefix = category ? `[${category}] ` : '';
  
  return {
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

// Updated type definition
export type LoggerFunction = (logger: Logger) => AsyncGenerator<LogEntry>;
