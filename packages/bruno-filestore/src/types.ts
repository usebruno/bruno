export type CollectionFormat = 'bru' | 'yml';

export interface ParseOptions {
  format?: CollectionFormat;
}

export interface StringifyOptions {
  format?: CollectionFormat;
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