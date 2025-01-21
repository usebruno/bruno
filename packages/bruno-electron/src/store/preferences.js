const Yup = require('yup');
const Store = require('electron-store');
const { get, merge } = require('lodash');
const { execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');


/**
 * The preferences are stored in the electron store 'preferences.json'.
 * The electron process uses this module to get the preferences.
 *
 */

const defaultPreferences = {
  request: {
    sslVerification: true,
    customCaCertificate: {
      enabled: false,
      filePath: null
    },
    keepDefaultCaCertificates: {
      enabled: true
    },
    storeCookies: true,
    sendCookies: true,
    timeout: 0
  },
  font: {
    codeFont: 'default',
    codeFontSize: 14
  },
  proxy: {
    mode: 'off',
    protocol: 'http',
    hostname: '',
    port: null,
    auth: {
      enabled: false,
      username: '',
      password: ''
    },
    bypassProxy: ''
  }
};

const preferencesSchema = Yup.object().shape({
  request: Yup.object().shape({
    sslVerification: Yup.boolean(),
    customCaCertificate: Yup.object({
      enabled: Yup.boolean(),
      filePath: Yup.string().nullable()
    }),
    keepDefaultCaCertificates: Yup.object({
      enabled: Yup.boolean()
    }),
    storeCookies: Yup.boolean(),
    sendCookies: Yup.boolean(),
    timeout: Yup.number()
  }),
  font: Yup.object().shape({
    codeFont: Yup.string().nullable(),
    codeFontSize: Yup.number().min(1).max(32).nullable()
  }),
  proxy: Yup.object({
    mode: Yup.string().oneOf(['off', 'on', 'system']),
    protocol: Yup.string().oneOf(['http', 'https', 'socks4', 'socks5']),
    hostname: Yup.string().max(1024),
    port: Yup.number().min(1).max(65535).nullable(),
    auth: Yup.object({
      enabled: Yup.boolean(),
      username: Yup.string().max(1024),
      password: Yup.string().max(1024)
    }).optional(),
    bypassProxy: Yup.string().optional().max(1024)
  })
});

class PreferencesStore {
  constructor() {
    this.store = new Store({
      name: 'preferences',
      clearInvalidConfig: true
    });
  }

  getPreferences() {
    let preferences = this.store.get('preferences', {});

    // This to support the old preferences format
    // In the old format, we had a proxy.enabled flag
    // In the new format, this maps to proxy.mode = 'on'
    if (preferences?.proxy?.enabled) {
      preferences.proxy.mode = 'on';
    }

    // Delete the proxy.enabled property if it exists, regardless of its value
    // This is a part of migration to the new preferences format
    if (preferences?.proxy && 'enabled' in preferences.proxy) {
      delete preferences.proxy.enabled;
    }

    return merge({}, defaultPreferences, preferences);
  }

  savePreferences(newPreferences) {
    return this.store.set('preferences', newPreferences);
  }
}

const preferencesStore = new PreferencesStore();

const getPreferences = () => {
  return preferencesStore.getPreferences();
};

const savePreferences = async (newPreferences) => {
  return new Promise((resolve, reject) => {
    preferencesSchema
      .validate(newPreferences, { abortEarly: true })
      .then((validatedPreferences) => {
        preferencesStore.savePreferences(validatedPreferences);
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
};

function parseShellConfigFile(configFilePath) {
  try {
    const content = fs.readFileSync(configFilePath, { encoding: 'utf8' });
    const proxyEnv = {};

    // Regex to match export statements for proxy variables
    // Handles variations like: export http_proxy="value", export http_proxy='value', export http_proxy=value
    const proxyVars = ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY', 'no_proxy', 'NO_PROXY'];
    const exportRegex = new RegExp(
      `^\\s*(?:export\\s+)?(${proxyVars.join('|')})\\s*=\\s*['"]?([^'"\n\\s]+)['"]?\\s*$`,
      'gm'
    );

    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      const key = match[1];
      const value = match[2];
      proxyEnv[key] = value;
    }

    return proxyEnv;
  } catch (error) {
    console.error('Error parsing shell configuration file:', error.message);
    return {};
  }
}

// Helper function to get system-level proxy settings using "scutil --proxy"
function getSystemLevelProxies() {
  try {
    const scutilOutput = execSync('scutil --proxy', { encoding: 'utf8' });
    const proxies = {};
    const lines = scutilOutput.split('\n');
    lines.forEach((line) => {
      const [key, value] = line.split(' : ').map((s) => s.trim());
      if (key && value) {
        proxies[key] = value;
      }
    });

    const httpEnable = proxies['HTTPEnable'] === '1';
    const httpProxy = httpEnable ? `${proxies['HTTPProxy']}:${proxies['HTTPPort']}` : null;

    const httpsEnable = proxies['HTTPSEnable'] === '1';
    const httpsProxy = httpsEnable ? `${proxies['HTTPSProxy']}:${proxies['HTTPSPort']}` : null;

    const noProxyList = proxies['ExceptionsList'] ? proxies['ExceptionsList'] : null;
    let noProxy = null;
    if (noProxyList) {
      noProxy = noProxyList.replace(/[(),\n]/g, '').trim().split(' ').join(',');
    }

    return {
      http_proxy: httpProxy,
      https_proxy: httpsProxy,
      no_proxy: noProxy,
    };
  } catch (error) {
    console.error('Error retrieving system-level proxies:', error.message);
    return {
      http_proxy: null,
      https_proxy: null,
      no_proxy: null,
    };
  }
}

const preferencesUtil = {
  shouldVerifyTls: () => {
    return get(getPreferences(), 'request.sslVerification', true);
  },
  shouldUseCustomCaCertificate: () => {
    return get(getPreferences(), 'request.customCaCertificate.enabled', false);
  },
  shouldKeepDefaultCaCertificates: () => {
    return get(getPreferences(), 'request.keepDefaultCaCertificates.enabled', true);
  },
  getCustomCaCertificateFilePath: () => {
    return get(getPreferences(), 'request.customCaCertificate.filePath', null);
  },
  getRequestTimeout: () => {
    return get(getPreferences(), 'request.timeout', 0);
  },
  getGlobalProxyConfig: () => {
    return get(getPreferences(), 'proxy', {});
  },
  shouldStoreCookies: () => {
    return get(getPreferences(), 'request.storeCookies', true);
  },
  shouldSendCookies: () => {
    return get(getPreferences(), 'request.sendCookies', true);
  },
  getSystemProxyEnvVariables: () => {
    const platform = process.platform;
  
    if (platform === 'darwin') {
      try {
        // Get the user's default shell
        const defaultShell = process.env.SHELL || '/bin/bash';
        const shellName = path.basename(defaultShell);
  
        let shellConfigFile = '';
        const homeDir = os.homedir();
  
        if (shellName.includes('zsh')) {
          shellConfigFile = path.join(homeDir, '.zshrc');
        } else if (shellName.includes('bash')) {
          shellConfigFile = path.join(homeDir, '.bashrc');
        } else {
          shellConfigFile = path.join(homeDir, `.${shellName}rc`);
        }
        let shellProxyEnv = {};
        if (fs.existsSync(shellConfigFile)) {
          shellProxyEnv = parseShellConfigFile(shellConfigFile);
        }
  
        // If shell proxy variables are available, give them priority
        if (
          shellProxyEnv.http_proxy ||
          shellProxyEnv.HTTP_PROXY ||
          shellProxyEnv.https_proxy ||
          shellProxyEnv.HTTPS_PROXY ||
          shellProxyEnv.no_proxy ||
          shellProxyEnv.NO_PROXY
        ) {
          return {
            http_proxy: shellProxyEnv.http_proxy || shellProxyEnv.HTTP_PROXY || null,
            https_proxy: shellProxyEnv.https_proxy || shellProxyEnv.HTTPS_PROXY || null,
            no_proxy: shellProxyEnv.no_proxy || shellProxyEnv.NO_PROXY || null,
          };
        } else {
          // Use "scutil --proxy" to get system-level proxy settings
          const systemProxyEnv = getSystemLevelProxies();
          return systemProxyEnv;
        }
      } catch (error) {
        console.error('Error retrieving proxy settings on macOS:', error.message);
      }
    }
  
    const { http_proxy, HTTP_PROXY, https_proxy, HTTPS_PROXY, no_proxy, NO_PROXY } = process.env;
    return {
      http_proxy: http_proxy || HTTP_PROXY || null,
      https_proxy: https_proxy || HTTPS_PROXY || null,
      no_proxy: no_proxy || NO_PROXY || null,
    };
  }
};

module.exports = {
  getPreferences,
  savePreferences,
  preferencesUtil
};
