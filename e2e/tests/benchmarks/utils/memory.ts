import { type CDPSession, type ElectronApplication } from '@playwright/test';

export const DEFAULT_PHASE = 'begin';

type PhaseBuckets<TSample> = Record<string, TSample[]>;

export type StatsByPhase<TStats> = Record<string, TStats>;

export interface PhasedMemorySampler<TStats> {
  startPhase(name: string): Promise<void>;
  terminate(): Promise<StatsByPhase<TStats>>;
}

export type RendererMemorySample = number;

export interface RendererPhaseStats {
  peakHeapUsedBytes: number;
  count: number;
}

export interface MainMemorySample {
  rss: number;
  heapUsed: number;
  external: number;
  arrayBuffers: number;
}

export interface MainPhaseStats {
  peakRssBytes: number;
  peakHeapUsedBytes: number;
  peakExternalBytes: number;
  peakArrayBuffersBytes: number;
  count: number;
}

interface MainSamplingGlobals {
  __benchMainMem: PhaseBuckets<MainMemorySample>;
  __benchMainMemPhase: string | null;
  __benchMainMemTimer: ReturnType<typeof setInterval> | null;
}

const statsPerPhase = <TSample, TStats>(
  buckets: PhaseBuckets<TSample>,
  statsOf: (samples: TSample[]) => TStats
): StatsByPhase<TStats> =>
  Object.fromEntries(Object.entries(buckets).map(([name, samples]) => [name, statsOf(samples)]));

const rendererStatsOf = (samples: RendererMemorySample[]): RendererPhaseStats => ({
  peakHeapUsedBytes: samples.reduce((mx, used) => Math.max(mx, used), 0),
  count: samples.length
});

const mainStatsOf = (samples: MainMemorySample[]): MainPhaseStats => {
  const peak = (key: keyof MainMemorySample) => samples.reduce((mx, s) => Math.max(mx, s[key] || 0), 0);
  return {
    peakRssBytes: peak('rss'),
    peakHeapUsedBytes: peak('heapUsed'),
    peakExternalBytes: peak('external'),
    peakArrayBuffersBytes: peak('arrayBuffers'),
    count: samples.length
  };
};

const readHeapUsedBytes = async (cdp: CDPSession): Promise<number> => {
  const { metrics } = (await cdp.send('Performance.getMetrics')) as {
    metrics: { name: string; value: number }[];
  };
  const used = metrics.find((m) => m.name === 'JSHeapUsedSize');
  return used ? used.value : 0;
};

export class RendererMemorySampler implements PhasedMemorySampler<RendererPhaseStats> {
  private readonly buckets = new Map<string, RendererMemorySample[]>();
  private current: RendererMemorySample[];
  private running = true;
  private loop!: Promise<void>;

  private constructor(
    private readonly cdp: CDPSession,
    private readonly intervalMs: number,
    initialPhase: string
  ) {
    this.current = [];
    this.buckets.set(initialPhase, this.current);
  }

  static async start(
    cdp: CDPSession,
    intervalMs = 200,
    initialPhase = DEFAULT_PHASE
  ): Promise<RendererMemorySampler> {
    await cdp.send('Performance.enable');
    const sampler = new RendererMemorySampler(cdp, intervalMs, initialPhase);
    sampler.loop = sampler.poll();
    return sampler;
  }

  static async measureRetainedBytes(cdp: CDPSession): Promise<number> {
    await cdp.send('HeapProfiler.enable');
    await cdp.send('HeapProfiler.collectGarbage');
    return readHeapUsedBytes(cdp);
  }

  async startPhase(name: string): Promise<void> {
    this.current = [];
    this.buckets.set(name, this.current);
  }

  async terminate(): Promise<StatsByPhase<RendererPhaseStats>> {
    this.running = false;
    await this.loop;
    return statsPerPhase(Object.fromEntries(this.buckets), rendererStatsOf);
  }

  private async poll(): Promise<void> {
    while (this.running) {
      this.current.push(await readHeapUsedBytes(this.cdp));
      await new Promise((resolve) => setTimeout(resolve, this.intervalMs));
    }
  }
}

export class MainMemorySampler implements PhasedMemorySampler<MainPhaseStats> {
  private constructor(private readonly electronApp: ElectronApplication) {}

  static async start(
    electronApp: ElectronApplication,
    intervalMs = 100,
    initialPhase = DEFAULT_PHASE
  ): Promise<MainMemorySampler> {
    await electronApp.evaluate((_electron, { interval, phase }) => {
      const g = globalThis as unknown as MainSamplingGlobals;
      g.__benchMainMem = { [phase]: [] };
      g.__benchMainMemPhase = phase;
      g.__benchMainMemTimer = setInterval(() => {
        const { rss, heapUsed, external, arrayBuffers } = process.memoryUsage();
        const currentPhase = g.__benchMainMemPhase;
        if (currentPhase) {
          g.__benchMainMem[currentPhase].push({ rss, heapUsed, external, arrayBuffers });
        }
      }, interval);
    }, { interval: intervalMs, phase: initialPhase });

    return new MainMemorySampler(electronApp);
  }

  async startPhase(name: string): Promise<void> {
    await this.electronApp.evaluate((_electron, phase) => {
      const g = globalThis as unknown as MainSamplingGlobals;
      g.__benchMainMem[phase] = [];
      g.__benchMainMemPhase = phase;
    }, name);
  }

  async terminate(): Promise<StatsByPhase<MainPhaseStats>> {
    const buckets = await this.electronApp.evaluate(() => {
      const g = globalThis as unknown as MainSamplingGlobals;
      if (g.__benchMainMemTimer) {
        clearInterval(g.__benchMainMemTimer);
      }
      const collected = g.__benchMainMem || {};
      g.__benchMainMem = {};
      g.__benchMainMemPhase = null;
      g.__benchMainMemTimer = null;
      return collected;
    });

    return statsPerPhase(buckets, mainStatsOf);
  }
}
