const fs = require('node:fs');
const path = require('path');
const { get } = require('lodash');
const { getCACertificates, getSystemProxy } = require('@usebruno/requests');
const { preferencesUtil } = require('../../store/preferences');
const { getBrunoConfig } = require('../../store/bruno-config');
const { interpolateString } = require('./interpolate-string');

/**
 * Gets certificates and proxy configuration for a request
 */
const getCertsAndProxyConfig = async ({
  collectionUid,
  collection,
  request,
  envVars,
  runtimeVariables,
  processEnvVars,
  collectionPath,
  globalEnvironmentVariables
}) => {
  /**
   * @see https://github.com/usebruno/bruno/issues/211 set keepAlive to true, this should fix socket hang up errors
   * @see https://github.com/nodejs/node/pull/43522 keepAlive was changed to true globally on Node v19+
   */
  const httpsAgentRequestFields = { keepAlive: true };
  if (!preferencesUtil.shouldVerifyTls()) {
    httpsAgentRequestFields['rejectUnauthorized'] = false;
  }

  let caCertificates = '';
  let caCertificatesCount = { system: 0, root: 0, custom: 0, extra: 0 };

  // Only load CA certificates if SSL validation is enabled (otherwise they're unused)
  if (preferencesUtil.shouldVerifyTls()) {
    let caCertFilePath = preferencesUtil.shouldUseCustomCaCertificate() && preferencesUtil.getCustomCaCertificateFilePath();
    let caCertificatesData = getCACertificates({
      caCertFilePath,
      shouldKeepDefaultCerts: preferencesUtil.shouldKeepDefaultCaCertificates()
    });

    caCertificates = caCertificatesData.caCertificates;
    caCertificatesCount = caCertificatesData.caCertificatesCount;
  }

  // configure HTTPS agent with aggregated CA certificates
  httpsAgentRequestFields['caCertificatesCount'] = caCertificatesCount;
  httpsAgentRequestFields['ca'] = caCertificates || [];

  const { promptVariables } = collection;
  const collectionVariables = request.collectionVariables || {};
  const folderVariables = request.folderVariables || {};
  const requestVariables = request.requestVariables || {};

  const brunoConfig = getBrunoConfig(collectionUid, collection);
  const interpolationOptions = {
    globalEnvironmentVariables,
    collectionVariables,
    envVars,
    folderVariables,
    requestVariables,
    runtimeVariables,
    promptVariables,
    processEnvVars
  };

  // client certificate config
  const clientCertConfig = get(brunoConfig, 'clientCertificates.certs', []);

  for (let clientCert of clientCertConfig) {
    const domain = interpolateString(clientCert?.domain, interpolationOptions);
    const type = clientCert?.type || 'cert';
    if (domain) {
      const hostRegex = '^(https:\\/\\/|grpc:\\/\\/|grpcs:\\/\\/|ws:\\/\\/|wss:\\/\\/)?'
        + domain.replaceAll('.', '\\.').replaceAll('*', '.*');
      const requestUrl = interpolateString(request.url, interpolationOptions);
      if (requestUrl && requestUrl.match(hostRegex)) {
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
   * New format:
   * - disabled: boolean (optional, defaults to false)
   * - inherit: boolean (required)
   * - config: { protocol, hostname, port, auth, bypassProxy }
   *
   * When collection proxy has inherit=false and disabled=false, use collection-specific proxy
   * When collection proxy has inherit=true, inherit from global preferences
   * When disabled=true, proxy is disabled
   *
   * Below logic calculates the proxyMode and proxyConfig to be used for the request
   */
  let proxyMode = 'off';
  let proxyConfig = {};

  const collectionProxyConfig = get(brunoConfig, 'proxy', {});
  const collectionProxyDisabled = get(collectionProxyConfig, 'disabled', false);
  const collectionProxyInherit = get(collectionProxyConfig, 'inherit', true);
  const collectionProxyConfigData = get(collectionProxyConfig, 'config', collectionProxyConfig);

  if (!collectionProxyDisabled && !collectionProxyInherit) {
    // Use collection-specific proxy
    proxyConfig = collectionProxyConfigData;
    proxyMode = 'on';
  } else if (!collectionProxyDisabled && collectionProxyInherit) {
    // Inherit from global preferences
    const globalProxy = preferencesUtil.getGlobalProxyConfig();
    const globalDisabled = get(globalProxy, 'disabled', false);
    const globalInherit = get(globalProxy, 'inherit', false);
    const globalProxyConfigData = get(globalProxy, 'config', globalProxy);

    if (!globalDisabled && !globalInherit) {
      // Use global custom proxy
      proxyConfig = globalProxyConfigData;
      proxyMode = 'on';
    } else if (!globalDisabled && globalInherit) {
      // Use system proxy
      proxyMode = 'system';
      const systemProxyConfig = await getSystemProxy();
      proxyConfig = systemProxyConfig;
    }
    // else: global proxy is disabled, proxyMode stays 'off'
  }
  // else: collection proxy is disabled, proxyMode stays 'off'

  return { proxyMode, proxyConfig, httpsAgentRequestFields, interpolationOptions };
};

module.exports = { getCertsAndProxyConfig };
