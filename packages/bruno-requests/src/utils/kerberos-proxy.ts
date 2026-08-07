/**
 * Kerberos (SPNEGO) authentication for forward proxies.
 *
 * Mints a Kerberos-only SPNEGO token per proxy connection and sends it
 * preemptively as `Proxy-Authorization: Negotiate <token>`. Tokens come from
 * the OS credential cache (GSSAPI/kinit on Linux/macOS, SSPI on Windows) via
 * the optional `kerberos` N-API package, loaded lazily only when the feature
 * is enabled. NTLM is not supported.
 */

import { promises as dnsPromises } from 'node:dns';

type KerberosLoader = () => Promise<any>;

// Optional native dependency: load lazily so a failed install only surfaces
// when the feature is actually used.
// @ts-ignore - no bundled types
const defaultKerberosLoader: KerberosLoader = () => import('kerberos');

let kerberosLoader: KerberosLoader = defaultKerberosLoader;
let kerberosModulePromise: Promise<any> | null = null;

/** Test hook: inject a fake kerberos module loader. Pass null to reset. */
export function __setKerberosLoaderForTests(loader: KerberosLoader | null): void {
  kerberosLoader = loader ?? defaultKerberosLoader;
  kerberosModulePromise = null;
}

/** Loads the kerberos module once; a failed load is not cached. */
function loadKerberos(): Promise<any> {
  if (!kerberosModulePromise) {
    kerberosModulePromise = kerberosLoader().catch((err: any) => {
      kerberosModulePromise = null;
      throw new Error(
        `Kerberos proxy authentication is enabled but the optional "kerberos" module could not be loaded: ${err?.message}`
      );
    });
  }
  return kerberosModulePromise;
}

/** Guards against CNAME record loops; real chains are one or two hops. */
const MAX_CNAME_DEPTH = 8;

/**
 * Best-effort hostname canonicalization before SPN construction, applied on
 * Windows only (SSPI does not canonicalize; libkrb5 on GSSAPI platforms
 * does). Follows CNAME chains via `dns.resolveCname`; for bare shortnames —
 * which c-ares cannot suffix-qualify — falls back to `dns.lookup` (OS
 * resolver, suffix-search aware) plus reverse DNS, trusting internal PTR
 * records. Returns the input unchanged when resolution fails.
 */
export async function canonicalizeSpnHost(hostname: string): Promise<string> {
  // SPNs are registered without the rooted-DNS trailing dot.
  let current = hostname.replace(/\.$/, '');
  for (let depth = 0; depth < MAX_CNAME_DEPTH; depth++) {
    let targets: string[];
    try {
      targets = await dnsPromises.resolveCname(current);
    } catch {
      break; // no CNAME record under this exact name
    }
    if (!targets || !targets.length || targets[0] === current) {
      break;
    }
    current = targets[0];
  }

  if (current === hostname.replace(/\.$/, '') && !current.includes('.')) {
    try {
      const { address } = await dnsPromises.lookup(hostname);
      const ptrNames = await dnsPromises.reverse(address);
      if (ptrNames && ptrNames.length && ptrNames[0]) {
        return ptrNames[0];
      }
    } catch {
      // no usable A/PTR record — fall through to the configured name
    }
  }

  return current;
}

/** SPN for the proxy host: `HTTP@host` (GSSAPI) or `HTTP/host` (SSPI). */
export function kerberosSpnForHost(proxyHostname: string): string {
  const separator = process.platform === 'win32' ? '/' : '@';
  return `HTTP${separator}${proxyHostname.replace(/\.$/, '')}`;
}

/**
 * Mints a SPNEGO token and returns the `Proxy-Authorization` header value.
 * Tokens are single-use, so callers mint one per new proxy connection.
 */
export async function getKerberosProxyAuthHeader(proxyHostname: string): Promise<string> {
  const kerberos = await loadKerberos();
  const hostname = process.platform === 'win32' ? await canonicalizeSpnHost(proxyHostname) : proxyHostname;
  const spn = kerberosSpnForHost(hostname);
  try {
    const client = await kerberos.initializeClient(spn);
    const token = await client.step('');
    return `Negotiate ${token}`;
  } catch (err: any) {
    throw new Error(
      `Failed to acquire Kerberos/SPNEGO token for proxy (SPN: ${spn}). `
      + `Check that you have a valid ticket (e.g. kinit) and that the SPN is correct. `
      + `Original error: ${err?.message}`
    );
  }
}
