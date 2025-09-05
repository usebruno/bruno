const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function execCommand(command, cwd = process.cwd()) {
  return execSync(command, { 
    cwd, 
    stdio: 'inherit',
    timeout: 30000 
  });
}

function execCommandSilent(command, cwd = process.cwd()) {
  return execSync(command, { 
    cwd, 
    stdio: 'pipe',
    timeout: 30000 
  });
}

function detectPlatform() {
  const platform = os.platform();
  switch (platform) {
    case 'darwin': return 'macos';
    case 'linux': return 'linux';
    case 'win32': return 'windows';
    default: throw new Error(`Unsupported platform: ${platform}`);
  }
}

function createCertsDir(certsDir) {
  if (fs.existsSync(certsDir)) {
    fs.rmSync(certsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(certsDir, { recursive: true });
}

function generateCertificates(certsDir) {
  execCommand('openssl version');
  
  // Generate CA private key
  execCommand('openssl genrsa -out ca-key.pem 4096', certsDir);
  
  // Create CA configuration file with proper CA extensions and subject (LibreSSL/OpenSSL compatible)
  const caConfigContent = `[req]
distinguished_name = req_distinguished_name
x509_extensions = v3_ca
prompt = no

[req_distinguished_name]
C = US
ST = Dev
L = Local
O = Local Dev CA
CN = Local Dev CA

[v3_ca]
basicConstraints = critical, CA:TRUE
keyUsage = critical, keyCertSign, cRLSign
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always`;
  
  fs.writeFileSync(path.join(certsDir, 'ca.conf'), caConfigContent);
  
  // Generate CA certificate with proper CA extensions using config file (no -subj needed)
  execCommand('openssl req -new -x509 -key ca-key.pem -out ca-cert.pem -days 3650 -config ca.conf', certsDir);
  
  // Generate server private key and CSR
  execCommand('openssl genrsa -out localhost-key.pem 4096', certsDir);
  
  // Create server CSR configuration file
  const serverCsrConfigContent = `[req]
distinguished_name = req_distinguished_name
prompt = no

[req_distinguished_name]
C = US
ST = Dev
L = Local
O = Local Dev
CN = localhost`;
  
  fs.writeFileSync(path.join(certsDir, 'localhost-csr.conf'), serverCsrConfigContent);
  execCommand('openssl req -new -key localhost-key.pem -out localhost.csr -config localhost-csr.conf', certsDir);
  
  // Create server certificate configuration file (LibreSSL/OpenSSL compatible)
  const serverConfigContent = `[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
C = Country Name
ST = State or Province Name
L = Locality Name
O = Organization Name
CN = Common Name

[v3_req]
keyUsage = critical, keyEncipherment, dataEncipherment, digitalSignature
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
basicConstraints = critical, CA:FALSE
authorityKeyIdentifier = keyid:always,issuer:always

[alt_names]
DNS.1 = localhost
DNS.2 = localhost.localdomain
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = ::ffff:127.0.0.1`;
  
  fs.writeFileSync(path.join(certsDir, 'localhost.conf'), serverConfigContent);
  execCommand('openssl x509 -req -in localhost.csr -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial -out localhost-cert.pem -days 730 -extensions v3_req -extfile localhost.conf', certsDir);
  
  const platform = detectPlatform();
  if (platform === 'windows') {
    execCommand('openssl x509 -in ca-cert.pem -outform DER -out ca-cert.der', certsDir);
    execCommand('openssl pkcs12 -export -out localhost.p12 -inkey localhost-key.pem -in localhost-cert.pem -certfile ca-cert.pem -password pass:', certsDir);
    execCommand('openssl x509 -in localhost-cert.pem -outform DER -out localhost-cert.der', certsDir);
  }
  
  if (platform !== 'windows') {
    execCommand('chmod 600 ca-key.pem localhost-key.pem', certsDir);
    execCommand('chmod 644 ca-cert.pem localhost-cert.pem', certsDir);
  }
  
  ['localhost.csr', 'localhost.conf', 'localhost-csr.conf', 'ca.conf', 'ca-cert.srl'].forEach(file => {
    const filePath = path.join(certsDir, file);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });
  
  // Validate certificate chain
  validateCertificateChain(certsDir);
}

function validateCertificateChain(certsDir) {
  try {
    // Verify CA certificate is valid and has proper CA extensions
    const caVerifyOutput = execCommandSilent('openssl x509 -in ca-cert.pem -text -noout', certsDir).toString();
    
    if (!caVerifyOutput.includes('CA:TRUE')) {
      throw new Error('CA certificate missing basicConstraints=CA:TRUE');
    }
    
    if (!caVerifyOutput.includes('Certificate Sign')) {
      throw new Error('CA certificate missing keyCertSign in keyUsage');
    }
    
    // Verify server certificate is valid and signed by CA
    const serverVerifyOutput = execCommandSilent('openssl x509 -in localhost-cert.pem -text -noout', certsDir).toString();
    
    if (!serverVerifyOutput.includes('CA:FALSE')) {
      throw new Error('Server certificate should have basicConstraints=CA:FALSE');
    }
    
    if (!serverVerifyOutput.includes('TLS Web Server Authentication')) {
      throw new Error('Server certificate missing serverAuth in extendedKeyUsage');
    }
    
    // Verify certificate chain
    execCommandSilent('openssl verify -CAfile ca-cert.pem localhost-cert.pem', certsDir);
    
    console.log('✓ Certificate chain validation passed');
  } catch (error) {
    console.error('Certificate validation failed:', error.message);
    throw new Error(`Certificate validation failed: ${error.message}`);
  }
}

function addCAToTruststore(certsDir) {
  const platform = detectPlatform();

  switch (platform) {
    case 'macos': {
      const macCertPath = path.join(certsDir, 'ca-cert.pem');
      execCommand(`sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "${macCertPath}"`);
      break;
    }

    case 'linux': {
      const linuxCertPath = path.join(certsDir, 'ca-cert.pem');
      execCommand(`sudo cp "${linuxCertPath}" /usr/local/share/ca-certificates/bruno-ca.crt`);
      execCommand('sudo update-ca-certificates');
      break;
    }

    case 'windows': {
      const winCertPath = path.join(certsDir, 'ca-cert.der');

      // Escape backslashes for PowerShell
      const psPath = winCertPath.replace(/\\/g, '\\\\');

      // PowerShell .NET method (works reliably in CI)
      const psCommand = [
        `$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2('${psPath}');`,
        `$store = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root','LocalMachine');`,
        `$store.Open('ReadWrite');`,
        `$store.Add($cert);`,
        `$store.Close();`,
        // Verify cert was added by checking if it exists in LocalMachine\Root
        `$verifyStore = New-Object System.Security.Cryptography.X509Certificates.X509Store('Root','LocalMachine');`,
        `$verifyStore.Open('ReadOnly');`,
        `$found = $verifyStore.Certificates | Where-Object { $_.Thumbprint -eq $cert.Thumbprint };`,
        `$verifyStore.Close();`,
        `if (-not $found) { throw 'Certificate was not added to LocalMachine\Root' };`
      ].join(' ');

      execCommand(`powershell -Command "${psCommand}"`);
      break;
    }

    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

function verifyCertificates(certsDir) {
  const platform = detectPlatform();
  // Core PEM files required for all platforms
  const requiredFiles = ['ca-cert.pem', 'ca-key.pem', 'localhost-cert.pem', 'localhost-key.pem'];
  
  // Verify required PEM files exist
  for (const file of requiredFiles) {
    const filePath = path.join(certsDir, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`missing certificate file: ${file}`);
    }
  }
  
  // Check Windows-specific files but don't require them (they're optional fallbacks)
  if (platform === 'windows') {
    const windowsFiles = ['ca-cert.der', 'localhost.p12', 'localhost-cert.der'];
    for (const file of windowsFiles) {
      const filePath = path.join(certsDir, file);
      if (fs.existsSync(filePath)) {
        console.log(`✓ Windows certificate file available: ${file}`);
      } else {
        console.log(`⚠ Windows certificate file missing (but not required): ${file}`);
      }
    }
  }
}

function getServerCertificateOptions(certsDir) {
  return {
    key: fs.readFileSync(path.join(certsDir, 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(certsDir, 'localhost-cert.pem')),
    ca: fs.readFileSync(path.join(certsDir, 'ca-cert.pem'))
  };
}

module.exports = {
  createCertsDir,
  generateCertificates,
  addCAToTruststore,
  verifyCertificates,
  getServerCertificateOptions,
  detectPlatform,
  execCommand,
  execCommandSilent
};

