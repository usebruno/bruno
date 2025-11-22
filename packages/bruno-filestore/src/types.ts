export interface ParseOptions {
  format?: 'bru' | 'yml';
}

export interface StringifyOptions {
  format?: 'bru' | 'yml';
}

export interface WorkerTask {
  data: any;
  priority: number;
  scriptPath: string;
  taskType?: 'parse' | 'stringify';
  resolve?: (value: any) => void;
  reject?: (reason?: any) => void;
}

export interface Lane {
  maxSize: number;
} 