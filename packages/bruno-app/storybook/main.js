const path = require('path');

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-webpack5-compiler-babel'
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {}
  },
  docs: {
    autodocs: true
  },
  webpackFinal: async (config) => {
    // Add path aliases to match jsconfig.json
    config.resolve.alias = {
      ...config.resolve.alias,
      assets: path.resolve(__dirname, '../src/assets'),
      ui: path.resolve(__dirname, '../src/ui'),
      components: path.resolve(__dirname, '../src/components'),
      hooks: path.resolve(__dirname, '../src/hooks'),
      themes: path.resolve(__dirname, '../src/themes'),
      api: path.resolve(__dirname, '../src/api'),
      pageComponents: path.resolve(__dirname, '../src/pageComponents'),
      providers: path.resolve(__dirname, '../src/providers'),
      utils: path.resolve(__dirname, '../src/utils')
    };

    return config;
  }
};

module.exports = config;
