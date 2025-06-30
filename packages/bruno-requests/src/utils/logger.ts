const debug = require('debug');

export interface T_LogEntry {
  timestamp: number;
  type: T_LogLevel;
  message: string;
}

export type T_LogLevel = string;

export interface T_LoggerInstance {
  add(type: T_LogLevel, message?: string): void;
  reset(): void;
  getAll(): T_LogEntry[];
}

interface DebugFunction {
  (message: string): void;
  enabled: boolean;
}

class Logger implements T_LoggerInstance {
  private logs: T_LogEntry[] = [];
  private readonly id: string;
  private readonly debugFn: DebugFunction;
  private readonly maxLogs: number;

  constructor(id: string, maxLogs: number = 1000) {
    this.id = id;
    this.maxLogs = maxLogs;
    this.debugFn = debug(`bruno`) as DebugFunction;
  }

  add(type: T_LogLevel, message = ''): void {
    const timestamp = Date.now();
    const entry: T_LogEntry = {
      timestamp,
      type,
      message
    };
    
    this.logs.push(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (this.debugFn.enabled) {
      const logMessage = `[${new Date(timestamp).toISOString()}] [${type.toUpperCase()}] ${message}`;
      this.debugFn(logMessage);
    }
  }

  reset(): void {
    this.logs.length = 0;
    if (this.debugFn.enabled) {
      this.debugFn('Logger reset');
    }
    loggerInstances.delete(this.id);
  }

  getAll(): T_LogEntry[] {
    return [...this.logs];
  }
}

// Registry to store logger instances by ID
const loggerInstances = new Map<string, Logger>();

/**
 * Creates or retrieves a logger instance for the given ID
 * @param id - Unique identifier for the logger instance
 * @param maxLogs - Maximum number of log entries to keep in memory
 * @returns Logger instance
 */
function createLogger(id: string, maxLogs = 1000): T_LoggerInstance {
  if (!loggerInstances.has(id)) {
    loggerInstances.set(id, new Logger(id, maxLogs));
  }
  
  return loggerInstances.get(id)!;
}

/**
 * Cleanup function to remove unused logger instances
 */
export function cleanupLoggers(): void {
  loggerInstances.clear();
}

export default createLogger;