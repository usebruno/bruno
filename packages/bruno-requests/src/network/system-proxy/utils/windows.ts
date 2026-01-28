import { ExecFileOptions } from 'node:child_process';
import { ProxyConfiguration, ProxyResolver } from '../types';
import { normalizeProxyUrl, normalizeNoProxy, safeExec } from './common';

export class WindowsProxyResolver implements ProxyResolver {
  async detect(opts?: { timeoutMs?: number }): Promise<ProxyConfiguration> {
    const timeoutMs = opts?.timeoutMs ?? 10000;
    const execOpts: ExecFileOptions = {
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 1024 * 1024
    };

    try {
      // Try different detection methods in order of preference
      const detectionMethods = [
        () => this.getInternetOptions(execOpts),
        () => this.getWinHttpProxy(execOpts),
        () => this.getSystemProxyEnvironment(execOpts),
        () => this.getUserEnvironmentProxy(execOpts)
      ];

      for (const method of detectionMethods) {
        try {
          const proxy = await method();
          if (proxy) {
            return proxy;
          }
        } catch (error) {
          // Continue to next method if this one fails
          continue;
        }
      }

      throw new Error('No Windows proxy configuration found');
    } catch (error) {
      throw new Error(`Windows proxy detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getInternetOptions(execOpts: ExecFileOptions): Promise<ProxyConfiguration | null> {
    const stdout = await safeExec('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'], execOpts);
    if (!stdout) return null;

    const lines = stdout.split('\n');
    let proxyEnabled = false;
    let proxyServer: string | null = null;
    let proxyOverride: string | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.includes('ProxyEnable') && trimmedLine.includes('REG_DWORD')) {
        // Extract the value after REG_DWORD
        const match = trimmedLine.match(/ProxyEnable\s+REG_DWORD\s+(0x[0-9a-fA-F]+|\d+)/);
        if (match) {
          const value = match[1];
          proxyEnabled = value === '0x1' || value === '1';
        }
      }

      if (trimmedLine.includes('ProxyServer') && trimmedLine.includes('REG_SZ')) {
        const match = trimmedLine.match(/ProxyServer\s+REG_SZ\s+(.+)/);
        if (match) proxyServer = match[1].trim();
      }

      if (trimmedLine.includes('ProxyOverride') && trimmedLine.includes('REG_SZ')) {
        const match = trimmedLine.match(/ProxyOverride\s+REG_SZ\s+(.+)/);
        if (match) proxyOverride = match[1].trim();
      }
    }

    if (proxyEnabled && proxyServer) {
      return this.parseProxyString(proxyServer, proxyOverride);
    }

    return null;
  }

  private async getWinHttpProxy(execOpts: ExecFileOptions): Promise<ProxyConfiguration | null> {
    const stdout = await safeExec('netsh', ['winhttp', 'show', 'proxy'], execOpts);
    if (!stdout) return null;

    if (stdout.includes('Direct access (no proxy server)')) {
      return null;
    }

    const proxyServerMatch = stdout.match(/Proxy Server\(s\)\s*:\s*(.+)/);
    const bypassListMatch = stdout.match(/Bypass List\s*:\s*(.+)/);

    if (proxyServerMatch) {
      const proxyServer = proxyServerMatch[1].trim();
      const bypassList = bypassListMatch ? bypassListMatch[1].trim() : '';

      return this.parseProxyString(proxyServer, bypassList);
    }

    return null;
  }

  private async getSystemProxyEnvironment(execOpts: ExecFileOptions): Promise<ProxyConfiguration | null> {
    // Check for system-wide proxy environment variables
    const stdout = await safeExec('reg', ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment'], execOpts);
    if (!stdout) return null;

    const lines = stdout.split('\n');
    let http_proxy: string | null = null;
    let https_proxy: string | null = null;
    let no_proxy: string | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.toUpperCase().includes('HTTP_PROXY') && trimmedLine.includes('REG_SZ')) {
        const match = trimmedLine.match(/HTTP_PROXY\s+REG_SZ\s+(.+)/i);
        if (match) http_proxy = match[1].trim();
      }

      if (trimmedLine.toUpperCase().includes('HTTPS_PROXY') && trimmedLine.includes('REG_SZ')) {
        const match = trimmedLine.match(/HTTPS_PROXY\s+REG_SZ\s+(.+)/i);
        if (match) https_proxy = match[1].trim();
      }

      if (trimmedLine.toUpperCase().includes('NO_PROXY') && trimmedLine.includes('REG_SZ')) {
        const match = trimmedLine.match(/NO_PROXY\s+REG_SZ\s+(.+)/i);
        if (match) no_proxy = match[1].trim();
      }
    }

    if (http_proxy || https_proxy) {
      return {
        http_proxy: http_proxy ? normalizeProxyUrl(http_proxy) : null,
        https_proxy: https_proxy ? normalizeProxyUrl(https_proxy, 'https') : null,
        no_proxy: no_proxy ? normalizeNoProxy(no_proxy) : null,
        source: 'windows-system'
      };
    }

    return null;
  }

  private async getUserEnvironmentProxy(execOpts: ExecFileOptions): Promise<ProxyConfiguration | null> {
    // Check for user-specific proxy environment variables in HKCU\Environment
    const stdout = await safeExec('reg', ['query', 'HKCU\\Environment'], execOpts);
    if (!stdout) return null;

    const lines = stdout.split('\n');
    let http_proxy: string | null = null;
    let https_proxy: string | null = null;
    let no_proxy: string | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.toUpperCase().includes('HTTP_PROXY') && trimmedLine.includes('REG_SZ')) {
        const match = trimmedLine.match(/HTTP_PROXY\s+REG_SZ\s+(.+)/i);
        if (match) http_proxy = match[1].trim();
      }

      if (trimmedLine.toUpperCase().includes('HTTPS_PROXY') && trimmedLine.includes('REG_SZ')) {
        const match = trimmedLine.match(/HTTPS_PROXY\s+REG_SZ\s+(.+)/i);
        if (match) https_proxy = match[1].trim();
      }

      if (trimmedLine.toUpperCase().includes('NO_PROXY') && trimmedLine.includes('REG_SZ')) {
        const match = trimmedLine.match(/NO_PROXY\s+REG_SZ\s+(.+)/i);
        if (match) no_proxy = match[1].trim();
      }
    }

    if (http_proxy || https_proxy) {
      return {
        http_proxy: http_proxy ? normalizeProxyUrl(http_proxy) : null,
        https_proxy: https_proxy ? normalizeProxyUrl(https_proxy, 'https') : null,
        no_proxy: no_proxy ? normalizeNoProxy(no_proxy) : null,
        source: 'windows-system'
      };
    }

    return null;
  }

  private parseProxyString(proxyServer: string, bypassList: string | null): ProxyConfiguration {
    let http_proxy: string | null = null;
    let https_proxy: string | null = null;

    if (proxyServer.includes('=')) {
      // Protocol-specific format: "http=proxy1:8080;https=proxy2:8080"
      const protocols = proxyServer.split(';');
      for (const protocol of protocols) {
        const [proto, server] = protocol.split('=');
        if (!server || !proto) continue;
        if (proto === 'http') {
          http_proxy = normalizeProxyUrl(server);
        } else if (proto === 'https') {
          https_proxy = normalizeProxyUrl(server, 'https');
        }
      }
    } else {
      // Single proxy for all protocols: "proxy.example.com:8080"
      const proxy = normalizeProxyUrl(proxyServer);
      http_proxy = proxy;
      https_proxy = proxy;
    }

    return {
      http_proxy,
      https_proxy,
      no_proxy: bypassList && bypassList !== '(none)' ? normalizeNoProxy(bypassList) : null,
      source: 'windows-system'
    };
  }
}
