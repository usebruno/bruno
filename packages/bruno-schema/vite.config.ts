import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
  plugins: [commonjs(), dts()],
  build: {
    minify: false,
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: '@usebruno/schema',
      fileName: 'index'
    }
  },
  clearScreen: false
});
