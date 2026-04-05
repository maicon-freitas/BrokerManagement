import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Carrega `.env` da raiz do repositório E de `client/` (cliente sobrescreve). */
export default defineConfig(({ mode }) => {
  const repoRoot = path.resolve(__dirname, '..');
  const merged = {
    ...loadEnv(mode, repoRoot, 'VITE_'),
    ...loadEnv(mode, __dirname, 'VITE_'),
  };
  const define: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    define[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  return {
    plugins: [react()],
    define,
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyDir: true,
    },
  };
});
