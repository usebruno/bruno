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

  // CA certificate configuration
  try {
    let caCertificates = [];
    
    // handle user-provided custom CA certificate file with optional default certificates
    if (preferencesUtil.shouldUseCustomCaCertificate()) {
      const caCertFilePath = preferencesUtil.getCustomCaCertificateFilePath();
      
      // validate custom CA certificate file
      if (caCertFilePath && fs.existsSync(caCertFilePath)) {
        try {
          const customCert = fs.readFileSync(caCertFilePath, 'utf8');
          if (customCert && customCert.trim()) {
            caCertificates.push(customCert.trim());
          }
        } catch (err) {
          console.error(`Failed to read custom CA certificate from ${caCertFilePath}:`, err.message);
          throw new Error(`Unable to load custom CA certificate: ${err.message}`);
        }
      }
      
      // optionally augment custom CA with default certificates
      if (preferencesUtil.shouldKeepDefaultCaCertificates()) {
        const defaultCertificates = getCACertificates(['bundled', 'system', 'extra']);
        if (defaultCertificates.length > 0) {
          caCertificates.push(...defaultCertificates);
        }
      }
    } else {
      // use default CA certificates when no custom configuration is specified
      const defaultCertificates = getCACertificates(['bundled', 'system', 'extra']);
      if (defaultCertificates.length > 0) {
        caCertificates.push(...defaultCertificates);
      }
    }

    // configure HTTPS agent with aggregated CA certificates
    if (caCertificates.length > 0) {
      httpsAgentRequestFields['ca'] = caCertificates;
    }
  } catch (err) {
    console.error('Error configuring CA certificates:', err.message);
    throw err; // Re-throw certificate loading errors as they're critical
  }

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

  /**
   * Proxy configuration
   * 
   * Preferences proxyMode has three possible values: on, off, system
   * Collection proxyMode has three possible values: true, false, global
   * 
   * When collection proxyMode is true, it overrides the app-level proxy settings
   * When collection proxyMode is false, it ignores the app-level proxy settings
   * When collection proxyMode is global, it uses the app-level proxy settings
   * 
   * Below logic calculates the proxyMode and proxyConfig to be used for the request
   */
  let proxyMode = 'off';
  let proxyConfig = {};

  const collectionProxyConfig = get(brunoConfig, 'proxy', {});
  const collectionProxyEnabled = get(collectionProxyConfig, 'enabled', 'global');
  if (collectionProxyEnabled === true) {
    proxyConfig = collectionProxyConfig;
    proxyMode = 'on';
  } else if (collectionProxyEnabled === 'global') {
    proxyConfig = preferencesUtil.getGlobalProxyConfig();
    proxyMode = get(proxyConfig, 'mode', 'off');
  }
  
  return { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions };
}

module.exports = { getCertsAndProxyConfig }; 