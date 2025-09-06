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
- Add the CA certificate to your system's truststore (macOS/Linux)

**Generated Files:**
- `certs/ca-cert.pem` - Certificate Authority certificate
- `certs/ca-key.pem` - CA private key
- `certs/localhost-cert.pem` - Server certificate for localhost
- `certs/localhost-key.pem` - Server private key

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

```bash
# Test with curl
curl https://localhost:8090

# Test certificate verification
openssl s_client -connect localhost:8090 -CAfile certs/ca-cert.pem
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
