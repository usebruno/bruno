module.exports = {
  reactStrictMode: false,
  publicRuntimeConfig: {
    CI: process.env.CI,
    PLAYWRIGHT: process.env.PLAYWRIGHT,
    ENV: process.env.ENV
  },
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs`, `net` or `tls` module
    if (!isServer) {
      config.resolve.fallback.fs = false;
      config.resolve.fallback.net = false;
      config.resolve.fallback.tls = false;
    }
    return config;
  }
};
