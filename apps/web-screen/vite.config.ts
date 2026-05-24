import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { defineConfig } from '../web-teacher/node_modules/vite/dist/node/index.js';
import vue from '../web-teacher/node_modules/@vitejs/plugin-vue/dist/index.mjs';

const teacherNodeModules = fileURLToPath(new URL('../web-teacher/node_modules/', import.meta.url));
const appVersion = execSync('git rev-parse --short HEAD').toString().trim();

export default defineConfig({
  base: '/screen/',
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion)
  },
  plugins: [vue()],
  resolve: {
    alias: {
      vue: `${teacherNodeModules}vue/dist/vue.runtime.esm-bundler.js`,
      'lucide-vue-next': `${teacherNodeModules}lucide-vue-next/dist/esm/lucide-vue-next.js`
    }
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
});
