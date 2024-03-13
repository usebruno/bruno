import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import commonjs from 'vite-plugin-commonjs';

export default defineConfig({
  plugins: [commonjs(), dts()],
  build: {
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      formats: ['cjs', 'es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: 'node:vm'
    }
  },
  clearScreen: false
});
