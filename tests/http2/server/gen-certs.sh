#!/usr/bin/env bash
# Generates a private test CA plus server / client / wrong-host certificates for the HTTP/2 testbed.
# Re-run any time; it overwrites everything in ./certs.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p certs
cd certs
rm -f ./*.pem ./*.crt ./*.key ./*.pfx ./*.srl ./*.csr ./*.ext

DAYS=825

echo "› CA"
openssl genrsa -out ca.key 2048 2>/dev/null
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -subj "/CN=Bruno HTTP2 Testbed CA/O=Bruno QA" -out ca.crt

# Node refuses a wildcard directly under a single-label name (*.localhost), so the hosts the collection uses are listed explicitly.
echo "› server (localhost, h2.localhost, proxied.localhost, virtual.example, 127.0.0.1, ::1)"
openssl genrsa -out server.key 2048 2>/dev/null
openssl req -new -key server.key -subj "/CN=localhost/O=Bruno QA" -out server.csr
cat > server.ext <<EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:localhost,DNS:*.localhost,DNS:h2.localhost,DNS:proxied.localhost,DNS:virtual.example,IP:127.0.0.1,IP:::1
EOF
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days $DAYS -sha256 -extfile server.ext 2>/dev/null

echo "› wrong-host server cert (self-signed, CN=wrong.example) — for TLS failure tests"
openssl genrsa -out wronghost.key 2048 2>/dev/null
cat > wronghost.ext <<EOF
basicConstraints=CA:FALSE
subjectAltName=DNS:wrong.example
EOF
openssl req -x509 -new -key wronghost.key -sha256 -days $DAYS \
  -subj "/CN=wrong.example/O=Nobody" -out wronghost.crt \
  -extensions v3_req -config <(printf "[req]\ndistinguished_name=dn\n[dn]\n[v3_req]\nsubjectAltName=DNS:wrong.example\n")

make_client() {
  local name="$1" cn="$2"
  echo "› client cert: $name (CN=$cn)"
  openssl genrsa -out "$name.key" 2048 2>/dev/null
  openssl req -new -key "$name.key" -subj "/CN=$cn/O=Bruno QA" -out "$name.csr"
  cat > "$name.ext" <<EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=clientAuth
EOF
  openssl x509 -req -in "$name.csr" -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out "$name.crt" -days $DAYS -sha256 -extfile "$name.ext" 2>/dev/null
  # PFX with passphrase "bruno"; AES/SHA-256 so OpenSSL 3 (Node, Electron) can read it — LibreSSL defaults to RC2
  # PFX is only used by the (ci-skip) "PFX client certificate" test. Try modern AES flags,
  # fall back to the default algorithm, and otherwise skip — macOS LibreSSL lacks some flags.
  openssl pkcs12 -export -inkey "$name.key" -in "$name.crt" -certfile ca.crt \
      -keypbe AES-256-CBC -certpbe AES-256-CBC -macalg sha256 -passout pass:bruno -out "$name.pfx" 2>/dev/null \
    || openssl pkcs12 -export -inkey "$name.key" -in "$name.crt" -certfile ca.crt \
      -passout pass:bruno -out "$name.pfx" 2>/dev/null \
    || echo "  (pfx export skipped — openssl lacks pkcs12 support)"
}
make_client client  "bruno-qa-client"
make_client client2 "bruno-qa-client-2"

rm -f ./*.csr ./*.ext ./*.srl
echo
echo "Done. Files in $(pwd):"
ls -1
