import { platform } from 'node:os';
import { ProxyConfiguration, SystemProxyResolverOptions } from './types';
import { WindowsProxyResolver } from './utils/windows';
import { MacOSProxyResolver } from './utils/macos';
import { LinuxProxyResolver } from './utils/linux';
import { normalizeNoProxy, normalizeProxyUrl } from './utils/common';

export class SystemProxyResolver {
  private osPlatform: string;
  private commandTimeoutMs: number = 10000;
  private activeDetection: Promise<ProxyConfiguration> | null = null;

  constructor(options: SystemProxyResolverOptions = {}) {
    this.osPlatform = platform();
    if (options.commandTimeoutMs) {
      this.commandTimeoutMs = options.commandTimeoutMs;
    }
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
      const result = await this.detectByPlatform();

      // Log slow detections
      const detectionTime = Date.now() - startTime;
      if (detectionTime > 5000) {
        console.warn(`System proxy detection took ${detectionTime}ms`);
      }

      return result;
    } catch (error) {
      console.warn(`System proxy detection failed after ${Date.now() - startTime}ms:`, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async detectByPlatform(): Promise<ProxyConfiguration> {
    switch (this.osPlatform) {
      case 'win32':
        return await new WindowsProxyResolver().detect({ timeoutMs: this.commandTimeoutMs });
      case 'darwin':
        return await new MacOSProxyResolver().detect({ timeoutMs: this.commandTimeoutMs });
      case 'linux':
        return await new LinuxProxyResolver().detect({ timeoutMs: this.commandTimeoutMs });
      default:
        throw new Error(`Unsupported platform: ${this.osPlatform}`);
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

  try {
    const systemProxyEnvironmentVariables = await systemProxyResolver.getSystemProxy();

    return {
      http_proxy: proxyEnvironmentVariables?.http_proxy || systemProxyEnvironmentVariables?.http_proxy,
      https_proxy: proxyEnvironmentVariables?.https_proxy || systemProxyEnvironmentVariables?.https_proxy,
      no_proxy: proxyEnvironmentVariables?.no_proxy || systemProxyEnvironmentVariables?.no_proxy,
      source: hasEnvironmentProxy ? `${systemProxyEnvironmentVariables?.source} + environment` : systemProxyEnvironmentVariables?.source
    };
  } catch (error) {
    console.error('Error getting system proxy:', error);
    return proxyEnvironmentVariables;
  }
}

export { ProxyConfiguration } from './types';
