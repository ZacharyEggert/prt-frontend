import { expect, beforeEach, afterEach, vi } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'
import type { PrtAPI } from '../../src/preload/index.d'
import { mockApi, resetMockApi } from './mocks/mock-api'

expect.extend(matchers)

function createStorageMock(): Storage {
  let store: Record<string, string> = {}

  return {
    get length() {
      return Object.keys(store).length
    },
    clear(): void {
      store = {}
    },
    getItem(key: string): string | null {
      return key in store ? store[key] : null
    },
    key(index: number): string | null {
      return Object.keys(store)[index] ?? null
    },
    removeItem(key: string): void {
      delete store[key]
    },
    setItem(key: string, value: string): void {
      store[key] = value
    }
  }
}

const storageMock = createStorageMock()

Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  writable: true
})

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true
})

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe(): void {
      return
    }

    unobserve(): void {
      return
    }

    disconnect(): void {
      return
    }
  }
}

beforeEach(() => {
  resetMockApi()
  window.api = mockApi as unknown as PrtAPI
  localStorage.clear()
  document.documentElement.classList.remove('dark')
})

afterEach(() => {
  // @ts-expect-error -- Cleaning up mock from global window
  delete window.api
})
