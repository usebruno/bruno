import type { UserConfig } from 'vite';
import { defineConfig, mergeConfig } from 'vite';
import { external, getBuildConfig } from './vite.base.config';
import { resolve } from 'path';
import commonjs from 'vite-plugin-commonjs';
import { cpSync, mkdirSync } from 'node:fs';

export default defineConfig((env) => {
  // Copy the about files
  mkdirSync(resolve(__dirname, '.vite/build/about'), { recursive: true });
  cpSync(resolve(__dirname, 'src/about/'), resolve(__dirname, '.vite/build/about/'), { recursive: true });

  const config: UserConfig = {
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.js'),
        fileName: () => '[name].js',
        formats: ['cjs']
      },
      rollupOptions: {
        external
      }
    },
    resolve: {
      // Load the Node.js entry.
      mainFields: ['module', 'jsnext:main', 'jsnext']
    },
    plugins: [commonjs()]
  };

  return mergeConfig(getBuildConfig(env), config);
});
