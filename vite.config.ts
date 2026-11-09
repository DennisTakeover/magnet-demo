import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `--mode standalone` inlines every asset so the build can be folded into one HTML file.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  build: mode === 'standalone'
    ? { outDir: 'dist-standalone', assetsInlineLimit: 100_000_000, cssCodeSplit: false }
    : {},
}));
