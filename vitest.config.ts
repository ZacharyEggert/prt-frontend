import { defineConfig, defineProject } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          include: ['./tests/backend/**/*.test.ts'],
          name: { label: 'backend', color: 'yellow' },
          environment: 'node',
          setupFiles: ['./tests/backend/setup.ts']
        },
        resolve: {
          alias: {
            '@renderer': resolve(__dirname, 'src/renderer/src')
          }
        }
      }),
      defineProject({
        test: {
          include: ['./tests/frontend/**/*.test.{ts,tsx}'],
          name: { label: 'renderer', color: 'cyan' },
          environment: 'jsdom',
          setupFiles: ['./tests/frontend/setup.ts']
        },
        resolve: {
          alias: {
            '@renderer': resolve(__dirname, 'src/renderer/src')
          }
        }
      })
    ]
  }
})
