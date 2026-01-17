export interface ProxyConfiguration {
  http_proxy?: string | null;
  https_proxy?: string | null;
  no_proxy?: string | null;
  source: string;
};

export interface ProxyResolver {
  detect(opts?: { timeoutMs?: number }): Promise<ProxyConfiguration>;
}

export interface SystemProxyResolverOptions {
  commandTimeoutMs?: number;
}
