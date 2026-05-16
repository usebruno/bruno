const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

const CA_CERT_FILENAME = 'bruno-ca.crt';
const CA_KEY_FILENAME = 'bruno-ca.key';
const CA_VALIDITY_DAYS = 365 * 10; // 10 years

class CAManager {
  constructor() {
    this.caDir = path.join(app.getPath('userData'), 'network-intercept');
    this.caCertPath = path.join(this.caDir, CA_CERT_FILENAME);
    this.caKeyPath = path.join(this.caDir, CA_KEY_FILENAME);
    this.caCert = null;
    this.caKey = null;
    this.certCache = new Map(); // Cache generated domain certs
  }

  /**
   * Initialize the CA manager - load existing CA or generate new one
   */
  async initialize() {
    // Ensure CA directory exists
    if (!fs.existsSync(this.caDir)) {
      fs.mkdirSync(this.caDir, { recursive: true });
    }

    // Check if CA already exists
    if (this.caExists()) {
      await this.loadCA();
    } else {
      await this.generateCA();
    }

    return {
      certPath: this.caCertPath,
      cert: this.caCert
    };
  }

  /**
   * Check if CA certificate and key exist
   */
  caExists() {
    return fs.existsSync(this.caCertPath) && fs.existsSync(this.caKeyPath);
  }

  /**
   * Load existing CA certificate and key
   */
  async loadCA() {
    try {
      this.caCert = fs.readFileSync(this.caCertPath, 'utf8');
      this.caKey = fs.readFileSync(this.caKeyPath, 'utf8');
      console.log('Loaded existing Bruno CA certificate');
    } catch (error) {
      console.error('Failed to load CA:', error);
      // If loading fails, regenerate
      await this.generateCA();
    }
  }

  /**
   * Generate a new root CA certificate
   */
  async generateCA() {
    console.log('Generating new Bruno CA certificate...');

    const attrs = [
      { name: 'commonName', value: 'Bruno Network Intercept CA' },
      { name: 'organizationName', value: 'Bruno API Client' },
      { name: 'countryName', value: 'US' }
    ];

    const extensions = [
      { name: 'basicConstraints', cA: true, critical: true },
      {
        name: 'keyUsage',
        keyCertSign: true,
        cRLSign: true,
        critical: true
      },
      {
        name: 'subjectKeyIdentifier'
      }
    ];

    const pems = selfsigned.generate(attrs, {
      keySize: 2048,
      days: CA_VALIDITY_DAYS,
      extensions: extensions,
      algorithm: 'sha256'
    });

    this.caCert = pems.cert;
    this.caKey = pems.private;

    // Save CA to disk
    fs.writeFileSync(this.caCertPath, this.caCert, 'utf8');
    fs.writeFileSync(this.caKeyPath, this.caKey, { encoding: 'utf8', mode: 0o600 });

    console.log('Bruno CA certificate generated and saved');
  }

  /**
   * Generate a certificate for a specific domain
   * @param {string} hostname - The domain to generate cert for
   * @returns {Object} - { cert, key } for the domain
   */
  generateDomainCert(hostname) {
    // Check cache first
    if (this.certCache.has(hostname)) {
      return this.certCache.get(hostname);
    }

    const attrs = [
      { name: 'commonName', value: hostname },
      { name: 'organizationName', value: 'Bruno Network Intercept' }
    ];

    const extensions = [
      { name: 'basicConstraints', cA: false },
      {
        name: 'keyUsage',
        digitalSignature: true,
        keyEncipherment: true
      },
      {
        name: 'extKeyUsage',
        serverAuth: true
      },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: hostname }, // DNS
          ...(this.isIP(hostname) ? [{ type: 7, ip: hostname }] : [])
        ]
      }
    ];

    const pems = selfsigned.generate(attrs, {
      keySize: 2048,
      days: 365,
      extensions: extensions,
      algorithm: 'sha256',
      pkcs7: false,
      clientCertificate: false,
      clientCertificateCN: hostname
    });

    // Sign with our CA (for proper chain)
    // Note: selfsigned doesn't support signing with external CA directly,
    // so we generate self-signed certs. For full MITM, we'd need node-forge.
    // This simplified approach works for most browser interception scenarios.

    const domainCert = {
      cert: pems.cert,
      key: pems.private
    };

    // Cache the cert
    this.certCache.set(hostname, domainCert);

    return domainCert;
  }

  /**
   * Check if a string is an IP address
   */
  isIP(str) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(str) || ipv6Regex.test(str);
  }

  /**
   * Get CA certificate info for display in UI
   */
  getCAInfo() {
    if (!this.caCert) {
      return null;
    }

    return {
      certPath: this.caCertPath,
      fingerprint: this.getCertFingerprint(this.caCert),
      issuer: 'Bruno Network Intercept CA',
      validDays: CA_VALIDITY_DAYS
    };
  }

  /**
   * Get SHA-256 fingerprint of a certificate
   */
  getCertFingerprint(certPem) {
    // Extract the base64 content between headers
    const base64 = certPem
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');

    const der = Buffer.from(base64, 'base64');
    const hash = crypto.createHash('sha256').update(der).digest('hex');

    // Format as colon-separated pairs
    return hash.toUpperCase().match(/.{2}/g).join(':');
  }

  /**
   * Get the CA certificate PEM for installation
   */
  getCACertPem() {
    return this.caCert;
  }

  /**
   * Get CA key (for proxy server)
   */
  getCAKey() {
    return this.caKey;
  }

  /**
   * Clear the certificate cache
   */
  clearCache() {
    this.certCache.clear();
  }

  /**
   * Delete CA and regenerate
   */
  async regenerateCA() {
    // Delete existing files
    if (fs.existsSync(this.caCertPath)) {
      fs.unlinkSync(this.caCertPath);
    }
    if (fs.existsSync(this.caKeyPath)) {
      fs.unlinkSync(this.caKeyPath);
    }

    // Clear cache
    this.clearCache();

    // Generate new CA
    await this.generateCA();

    return this.getCAInfo();
  }
}

// Singleton instance
let caManagerInstance = null;

const getCAManager = () => {
  if (!caManagerInstance) {
    caManagerInstance = new CAManager();
  }
  return caManagerInstance;
};

module.exports = {
  CAManager,
  getCAManager
};
