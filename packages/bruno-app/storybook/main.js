const path = require('path');

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  stories: ['../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-webpack5-compiler-babel',
    '@storybook/addon-docs'
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

    // Storybook's default CSS rule only runs css-loader + style-loader, so the
    // Tailwind directives in src/styles/globals.css never expand. Append
    // postcss-loader (which reads postcss.config.js → tailwindcss + autoprefixer)
    // to every existing CSS rule so utility classes actually apply.
    const postcssLoader = {
      loader: 'postcss-loader',
      options: {
        postcssOptions: { config: path.resolve(__dirname, '../postcss.config.js') }
      }
    };
    const loaderName = (entry) => (typeof entry === 'string' ? entry : (entry && entry.loader) || '');
    const addPostcss = (rules = []) => {
      rules.forEach((rule) => {
        if (!rule || typeof rule !== 'object') return;
        if (Array.isArray(rule.oneOf)) addPostcss(rule.oneOf);
        if (Array.isArray(rule.rules)) addPostcss(rule.rules);
        const test = rule.test && rule.test.toString();
        if (test && test.includes('css') && Array.isArray(rule.use)) {
          const uses = rule.use.map(loaderName);
          if (uses.some((u) => u.includes('css-loader')) && !uses.some((u) => u.includes('postcss-loader'))) {
            rule.use.push(postcssLoader);
          }
        }
      });
    };
    addPostcss(config.module.rules);

    return config;
  }
};

module.exports = config;
