/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // Test đơn vị nằm cạnh mã nguồn; tests/ là Playwright.
    include: ['src/**/*.test.ts'],
  },
})
