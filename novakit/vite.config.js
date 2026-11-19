import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages serves project sites from /<repository-name>/.
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS && repositoryName
  ? `/${repositoryName}/`
  : '/';

export default defineConfig({
  base,
  plugins: [react()],
});
