import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function classicScriptBuild() {
  return {
    name: 'classic-script-build',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html.replace(
          /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
          '<script defer src="$1"></script>',
        )
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/suahl-tools/' : './',
  plugins: [vue(), classicScriptBuild()],
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/app.js',
        assetFileNames: assetInfo => assetInfo.names?.some(name => name.endsWith('.css'))
          ? 'assets/app.css'
          : 'assets/[name][extname]',
      },
    },
  },
})
