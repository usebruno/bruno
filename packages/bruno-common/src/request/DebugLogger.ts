type Logs = { title: string; data: unknown; date: number }[];
type LogStages = { stage: string; logs: Logs }[];

export class DebugLogger {
  private logs: LogStages = [];

  public log(title: string, data?: unknown): void {
    // We use structuredClone here to prevent any further changes through object references
    const log = structuredClone({ title, data, date: Date.now() });
    this.logs[this.logs.length - 1].logs.push(log);
  }

  public addStage(stage: string): void {
    this.logs.push({ stage, logs: [] });
  }

  toJSON() {
    return this.logs;
  }
}
