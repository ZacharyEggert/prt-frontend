import { expect, beforeEach, afterEach } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import type { PrtAPI } from '../../src/preload/index.d'
import { mockApi, resetMockApi } from './mocks/mock-api'

expect.extend(matchers)

beforeEach(() => {
  resetMockApi()
  window.api = mockApi as unknown as PrtAPI
})

afterEach(() => {
  // @ts-expect-error -- Cleaning up mock from global window
  delete window.api
})
