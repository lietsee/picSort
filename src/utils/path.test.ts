import { describe, it, expect } from 'vitest'
import { getFileName, getDirectory } from './path'

describe('getFileName', () => {
  it('extracts file name from Unix path', () => {
    expect(getFileName('/Users/test/images/photo.jpg')).toBe('photo.jpg')
  })

  it('extracts file name from Windows path', () => {
    expect(getFileName('C:\\Users\\test\\images\\photo.jpg')).toBe('photo.jpg')
  })

  it('handles path with mixed separators', () => {
    expect(getFileName('C:/Users/test\\images/photo.jpg')).toBe('photo.jpg')
  })

  it('returns file name when no directory', () => {
    expect(getFileName('photo.jpg')).toBe('photo.jpg')
  })

  it('returns empty string for empty path', () => {
    expect(getFileName('')).toBe('')
  })

  it('handles trailing separator', () => {
    expect(getFileName('/path/to/folder/')).toBe('')
  })
})

describe('getDirectory', () => {
  it('extracts directory from Unix path', () => {
    expect(getDirectory('/Users/test/images/photo.jpg')).toBe('/Users/test/images')
  })

  it('extracts directory from Windows path', () => {
    expect(getDirectory('C:\\Users\\test\\images\\photo.jpg')).toBe('C:\\Users\\test\\images')
  })

  it('handles path with mixed separators', () => {
    expect(getDirectory('C:/Users/test\\images/photo.jpg')).toBe('C:/Users/test\\images')
  })

  it('returns empty string for file name only', () => {
    expect(getDirectory('photo.jpg')).toBe('')
  })
})
