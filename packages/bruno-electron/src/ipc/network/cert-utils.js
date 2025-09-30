const fs = require('node:fs');
const path = require('path');
const { get } = require('lodash');
const { getCACertificates } = require('@usebruno/requests');
const { preferencesUtil } = require('../../store/preferences');
const { getBrunoConfig } = require('../../store/bruno-config');
const { interpolateString } = require('./interpolate-string');

/**
 * Gets certificates and proxy configuration for a request
 */
const getCertsAndProxyConfig = async ({
  collectionUid,
  request,
  envVars,
  runtimeVariables,
  processEnvVars,
  collectionPath
}) => {
  /**
   * @see https://github.com/usebruno/bruno/issues/211 set keepAlive to true, this should fix socket hang up errors
   * @see https://github.com/nodejs/node/pull/43522 keepAlive was changed to true globally on Node v19+
   */
  const httpsAgentRequestFields = { keepAlive: true };
  if (!preferencesUtil.shouldVerifyTls()) {
    httpsAgentRequestFields['rejectUnauthorized'] = false;
  }

  let caCertFilePath = preferencesUtil.shouldUseCustomCaCertificate() && preferencesUtil.getCustomCaCertificateFilePath();
  let caCertificatesData = getCACertificates({
    caCertFilePath, 
    shouldKeepDefaultCerts: preferencesUtil.shouldKeepDefaultCaCertificates() 
  });

  let caCertificates = caCertificatesData.caCertificates;
  let caCertificatesCount = caCertificatesData.caCertificatesCount;

  // configure HTTPS agent with aggregated CA certificates
  httpsAgentRequestFields['caCertificatesCount'] = caCertificatesCount;
  httpsAgentRequestFields['ca'] = caCertificates || [];

  const brunoConfig = getBrunoConfig(collectionUid);
  const interpolationOptions = {
    envVars,
    runtimeVariables,
    processEnvVars
  };

  // client certificate config
  const clientCertConfig = get(brunoConfig, 'clientCertificates.certs', []);

  for (let clientCert of clientCertConfig) {
    const domain = interpolateString(clientCert?.domain, interpolationOptions);
    const type = clientCert?.type || 'cert';
    if (domain) {
      const hostRegex = '^(https:\\/\\/|grpc:\\/\\/|grpcs:\\/\\/)?' + domain.replaceAll('.', '\\.').replaceAll('*', '.*');
      const requestUrl = interpolateString(request.url, interpolationOptions);
      if (requestUrl.match(hostRegex)) {
        if (type === 'cert') {
          try {
            let certFilePath = interpolateString(clientCert?.certFilePath, interpolationOptions);
            certFilePath = path.isAbsolute(certFilePath) ? certFilePath : path.join(collectionPath, certFilePath);
            let keyFilePath = interpolateString(clientCert?.keyFilePath, interpolationOptions);
            keyFilePath = path.isAbsolute(keyFilePath) ? keyFilePath : path.join(collectionPath, keyFilePath);

            httpsAgentRequestFields['cert'] = fs.readFileSync(certFilePath);
            httpsAgentRequestFields['key'] = fs.readFileSync(keyFilePath);
          } catch (err) {
            console.error('Error reading cert/key file', err);
            throw new Error('Error reading cert/key file' + err);
          }
        } else if (type === 'pfx') {
          try {
            let pfxFilePath = interpolateString(clientCert?.pfxFilePath, interpolationOptions);
            pfxFilePath = path.isAbsolute(pfxFilePath) ? pfxFilePath : path.join(collectionPath, pfxFilePath);
            httpsAgentRequestFields['pfx'] = fs.readFileSync(pfxFilePath);
          } catch (err) {
            console.error('Error reading pfx file', err);
            throw new Error('Error reading pfx file' + err);
          }
        }
        httpsAgentRequestFields['passphrase'] = interpolateString(clientCert.passphrase, interpolationOptions);
        break;
      }
    }
  }

  const { proxyMode, proxyConfig } = getProxyConfig({ brunoConfig });

  return { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions };
};

const getProxyConfig = ({ brunoConfig }) => {
  const collectionProxy = get(brunoConfig, 'proxy', 'inherit');

  /**
   * Collection proxy has three possible values: false, "inherit", or proxy object
   * 
   * When collection proxy is false, it ignores the app-level proxy settings
   * When collection proxy is an object, it overrides the app-level proxy settings
   * When collection proxy is "inherit", it uses the app-level proxy settings
   * 
   * Below logic calculates the proxyMode and proxyConfig to be used for the request
   */
  if (collectionProxy === false) {
    return { proxyMode: 'off', proxyConfig: {} };
  }

  if (typeof collectionProxy === 'object' && collectionProxy !== null && !collectionProxy.hasOwnProperty('enabled')) {
    return { proxyMode: 'on', proxyConfig: collectionProxy };
  }
  
  if (collectionProxy === 'inherit') {
    const { proxyMode, proxyConfig } = getGlobalProxyConfig();
    return { proxyMode, proxyConfig };
  }

  /**
   * Legacy Collection proxyMode has three possible values: true, false, "global"
   *
   * When collection proxyMode is true, it overrides the app-level proxy settings
   * When collection proxyMode is false, it ignores the app-level proxy settings
   * When collection proxyMode is "global", it uses the app-level proxy settings
   */

  const collectionProxyEnabled = get(collectionProxy, 'enabled', 'global');

  if (collectionProxyEnabled === true) {
    return { proxyMode: 'on', proxyConfig: collectionProxy };
  }

  if (collectionProxyEnabled === 'global') {
    const { proxyMode, proxyConfig } = getGlobalProxyConfig();
    return { proxyMode, proxyConfig };
  }

  return { proxyMode: 'off', proxyConfig: {} };
}

const getGlobalProxyConfig = () => {
  // App-level proxy has three possible values: false, "system", or proxy object
  const globalProxy = preferencesUtil.getGlobalProxyConfig();
  if (globalProxy === false) {
    return { proxyMode: 'off', proxyConfig: {} };
  }

  if (typeof globalProxy === 'object' && globalProxy !== null) {
    return { proxyMode: 'on', proxyConfig: globalProxy };
  }

  if (globalProxy === 'system') {
    // the system `proxyConfig` will be obtained at the time of setting up the proxy agents, the value set here will not be considered
    return { proxyMode: 'system', proxyConfig: {} };
  }

  // Legacy App-level proxy has three possible values: "on", "off", "system"
  let proxyMode = get(globalProxy, 'mode', 'off');

  if (proxyMode === 'on') {
    return { proxyMode, proxyConfig: globalProxy };
  }

  if (proxyMode === 'system') {
    // `proxyConfig` will be obtained at the time of setting up the proxy agents, the value set here will not be considered
    return { proxyMode: 'system', proxyConfig: {} };
  }

  return { proxyMode: 'off', proxyConfig: {} };
};

module.exports = { getCertsAndProxyConfig, getProxyConfig, getGlobalProxyConfig };
