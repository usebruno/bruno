const Yup = require('yup');
const Store = require('electron-store');
const { get, merge } = require('lodash');

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
  proxy: false,
  layout: {
    responsePaneOrientation: 'horizontal'
  },
  beta: {
    grpc: false,
    nodevm: false
  },
  onboarding: {
    hasLaunchedBefore: false
  },
  general: {
    defaultCollectionLocation: ''
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
  proxy: Yup.lazy((value) => {
    if (value === false || value === 'system') {
      return Yup.mixed().oneOf([false, 'system']);
    }
    return Yup.object({
      protocol: Yup.string().oneOf(['http', 'https', 'socks4', 'socks5']),
      hostname: Yup.string().max(1024),
      port: Yup.number().min(1).max(65535).nullable(),
      auth: Yup.object({
        enabled: Yup.boolean(),
        username: Yup.string().max(1024),
        password: Yup.string().max(1024)
      }).optional(),
      bypassProxy: Yup.string().optional().max(1024)
    });
  }),
  layout: Yup.object({
    responsePaneOrientation: Yup.string().oneOf(['horizontal', 'vertical'])
  }),
  beta: Yup.object({
    grpc: Yup.boolean(),
    nodevm: Yup.boolean()
  }),
  onboarding: Yup.object({
    hasLaunchedBefore: Yup.boolean()
  }),
  general: Yup.object({
    defaultCollectionLocation: Yup.string().max(1024).nullable()
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

    if (preferences?.proxy && typeof preferences.proxy === 'object' && preferences?.proxy !== null) {
      if ('mode' in preferences.proxy) {
        // Handle old format with `proxy.mode` prop
        const { mode, enabled, ...proxyConfig } = preferences.proxy;
        if (mode === 'on') {
          preferences.proxy = proxyConfig;
        } else if (mode === 'system') {
          preferences.proxy = 'system';
        } else {
          preferences.proxy = false;
        }
      } else if ('enabled' in preferences.proxy) {
        // Handle old format with `proxy.enabled` prop
        const { enabled, ...proxyConfig } = preferences.proxy;
        if (enabled === true) {
          preferences.proxy = proxyConfig;
        } else {
          preferences.proxy = false;
        }
      }
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
    return get(getPreferences(), 'proxy', false);
  },
  shouldStoreCookies: () => {
    return get(getPreferences(), 'request.storeCookies', true);
  },
  shouldSendCookies: () => {
    return get(getPreferences(), 'request.sendCookies', true);
  },
  getResponsePaneOrientation: () => {
    return get(getPreferences(), 'layout.responsePaneOrientation', 'horizontal');
  },
  getSystemProxyEnvVariables: () => {
    const { http_proxy, HTTP_PROXY, https_proxy, HTTPS_PROXY, no_proxy, NO_PROXY } = process.env;
    return {
      http_proxy: http_proxy || HTTP_PROXY,
      https_proxy: https_proxy || HTTPS_PROXY,
      no_proxy: no_proxy || NO_PROXY
    };
  },
  isBetaFeatureEnabled: (featureName) => {
    return get(getPreferences(), `beta.${featureName}`, false);
  },
  hasLaunchedBefore: () => {
    return get(getPreferences(), 'onboarding.hasLaunchedBefore', false);
  },
  markAsLaunched: async () => {
    const preferences = getPreferences();
    preferences.onboarding.hasLaunchedBefore = true;

    try {
      await savePreferences(preferences);
    } catch (err) {
      console.error('Failed to save preferences in markAsLaunched:', err);
    }
  }
};

module.exports = {
  getPreferences,
  savePreferences,
  preferencesUtil
};
