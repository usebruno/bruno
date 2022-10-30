module.exports = {
  reactStrictMode: true,
  publicRuntimeConfig: {
    CI: process.env.CI,
    PLAYWRIGHT: process.env.PLAYWRIGHT
  },
  webpack: (config, { isServer }) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      config.resolve.fallback.fs = false;
    }
    return config;
  },
};
