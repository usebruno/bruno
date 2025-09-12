# CA Certificates Test Server

A Node.js HTTPS test server with self-signed certificate generation for testing SSL/TLS connections in Bruno.

## Overview

This server provides two main functionalities:
1. **Certificate Generation** - Creates a complete CA certificate chain for testing
2. **HTTPS Server** - Runs a secure server using the generated certificates

## Usage

### 1. Generate Certificates

Generate the required CA certificates and add them to your system's truststore:

```bash
node scripts/generate-certs.js
```

This will:
- Create a `certs/` directory
- Generate CA certificate, server certificate, and private keys
- Verify the certificate chain
- Add the CA certificate to your system's truststore (macOS/Linux/Windows)

**Generated Files:**
- `certs/ca-cert.pem` - Certificate Authority certificate
- `certs/ca-key.pem` - CA private key
- `certs/localhost-cert.pem` - Server certificate for localhost
- `certs/localhost-key.pem` - Server private key

**Windows-Specific Files (automatically generated on Windows):**
- `certs/ca-cert.der` - CA certificate in DER format (for Windows certificate store)
- `certs/localhost.p12` - PKCS#12 bundle containing server certificate and key
- `certs/localhost-cert.der` - Server certificate in DER format

### Certificate Installation Details

The certificate generation script automatically adds the CA certificate to your system's truststore:

**macOS:** Uses `security add-trusted-cert` to add the CA to the System keychain
**Linux:** Copies the CA certificate to `/usr/local/share/ca-certificates/` and runs `update-ca-certificates`
**Windows:** Uses PowerShell to add the CA certificate to the LocalMachine\Root certificate store

> **Note:** On Windows, the script requires Administrator privileges to install certificates to the machine-wide certificate store. If you encounter permission issues, run your terminal as Administrator.

### 2. Run HTTPS Server

Start the HTTPS server on port 8090:

```bash
node index.js
```

The server will:
- Load certificates from the `certs/` directory
- Start an HTTPS server on `https://localhost:8090`
- Serve a simple "helloworld" response
- Handle graceful shutdown on SIGINT/SIGTERM

## Testing

Once the server is running, you can test SSL connections:

### Unix/Linux/macOS
```bash
# Test with curl
curl https://localhost:8090

# Test certificate verification
openssl s_client -connect localhost:8090 -CAfile certs/ca-cert.pem
```

### Windows
```powershell
# Test with curl (if available)
curl https://localhost:8090

# Test with PowerShell Invoke-WebRequest
Invoke-WebRequest -Uri https://localhost:8090

# Test certificate verification with OpenSSL
openssl s_client -connect localhost:8090 -CAfile certs/ca-cert.pem

# Verify certificate is installed in Windows certificate store
Get-ChildItem -Path Cert:\LocalMachine\Root | Where-Object { $_.Subject -like "*Local Dev CA*" }

# Test with .NET WebClient (alternative method)
$client = New-Object System.Net.WebClient
$client.DownloadString("https://localhost:8090")
```

## File Structure

```
server/
├── index.js              # Main HTTPS server
├── scripts/
│   └── generate-certs.js  # Certificate generation script
├── helpers/
│   ├── certs.js          # Certificate management utilities
│   └── platform.js       # Platform-specific utilities
├── certs/                # Generated certificates (created by script)
└── readme.md            # This file
```
