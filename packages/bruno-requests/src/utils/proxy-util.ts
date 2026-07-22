/**
 * Transform proxy config from old format to new format.
 * Old format: { enabled: true | false | 'global', protocol, hostname, port, auth: { enabled, ... }, ... }
 * New format: { disabled?, inherit, config: { protocol, hostname, port, auth: { disabled?, ... }, ... } }
 */

interface OldProxyAuth {
  enabled?: boolean;
  username?: string;
  password?: string;
}

interface OldProxyConfig {
  enabled?: true | false | 'global';
  protocol?: string;
  hostname?: string;
  port?: number | null;
  auth?: OldProxyAuth;
  bypassProxy?: string;
}

interface NewProxyAuth {
  disabled?: boolean;
  username?: string;
  password?: string;
}

interface NewProxyConfig {
  disabled?: boolean;
  inherit: boolean;
  config: {
    protocol: string;
    hostname: string;
    port: number | null;
    auth: NewProxyAuth;
    bypassProxy: string;
  };
}

export const transformProxyConfig = (proxy: OldProxyConfig | NewProxyConfig | null | undefined): NewProxyConfig | OldProxyConfig => {
  proxy = proxy || {};
  // Check if this is an old format (has 'enabled' property)
  if (proxy.hasOwnProperty('enabled')) {
    const oldProxy = proxy as OldProxyConfig;
    const enabled = oldProxy.enabled;

    const newProxy: NewProxyConfig = {
      inherit: true,
      config: {
        protocol: oldProxy.protocol || 'http',
        hostname: oldProxy.hostname || '',
        port: oldProxy.port || null,
        auth: {
          username: oldProxy.auth?.username || '',
          password: oldProxy.auth?.password || ''
        },
        bypassProxy: oldProxy.bypassProxy || ''
      }
    };

    // Handle old format: enabled (true | false | 'global')
    if (enabled === true) {
      newProxy.disabled = false;
      newProxy.inherit = false;
    } else if (enabled === false) {
      newProxy.disabled = true;
      newProxy.inherit = false;
    } else if (enabled === 'global') {
      newProxy.disabled = false;
      newProxy.inherit = true;
    }

    // Migrate auth.enabled to auth.disabled
    if (oldProxy.auth?.enabled === false) {
      newProxy.config.auth.disabled = true;
    }
    // If auth.enabled is true or undefined, omit disabled (defaults to false)

    // Omit disabled: false at top level (optional field)
    if (newProxy.disabled === false) {
      delete newProxy.disabled;
    }
    // Omit auth.disabled: false (optional field)
    if (newProxy.config.auth.disabled === false) {
      delete newProxy.config.auth.disabled;
    }

    return newProxy;
  }

  return proxy;
};
