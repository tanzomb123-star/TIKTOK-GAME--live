import { defineConfig } from 'vite';
export default defineConfig({
  server: { port: 5173 },
  build: { rollupOptions: { input: { tower: 'index.html', war: 'war.html' } } },
  test: { include: ['tests/**/*.test.js'] },
});
