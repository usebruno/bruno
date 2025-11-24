export type FileFormat = 'bru' | 'yml';

export interface ParseOptions {
  format?: FileFormat;
}

export interface StringifyOptions {
  format?: FileFormat;
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