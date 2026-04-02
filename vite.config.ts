import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        vue: resolve(__dirname, 'src/vue.ts'),
      },
      name: 'hypSpritesImg',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        format === 'es'
          ? `${entryName === 'index' ? 'index' : 'vue'}.js`
          : `${entryName === 'index' ? 'index' : 'vue'}.cjs`,
    },
    rollupOptions: {
      external: [
        'vue',
        'vite',
        'node:fs',
        'node:path',
        'node:url',
        'image-size',
        'sharp',
        'virtual:hyp-sprites-img',
      ],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
        },
      },
    },
    sourcemap: true,
  },
})
