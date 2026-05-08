import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      // Force Vite to use ExcelJS browser bundle instead of the Node.js entry point.
      // Without this, writeBuffer() produces malformed output in the browser.
      'exceljs': 'exceljs/dist/exceljs.min.js',
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        menu: resolve(__dirname, 'menu.html'),
      }
    }
  }
})
