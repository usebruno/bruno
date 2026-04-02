import dns from 'node:dns';

/**
 * Fast DNS lookup that bypasses the libuv thread pool.
 *
 * Tries dns.resolve4 then dns.resolve6 (async, c-ares based),
 * falls back to dns.lookup for /etc/hosts and mDNS hostnames.
 *
 * NOTE: `options.family` is not currently respected — the function always
 * tries IPv4 first regardless of the caller's preference. This is safe today
 * because Bruno's HTTP agents use the default family (0), but should be
 * addressed if any code path starts specifying a family.
 */
export function fastLookup(
  hostname: string,
  options: dns.LookupOptions | undefined,
  callback: (err: Error | null, address: string | dns.LookupAddress[], family?: number) => void
): void {
  dns.resolve4(hostname, (err4, addresses4) => {
    if (!err4 && addresses4?.length) {
      return options?.all
        ? callback(null, addresses4.map((a) => ({ address: a, family: 4 })))
        : callback(null, addresses4[0], 4);
    }

    dns.resolve6(hostname, (err6, addresses6) => {
      if (!err6 && addresses6?.length) {
        return options?.all
          ? callback(null, addresses6.map((a) => ({ address: a, family: 6 })))
          : callback(null, addresses6[0], 6);
      }

      // Forward to standard dns.lookup for /etc/hosts, mDNS, and other
      // non-public hostnames that c-ares cannot resolve.
      dns.lookup(hostname, options ?? {}, (err, address, family) => {
        callback(err, address, family);
      });
    });
  });
}
