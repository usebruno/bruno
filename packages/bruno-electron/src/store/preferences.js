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
    timeout: 0,
    oauth2: {
      useSystemBrowser: false
    }
  },
  font: {
    codeFont: 'default',
    codeFontSize: 13
  },
  proxy: {
    inherit: true,
    config: {
      protocol: 'http',
      hostname: '',
      port: null,
      auth: {
        username: '',
        password: ''
      },
      bypassProxy: ''
    }
  },
  layout: {
    responsePaneOrientation: 'horizontal'
  },
  beta: {},
  onboarding: {
    hasLaunchedBefore: false
  },
  general: {
    defaultCollectionLocation: ''
  },
  autoSave: {
    enabled: false,
    interval: 1000
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
    timeout: Yup.number(),
    oauth2: Yup.object({
      useSystemBrowser: Yup.boolean()
    })
  }),
  font: Yup.object().shape({
    codeFont: Yup.string().nullable(),
    codeFontSize: Yup.number().min(1).max(32).nullable()
  }),
  proxy: Yup.object({
    disabled: Yup.boolean().optional(),
    inherit: Yup.boolean().required(),
    config: Yup.object({
      protocol: Yup.string().oneOf(['http', 'https', 'socks4', 'socks5']),
      hostname: Yup.string().max(1024),
      port: Yup.number().min(1).max(65535).nullable(),
      auth: Yup.object({
        disabled: Yup.boolean().optional(),
        username: Yup.string().max(1024),
        password: Yup.string().max(1024)
      }).optional(),
      bypassProxy: Yup.string().optional().max(1024)
    }).required()
  }),
  layout: Yup.object({
    responsePaneOrientation: Yup.string().oneOf(['horizontal', 'vertical'])
  }),
  beta: Yup.object({
  }),
  onboarding: Yup.object({
    hasLaunchedBefore: Yup.boolean()
  }),
  general: Yup.object({
    defaultCollectionLocation: Yup.string().max(1024).nullable()
  }),
  autoSave: Yup.object({
    enabled: Yup.boolean(),
    interval: Yup.number().min(100)
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

    // Migrate proxy configuration from old formats to new format
    const proxyMigrated = get(preferences, '_migrations.proxyConfigFormat', false);
    if (!proxyMigrated && preferences?.proxy) {
      const proxy = preferences.proxy || {};

      // Check if this is an old format that needs migration
      const hasOldFormat = proxy.hasOwnProperty('enabled') || proxy.hasOwnProperty('mode');

      if (hasOldFormat) {
        let newProxy = {
          inherit: true,
          config: {
            protocol: proxy.protocol || 'http',
            hostname: proxy.hostname || '',
            port: proxy.port || null,
            auth: {
              username: get(proxy, 'auth.username', ''),
              password: get(proxy, 'auth.password', '')
            },
            bypassProxy: proxy.bypassProxy || ''
          }
        };

        // Handle old format 1: enabled (boolean)
        if (proxy.hasOwnProperty('enabled') && typeof proxy.enabled === 'boolean') {
          newProxy.disabled = !proxy.enabled;
          newProxy.inherit = false;
        } else if (proxy.hasOwnProperty('mode')) {
          // Handle old format 2: mode ('off' | 'on' | 'system')
          if (proxy.mode === 'off') {
            newProxy.disabled = true;
            newProxy.inherit = false;
          } else if (proxy.mode === 'on') {
            newProxy.disabled = false;
            newProxy.inherit = false;
          } else if (proxy.mode === 'system') {
            newProxy.disabled = false;
            newProxy.inherit = true;
          }
        }

        // Migrate auth.enabled to auth.disabled
        if (get(proxy, 'auth.enabled') === false) {
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

        preferences.proxy = newProxy;

        // Mark migration as complete // ?
        // if (!preferences._migrations) {
        //   preferences._migrations = {};
        // }
        // preferences._migrations.proxyConfigFormat = true;

        // Save the migrated preferences back to the store
        // this.store.set('preferences', preferences);
      }
    }

    // Migrate font size from 14px to 13px for existing users
    // Only migrate once if codeFont is 'default' (or not set) and codeFontSize is 14
    // This ensures the migration only happens once and doesn't override user's explicit choices
    // If user explicitly sets it to 14px after migration, it won't be migrated again
    const fontSizeMigrated = get(preferences, '_migrations.codeFontSize14to13', false);
    if (!fontSizeMigrated) {
      const codeFont = get(preferences, 'font.codeFont', 'default');
      const codeFontSize = get(preferences, 'font.codeFontSize');

      // Only migrate if it's the old default combination (codeFont is default and size is 14)
      if (codeFont === 'default' && codeFontSize === 14) {
        preferences.font.codeFontSize = 13;
        // Mark migration as complete
        if (!preferences._migrations) {
          preferences._migrations = {};
        }
        preferences._migrations.codeFontSize14to13 = true;
        // Save the migrated preferences back to the store
        this.store.set('preferences', preferences);
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
    // Merge with existing preferences to allow partial updates.
    // The validation schema requires all fields (e.g., proxy.inherit), but callers
    // may only send partial updates (e.g., just defaultWorkspaceDocs). By merging
    // with existing preferences first, we ensure all required fields are present
    // before validation, while still allowing callers to update only what they need.
    const existingPreferences = preferencesStore.getPreferences();
    const mergedPreferences = merge({}, existingPreferences, newPreferences);

    preferencesSchema
      .validate(mergedPreferences, { abortEarly: true })
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
    return get(getPreferences(), 'proxy', {});
  },
  shouldStoreCookies: () => {
    return get(getPreferences(), 'request.storeCookies', true);
  },
  shouldSendCookies: () => {
    return get(getPreferences(), 'request.sendCookies', true);
  },
  shouldUseSystemBrowser: () => {
    return get(getPreferences(), 'request.oauth2.useSystemBrowser', false);
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
