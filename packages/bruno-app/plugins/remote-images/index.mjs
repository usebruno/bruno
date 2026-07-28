import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Rsbuild plugin: rewrite remote image URLs (from configured domains) in
 * matched source files to locally emitted build assets.
 *
 * @param {{ domains?: string[], include?: RegExp[] }} [options]
 * @returns {import('@rsbuild/core').RsbuildPlugin}
 */
export function pluginRemoteImages(options = {}) {
  const domains = options.domains || [];
  const include = options.include && options.include.length ? options.include : [/\.md$/];

  return {
    name: 'plugin-remote-images',
    setup(api) {
      api.modifyRspackConfig((config) => {
        config.module = config.module || {};
        config.module.rules = config.module.rules || [];

        // Drop any prior .md asset/source rule so we own markdown modules.
        config.module.rules = config.module.rules.filter((rule) => {
          if (!rule || typeof rule !== 'object') return true;
          const test = rule.test;
          if (test instanceof RegExp && String(test) === String(/\.md$/)) {
            return false;
          }
          return true;
        });

        config.module.rules.push({
          test: include.length === 1 ? include[0] : include,
          type: 'javascript/auto',
          use: [
            {
              loader: path.join(__dirname, 'loader.cjs'),
              options: { domains }
            }
          ]
        });
      });
    }
  };
}

export default pluginRemoteImages;
