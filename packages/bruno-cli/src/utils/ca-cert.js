const fs = require('node:fs');
const { getCACertificates: _getCACertificates } = require('@usebruno/requests');

/**
 * Configures CA certificates for HTTPS requests
 * 
 * @param {object} options - Options object containing certificate configuration
 * @param {string} options.cacert - Path to custom CA certificate file
 * @param {boolean} options.ignoreTruststore - Whether to ignore default truststore
 * @returns {object} Configuration object for HTTPS agent
 */
const getCACertificates = (options = {}) => {
  let caCertificates = [];
  
  try {
    // handle user-provided custom CA certificate file with optional default certificates
    const caCertArray = [options['cacert'], process.env.SSL_CERT_FILE];
    const customCaCertPath = caCertArray.find((el) => el);
    
    if (customCaCertPath && customCaCertPath.length > 1) {
      // validate custom CA certificate file
      if (fs.existsSync(customCaCertPath)) {
        try {
          const customCert = fs.readFileSync(customCaCertPath, 'utf8');
          if (customCert && customCert.trim()) {
            caCertificates.push(customCert.trim());
          }
        } catch (err) {
          console.error(`Failed to read custom CA certificate from ${customCaCertPath}:`, err.message);
          throw new Error(`Unable to load custom CA certificate: ${err.message}`);
        }
      }
      
      // optionally augment custom CA with default certificates
      if (!options['ignoreTruststore']) {
        const defaultCertificates = _getCACertificates(['bundled', 'system', 'extra']);
        if (defaultCertificates.length > 0) {
          caCertificates.push(...defaultCertificates);
        }
      }
    } else {
      // use default CA certificates when no custom configuration is specified
      const defaultCertificates = _getCACertificates(['bundled', 'system', 'extra']);
      if (defaultCertificates.length > 0) {
        caCertificates.push(...defaultCertificates);
      }
    }
  } catch (err) {
    console.error('Error configuring CA certificates:', err.message);
    throw err; // Re-throw certificate loading errors as they're critical
  }
  
  return caCertificates;
};

module.exports = {
  getCACertificates
};
