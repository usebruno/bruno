import { ExecFileOptions } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { ProxyConfiguration, ProxyResolver } from '../types';
import { normalizeProxyUrl, normalizeNoProxy, safeExec } from './common';

// Pre-compile patterns for proxy variable detection
const PROXY_VAR_PATTERNS = ['http_proxy', 'https_proxy', 'no_proxy', 'all_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'ALL_PROXY']
  .flatMap((varName) => [
    { varName: varName.toLowerCase(), pattern: new RegExp(`^export\\s+${varName}\\s*=\\s*(.+)$`, 'i') },
    { varName: varName.toLowerCase(), pattern: new RegExp(`^${varName}\\s*=\\s*(.+)$`, 'i') }
  ]);

export class LinuxProxyResolver implements ProxyResolver {
  async detect(opts?: { timeoutMs?: number }): Promise<ProxyConfiguration> {
    const timeoutMs = opts?.timeoutMs ?? 10000;
    const execOpts: ExecFileOptions = {
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024
    };

    try {
      // Try different proxy detection methods in order of preference
      const detectionMethods = [
        () => this.getGSettingsProxy(execOpts),
        () => this.getKDEProxy(execOpts),
        () => this.getEnvironmentFileProxy(),
        () => this.getSystemdProxy()
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

      throw new Error('No Linux proxy configuration found');
    } catch (error) {
      throw new Error(`Linux proxy detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getGSettingsProxy(execOpts: ExecFileOptions): Promise<ProxyConfiguration | null> {
    try {
      const mode = await safeExec('gsettings', ['get', 'org.gnome.system.proxy', 'mode'], execOpts);
      if (mode !== '\'manual\'') {
        return null;
      }

      const httpHost = await safeExec('gsettings', ['get', 'org.gnome.system.proxy.http', 'host'], execOpts);
      const httpPort = await safeExec('gsettings', ['get', 'org.gnome.system.proxy.http', 'port'], execOpts);
      const httpsHost = await safeExec('gsettings', ['get', 'org.gnome.system.proxy.https', 'host'], execOpts);
      const httpsPort = await safeExec('gsettings', ['get', 'org.gnome.system.proxy.https', 'port'], execOpts);
      const ignoreHosts = await safeExec('gsettings', ['get', 'org.gnome.system.proxy', 'ignore-hosts'], execOpts);

      const cleanHttpHost = (httpHost || '').replace(/'/g, '');
      const cleanHttpPort = httpPort || '';
      const cleanHttpsHost = (httpsHost || '').replace(/'/g, '');
      const cleanHttpsPort = httpsPort || '';
      const cleanIgnoreHosts = ignoreHosts || '';

      const http_proxy = cleanHttpHost && cleanHttpPort ? normalizeProxyUrl(`${cleanHttpHost}:${cleanHttpPort}`) : null;
      const https_proxy = cleanHttpsHost && cleanHttpsPort ? normalizeProxyUrl(`${cleanHttpsHost}:${cleanHttpsPort}`, 'https') : null;

      const rawNoProxy = cleanIgnoreHosts !== '[]' ? cleanIgnoreHosts.replace(/[\[\]']/g, '').replace(/,\s*/g, ',') : null;

      return {
        http_proxy,
        https_proxy,
        no_proxy: normalizeNoProxy(rawNoProxy),
        source: 'linux-system'
      };
    } catch (error) {
      return null;
    }
  }

  private async getKDEProxy(execOpts: ExecFileOptions): Promise<ProxyConfiguration | null> {
    try {
      // Check if kreadconfig5 is available and get proxy type
      const proxyType = await safeExec('kreadconfig5', ['--group', 'Proxy Settings', '--key', 'ProxyType'], execOpts);

      // ProxyType values:
      // 0 = No proxy
      // 1 = Manual proxy configuration
      // 2 = Automatic proxy configuration via URL
      // 3 = Automatic proxy detection
      // 4 = Use system proxy configuration (environment variables)

      if (proxyType !== '1') {
        // Only handle manual proxy configuration for now
        return null;
      }

      const httpProxy = await safeExec('kreadconfig5', ['--group', 'Proxy Settings', '--key', 'httpProxy'], execOpts);
      const httpsProxy = await safeExec('kreadconfig5', ['--group', 'Proxy Settings', '--key', 'httpsProxy'], execOpts);
      const noProxy = await safeExec('kreadconfig5', ['--group', 'Proxy Settings', '--key', 'NoProxyFor'], execOpts);

      const cleanHttpProxy = httpProxy || '';
      const cleanHttpsProxy = httpsProxy || '';
      const cleanNoProxy = noProxy || '';

      const http_proxy = cleanHttpProxy ? normalizeProxyUrl(cleanHttpProxy) : null;
      const https_proxy = cleanHttpsProxy ? normalizeProxyUrl(cleanHttpsProxy, 'https') : null;

      return {
        http_proxy,
        https_proxy,
        no_proxy: normalizeNoProxy(cleanNoProxy || null),
        source: 'linux-system'
      };
    } catch (error) {
      return null;
    }
  }

  private async getEnvironmentFileProxy(): Promise<ProxyConfiguration | null> {
    try {
      if (!existsSync('/etc/environment')) {
        return null;
      }
      const content = await readFile('/etc/environment', 'utf8');
      return this.parseProxyFromContent(content);
    } catch (error) {
      return null;
    }
  }

  private async getSystemdProxy(): Promise<ProxyConfiguration | null> {
    try {
      const systemdConfDir = '/etc/systemd/system.conf.d';
      if (!existsSync(systemdConfDir)) {
        return null;
      }

      // Look for systemd proxy configuration files
      const files = await readdir(systemdConfDir);
      const systemdFiles = files.filter((f) => f.endsWith('.conf'));
      let content = '';

      for (const file of systemdFiles) {
        const filePath = `${systemdConfDir}/${file}`;
        if (existsSync(filePath)) {
          const fileContent = await readFile(filePath, 'utf8');
          content += fileContent + '\n';
        }
      }

      if (!content) {
        return null;
      }

      return this.parseProxyFromContent(content);
    } catch (error) {
      return null;
    }
  }

  private parseProxyFromContent(content: string): ProxyConfiguration | null {
    const proxyVars = ['http_proxy', 'https_proxy', 'no_proxy', 'all_proxy', 'HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'ALL_PROXY'];
    const proxies: Record<string, string> = {};

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Handle systemd Environment= and DefaultEnvironment= directives
      const systemdEnvMatch = trimmedLine.match(/^(Default)?Environment\s*=\s*(.+)$/i);
      if (systemdEnvMatch) {
        const envVars = systemdEnvMatch[2];
        // Parse key=value pairs from the directive (handles quoted and unquoted values)
        const kvPairs = envVars.match(/([A-Z_]+)=(?:"([^"]*)"|'([^']*)'|(\S+))/gi);
        if (kvPairs) {
          for (const pair of kvPairs) {
            const [key, ...valueParts] = pair.split('=');
            const value = valueParts.join('=').replace(/^["']|["']$/g, '');
            if (proxyVars.some((v) => v.toLowerCase() === key.toLowerCase())) {
              proxies[key.toLowerCase()] = value;
            }
          }
        }
        continue;
      }

      // Handle different formats: VAR=value, export VAR=value, VAR="value", etc.
      for (const { varName, pattern } of PROXY_VAR_PATTERNS) {
        const match = trimmedLine.match(pattern);
        if (match) {
          let value = match[1].trim();
          // Remove surrounding quotes
          value = value.replace(/^["']|["']$/g, '');
          proxies[varName] = value;
          break;
        }
      }
    }

    // Convert to ProxyConfiguration format with ALL_PROXY fallback
    const httpProxy = proxies.http_proxy || proxies.all_proxy || null;
    const httpsProxy = proxies.https_proxy || proxies.all_proxy || null;
    const http_proxy = httpProxy ? normalizeProxyUrl(httpProxy) : null;
    const https_proxy = httpsProxy ? normalizeProxyUrl(httpsProxy, 'https') : null;
    const no_proxy = proxies.no_proxy || null;

    if (http_proxy || https_proxy) {
      return {
        http_proxy,
        https_proxy,
        no_proxy: normalizeNoProxy(no_proxy),
        source: 'linux-system'
      };
    }

    return null;
  }
}
