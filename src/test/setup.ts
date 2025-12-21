import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Tauri APIのモック
vi.mock('@tauri-apps/api/core', () => {
  return {
    invoke: vi.fn(),
    convertFileSrc: vi.fn((path: string) => `asset://localhost${path}`),
  }
})

// Tauri Path APIのモック
vi.mock('@tauri-apps/api/path', () => {
  return {
    appDataDir: vi.fn(() => Promise.resolve('/mock/app/data')),
    join: vi.fn((...paths: string[]) => Promise.resolve(paths.join('/'))),
  }
})

// Tauri Dialog プラグインのモック
vi.mock('@tauri-apps/plugin-dialog', () => {
  return {
    open: vi.fn(),
  }
})

// Tauri Window APIのモック
vi.mock('@tauri-apps/api/window', () => {
  const mockWindow = {
    isFullscreen: vi.fn(() => Promise.resolve(false)),
    setFullscreen: vi.fn(() => Promise.resolve()),
    innerSize: vi.fn(() => Promise.resolve({ width: 1280, height: 800 })),
    outerPosition: vi.fn(() => Promise.resolve({ x: 100, y: 100 })),
  }
  return {
    getCurrentWindow: vi.fn(() => mockWindow),
  }
})

// Tauri Event APIのモック
vi.mock('@tauri-apps/api/event', () => {
  return {
    listen: vi.fn(() => Promise.resolve(() => {})),
    emit: vi.fn(() => Promise.resolve()),
  }
})
