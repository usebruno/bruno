import { platform } from 'node:os';
import { ProxyConfiguration, SystemProxyResolverOptions } from './types';
import { WindowsProxyResolver } from './utils/windows';
import { MacOSProxyResolver } from './utils/macos';
import { LinuxProxyResolver } from './utils/linux';
import { normalizeNoProxy, normalizeProxyUrl } from './utils/common';

export class SystemProxyResolver {
  private platform: string;
  private commandTimeout: number;
  private activeDetection: Promise<ProxyConfiguration> | null = null;

  constructor(options: SystemProxyResolverOptions = {}) {
    this.platform = platform();
    this.commandTimeout = options.commandTimeout || 10000; // 10 seconds default
  }

  async getSystemProxy(): Promise<ProxyConfiguration> {
    // Return active detection if already in progress
    if (this.activeDetection) {
      return this.activeDetection;
    }

    // Start new detection
    this.activeDetection = this.detectSystemProxy();

    try {
      const result = await this.activeDetection;
      return result;
    } finally {
      this.activeDetection = null;
    }
  }

  private async detectSystemProxy(): Promise<ProxyConfiguration> {
    const startTime = Date.now();

    try {
      const result = await this.detectWithTimeout();

      // Log slow detections
      const detectionTime = Date.now() - startTime;
      if (detectionTime > 5000) {
        console.warn(`System proxy detection took ${detectionTime}ms`);
      }

      return result;
    } catch (error) {
      console.warn(`System proxy detection failed after ${Date.now() - startTime}ms:`, error instanceof Error ? error.message : String(error));
      return this.getEnvironmentVariables();
    }
  }

  private async detectWithTimeout(): Promise<ProxyConfiguration> {
    return await this.detectByPlatform();
  }

  private async detectByPlatform(): Promise<ProxyConfiguration> {
    switch (this.platform) {
      case 'win32':
        return await new WindowsProxyResolver().detect({ timeoutMs: this.commandTimeout });
      case 'darwin':
        return await new MacOSProxyResolver().detect({ timeoutMs: this.commandTimeout });
      case 'linux':
        return await new LinuxProxyResolver().detect({ timeoutMs: this.commandTimeout });
      default:
        return this.getEnvironmentVariables();
    }
  }

  getEnvironmentVariables(): ProxyConfiguration {
    const { http_proxy, HTTP_PROXY, https_proxy, HTTPS_PROXY, no_proxy, NO_PROXY, all_proxy, ALL_PROXY } = process.env;

    const httpProxy = http_proxy || HTTP_PROXY || all_proxy || ALL_PROXY || '';
    const httpsProxy = https_proxy || HTTPS_PROXY || all_proxy || ALL_PROXY || '';
    const noProxy = no_proxy || NO_PROXY || '';

    return {
      http_proxy: httpProxy ? normalizeProxyUrl(httpProxy) : null,
      https_proxy: httpsProxy ? normalizeProxyUrl(httpsProxy, 'https') : null,
      no_proxy: noProxy ? normalizeNoProxy(noProxy) : null,
      source: 'environment'
    };
  }
}

const systemProxyResolver = new SystemProxyResolver();

export async function getSystemProxy(): Promise<ProxyConfiguration> {
  const proxyEnvironmentVariables = systemProxyResolver.getEnvironmentVariables();

  const hasEnvironmentProxy = proxyEnvironmentVariables.http_proxy || proxyEnvironmentVariables.https_proxy;

  if (hasEnvironmentProxy) {
    return proxyEnvironmentVariables;
  }

  try {
    return await systemProxyResolver.getSystemProxy();
  } catch (error) {
    return proxyEnvironmentVariables;
  }
}

export { ProxyConfiguration } from './types';
