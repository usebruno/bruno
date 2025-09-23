/// <reference types="node" />
import { Worker } from 'node:worker_threads';
interface QueuedTask {
    priority: number;
    scriptPath: string;
    data: any;
    taskType: 'parse' | 'stringify';
    resolve?: (value: any) => void;
    reject?: (reason?: any) => void;
}
declare class WorkerQueue {
    private queue;
    private isProcessing;
    private workers;
    constructor();
    getWorkerForScriptPath(scriptPath: string): Promise<Worker>;
    enqueue(task: QueuedTask): Promise<unknown>;
    processQueue(): Promise<void>;
    runWorker({ scriptPath, data, taskType }: {
        scriptPath: string;
        data: any;
        taskType: 'parse' | 'stringify';
    }): Promise<unknown>;
    cleanup(): Promise<void>;
}
export default WorkerQueue;
