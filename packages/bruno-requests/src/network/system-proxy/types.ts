export interface ProxyConfiguration {
  http_proxy?: string | null;
  https_proxy?: string | null;
  no_proxy?: string | null;
  source: 'environment' | 'windows-system' | 'macos-system' | 'linux-system';
}

export interface ProxyResolver {
  detect(opts?: { timeoutMs?: number }): Promise<ProxyConfiguration>;
}

export interface SystemProxyResolverOptions {
  cacheTimeout?: number;
  commandTimeout?: number;
}
