const productDefaults = () => ({
  shouldVerifyTls: true,
  shouldUseCustomCaCertificate: false,
  customCaCertificateFilePath: null,
  shouldKeepDefaultCaCertificates: true,
  globalClientCertificates: [],
  globalProxyConfig: { disabled: true },
  shouldSendCookies: false,
  shouldStoreCookies: false,
  requestTimeout: 0,
  isSslSessionCachingEnabled: false,
  brunoConfig: {},
  cookieString: ''
});

const appState = productDefaults();

const resetAppState = () => Object.assign(appState, productDefaults());

const preferences = {
  getPreferences: () => ({}),
  savePreferences: jest.fn(),
  preferencesUtil: {
    shouldVerifyTls: () => appState.shouldVerifyTls,
    shouldUseCustomCaCertificate: () => appState.shouldUseCustomCaCertificate,
    getCustomCaCertificateFilePath: () => appState.customCaCertificateFilePath,
    shouldKeepDefaultCaCertificates: () => appState.shouldKeepDefaultCaCertificates,
    getGlobalClientCertificates: () => appState.globalClientCertificates,
    getGlobalProxyConfig: () => appState.globalProxyConfig,
    shouldSendCookies: () => appState.shouldSendCookies,
    shouldStoreCookies: () => appState.shouldStoreCookies,
    getRequestTimeout: () => appState.requestTimeout,
    isSslSessionCachingEnabled: () => appState.isSslSessionCachingEnabled
  }
};

const brunoConfig = {
  getBrunoConfig: () => appState.brunoConfig,
  setBrunoConfig: jest.fn(),
  clearBrunoConfig: jest.fn()
};

const cookies = {
  addCookieToJar: jest.fn(),
  getCookieStringForUrl: jest.fn(() => appState.cookieString)
};

const systemProxy = {
  fetchSystemProxy: jest.fn(),
  getCachedSystemProxy: jest.fn(async () => ({}))
};

const disableTlsVerification = () => {
  appState.shouldVerifyTls = false;
};

const trustCertificateAsCustomCa = (certificatePath) => {
  appState.shouldUseCustomCaCertificate = true;
  appState.customCaCertificateFilePath = certificatePath;
};

module.exports = {
  appState,
  resetAppState,
  disableTlsVerification,
  trustCertificateAsCustomCa,
  preferences,
  brunoConfig,
  cookies,
  systemProxy
};
