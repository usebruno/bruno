import { cleanJson } from './runtime/utils';

type TimingName = 'request' | 'pre-script' | 'post-script' | 'test' | 'total';

export class Timings {
  private startTimings: Record<string, number> = {};
  private timings: Record<string, number> = {};

  public startMeasure(name: TimingName): void {
    this.startTimings[name] = performance.now();
  }

  public stopMeasure(name: TimingName): void {
    const measurement = this.startTimings[name];
    if (!measurement) {
      throw new Error(`No measurement started for "${name}"`);
    }
    this.timings[name] = Math.round(performance.now() - measurement);
  }

  public stopAll(): void {
    for (const [name, measurement] of Object.entries(this.startTimings)) {
      if (this.timings[name] === undefined) {
        this.timings[name] = Math.round(performance.now() - measurement);
      }
    }
  }

  public getClean() {
    return cleanJson(this.timings);
  }
}
