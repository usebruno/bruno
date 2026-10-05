const DEFAULT_DEV_PORT = 3000;

// BRUNO_DEV_PORT is interpolated into http://localhost:${port}. Reject anything
// that is not a plain port so a value like "3000@evil.test" cannot change the host.
function resolveDevPort(raw = process.env.BRUNO_DEV_PORT) {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return DEFAULT_DEV_PORT;
  }

  const value = String(raw).trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`BRUNO_DEV_PORT must be a numeric port, received "${value}"`);
  }

  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new Error(`BRUNO_DEV_PORT must be between 1 and 65535, received "${value}"`);
  }

  return port;
}

module.exports = {
  DEFAULT_DEV_PORT,
  resolveDevPort
};
