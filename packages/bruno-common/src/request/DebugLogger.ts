type Logs = { title: string; data: unknown; date: number }[];
type LogStages = { stage: string; logs: Logs }[];

export class DebugLogger {
  private logs: LogStages = [];

  public log(title: string, data?: unknown): void {
    this.logs[this.logs.length - 1].logs.push({ title, data, date: Date.now() });
  }

  public addStage(stage: string): void {
    this.logs.push({ stage, logs: [] });
  }

  toJSON() {
    return this.logs;
  }
}
