#!/usr/bin/env bash
# Regenerates the TEST-ONLY TLS fixtures used by the HTTP/2 integration tests.
# Never use these for anything but tests. Run from this directory: ./generate-certs.sh
set -euo pipefail
DAYS=3650
# --- Root CA (signs the lab server cert) ---
openssl req -x509 -newkey rsa:2048 -nodes -days $DAYS -sha256 \
  -keyout ca-key.pem -out ca.pem -subj "/CN=Bruno HTTP2 Test CA" \
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"
# --- Server cert: SANs for localhost / 127.0.0.1 / ::1 ---
openssl req -newkey rsa:2048 -nodes -keyout server-key.pem -out server.csr -subj "/CN=localhost"
cat > server.ext <<EXT
subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
basicConstraints=CA:FALSE
EXT
openssl x509 -req -in server.csr -CA ca.pem -CAkey ca-key.pem -CAcreateserial -days $DAYS -sha256 -extfile server.ext -out server.pem
# --- Client CA + client cert (mTLS) ---
openssl req -x509 -newkey rsa:2048 -nodes -days $DAYS -sha256 \
  -keyout client-ca-key.pem -out client-ca.pem -subj "/CN=Bruno HTTP2 Test Client CA" \
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign"
openssl req -newkey rsa:2048 -nodes -keyout client-key.pem -out client.csr -subj "/CN=bruno-test-client"
cat > client.ext <<EXT
keyUsage=critical,digitalSignature
extendedKeyUsage=clientAuth
basicConstraints=CA:FALSE
EXT
openssl x509 -req -in client.csr -CA client-ca.pem -CAkey client-ca-key.pem -CAcreateserial -days $DAYS -sha256 -extfile client.ext -out client.pem
# Second, DIFFERENT client identity (for cert-aware pooling tests)
openssl req -newkey rsa:2048 -nodes -keyout client2-key.pem -out client2.csr -subj "/CN=bruno-test-client-2"
openssl x509 -req -in client2.csr -CA client-ca.pem -CAkey client-ca-key.pem -CAcreateserial -days $DAYS -sha256 -extfile client.ext -out client2.pem
# Cleanup intermediates; drop CA private keys (only needed to mint new certs — rerun this script).
rm -f *.csr *.ext *.srl ca-key.pem client-ca-key.pem
echo "generated:"; ls -1 *.pem
