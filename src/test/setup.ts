import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Tauri APIのモック
vi.mock('@tauri-apps/api/core', () => {
  return {
    invoke: vi.fn(),
    convertFileSrc: vi.fn((path: string) => `asset://localhost${path}`),
  }
})

// Tauri Dialog プラグインのモック
vi.mock('@tauri-apps/plugin-dialog', () => {
  return {
    open: vi.fn(),
  }
})
