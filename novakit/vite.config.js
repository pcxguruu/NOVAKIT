import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const defaultBase = process.env.GITHUB_ACTIONS && repositoryName
  ? `/${repositoryName}/`
  : '/';

// The web app is published under /app/ on GitHub Pages.
// Local builds (including Capacitor APK builds) keep the root base.
const base = process.env.VITE_BASE_PATH || defaultBase;

export default defineConfig({
  base,
  plugins: [react()],
});
