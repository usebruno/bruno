const { getOAuth2Token } = require('@usebruno/requests');
const tokenStore = require('./tokenStore');
const https = require('https');
const fs = require('fs');
const tls = require('tls');
const { getOptions } = require('../utils/bru');
const { getSystemProxyEnvVariables } = require('../utils/proxy-util');

/**
 * Prepares proxy and certificate configuration for OAuth2 requests
 */
const prepareProxyConfig = () => {
  const options = getOptions();
  const insecure = options.insecure || false;
  
  const httpsAgentRequestFields = {};
  
  // Handle certificate configuration
  if (insecure) {
    httpsAgentRequestFields.rejectUnauthorized = false;
  } else {
    const caCertArray = [options.cacert, process.env.SSL_CERT_FILE, process.env.NODE_EXTRA_CA_CERTS];
    const caCert = caCertArray.find(el => el);
    if (caCert && caCert.length > 1) {
      try {
        let caCertBuffer = fs.readFileSync(caCert);
        if (!options['ignoreTruststore']) {
          caCertBuffer += '\n' + tls.rootCertificates.join('\n'); // Augment default truststore with custom CA certificates
        }
        httpsAgentRequestFields.ca = caCertBuffer;
      } catch (err) {
        console.error('Error reading CA cert file:' + caCert, err);
      }
    }
  }
  
  // Handle proxy configuration
  let proxyMode = 'off';
  let proxyConfig = {};
  
  // Check for system proxies
  const { http_proxy, https_proxy, no_proxy } = getSystemProxyEnvVariables();
  if (http_proxy?.length || https_proxy?.length) {
    proxyMode = 'system';
    
    try {
      // Use HTTPS proxy for OAuth2 requests
      if (https_proxy) {
        const proxyUrl = new URL(https_proxy);
        proxyConfig = {
          protocol: proxyUrl.protocol.replace(':', ''),
          hostname: proxyUrl.hostname,
          port: proxyUrl.port,
          bypassProxy: no_proxy || ''
        };
        
        if (proxyUrl.username || proxyUrl.password) {
          proxyConfig.auth = {
            enabled: true,
            username: proxyUrl.username,
            password: proxyUrl.password
          };
        }
      }
    } catch (error) {
      console.error('Invalid system proxy configuration:', error.message);
    }
  }
  
  return {
    proxyMode,
    proxyConfig,
    httpsAgentRequestFields
  };
};

module.exports = {
  getOAuth2Token: (oauth2Config) => {
    const proxyConfig = prepareProxyConfig();
    return getOAuth2Token(oauth2Config, tokenStore, proxyConfig);
  }
}; 