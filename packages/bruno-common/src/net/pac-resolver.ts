import axios from 'axios';
import { readFile } from 'fs/promises';
import https, { type AgentOptions } from 'https';
import { fileURLToPath } from 'url';
import { createPacResolver } from 'pac-resolver';
import { getQuickJS } from 'quickjs-emscripten';

const CACHE = new Map<string, { wrapper: Promise<PacWrapper>; ts: number }>();

type TlsOptions = {
  ca?: string | string[];
  rejectUnauthorized?: boolean;
  minVersion?: string;
};

export type PacWrapper = {
  resolve: (url: string) => Promise<string[]>;
};

async function downloadPac(pacUrl: string, tlsOptions: TlsOptions, timeoutMs: number): Promise<string> {
  if (pacUrl.startsWith('file://')) {
    return readFile(fileURLToPath(pacUrl), 'utf8');
  }

  const config: Record<string, any> = {
    timeout: timeoutMs,
    proxy: false,
    responseType: 'text',
    maxRedirects: 3
  };

  if (pacUrl.startsWith('https://')) {
    const agentOpts: AgentOptions = {
      ca: tlsOptions.ca,
      rejectUnauthorized: tlsOptions.rejectUnauthorized,
      minVersion: tlsOptions.minVersion as AgentOptions['minVersion']
    };
    config.httpsAgent = new https.Agent(agentOpts);
  }

  try {
    const response = await axios.get(pacUrl, config);
    return response.data;
  } catch (err: any) {
    if (err.response) throw new Error(`Failed to fetch PAC (${err.response.status})`);
    throw err;
  }
}

export type GetPacResolverParams = {
  pacUrl: string;
  httpsAgentRequestFields?: TlsOptions;
  opts?: { cacheTtlMs?: number; timeoutMs?: number };
};

export async function getPacResolver({ pacUrl, httpsAgentRequestFields = {}, opts = {} }: GetPacResolverParams): Promise<PacWrapper> {
  if (!pacUrl) throw new Error('pacUrl must be provided');

  const cacheTtlMs = opts.cacheTtlMs ?? 5 * 60 * 1000;
  const caRaw = httpsAgentRequestFields.ca;
  const caNorm = Array.isArray(caRaw) ? caRaw.join('|') : (caRaw ?? '');
  const key = `url:${pacUrl}|ca:${caNorm}|ru:${httpsAgentRequestFields.rejectUnauthorized ?? ''}|mv:${httpsAgentRequestFields.minVersion ?? ''}`;
  const now = Date.now();
  const cached = CACHE.get(key);
  if (cached && now - cached.ts < cacheTtlMs) return cached.wrapper;

  const wrapperPromise: Promise<PacWrapper> = (async () => {
    const script = await downloadPac(pacUrl, httpsAgentRequestFields, opts.timeoutMs ?? 5000);

    // pac-resolver v7 uses QuickJS WASM sandbox — not affected by CVE GHSA-9j49-mfvp-vmhm (<v5)
    const qjs = await getQuickJS();
    const resolverFn = createPacResolver(qjs, script);

    return {
      resolve: async (url: string) => {
        const host = new URL(url).hostname;
        const out = await resolverFn(url, host);
        if (!out || typeof out !== 'string') return [];
        return out.split(';').map((s) => s.trim()).filter(Boolean);
      }
    };
  })();

  CACHE.set(key, { wrapper: wrapperPromise, ts: now });

  try {
    return await wrapperPromise;
  } catch (err) {
    CACHE.delete(key);
    throw err;
  }
}

export function clearPacCache(keyPrefix?: string): void {
  if (!keyPrefix) {
    CACHE.clear();
    return;
  }
  for (const key of Array.from(CACHE.keys())) {
    if (key.startsWith(keyPrefix)) CACHE.delete(key);
  }
}

export const _CACHE = CACHE;
