declare class BruParserWorker {
    private workerQueues;
    constructor();
    private getWorkerQueue;
    private enqueueTask;
    parseRequest(data: any): Promise<any>;
    stringifyRequest(data: any): Promise<any>;
    cleanup(): Promise<void>;
}
export default BruParserWorker;
