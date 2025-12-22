import { describe, it, expect } from 'vitest'
import { getFileName, getDirectory, encodePathForUrl } from './path'

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

describe('encodePathForUrl', () => {
  it('encodes spaces in file name', () => {
    expect(encodePathForUrl('/path/to/my file.jpg')).toBe('/path/to/my%20file.jpg')
  })

  it('encodes spaces in Windows path', () => {
    expect(encodePathForUrl('C:\\Users\\test\\My Documents\\photo.jpg'))
      .toBe('C:\\Users\\test\\My%20Documents\\photo.jpg')
  })

  it('encodes Japanese characters', () => {
    expect(encodePathForUrl('C:\\Users\\test\\画像\\photo.jpg'))
      .toBe('C:\\Users\\test\\%E7%94%BB%E5%83%8F\\photo.jpg')
  })

  it('encodes complex file name with spaces and date', () => {
    expect(encodePathForUrl('C:\\Pictures\\ChatGPT Image 2025年10月2日.png'))
      .toBe('C:\\Pictures\\ChatGPT%20Image%202025%E5%B9%B410%E6%9C%882%E6%97%A5.png')
  })

  it('preserves drive letter', () => {
    expect(encodePathForUrl('C:\\file.jpg')).toBe('C:\\file.jpg')
  })

  it('preserves Unix path separators', () => {
    expect(encodePathForUrl('/home/user/file name.jpg')).toBe('/home/user/file%20name.jpg')
  })

  it('handles path without special characters', () => {
    expect(encodePathForUrl('C:\\Users\\test\\photo.jpg')).toBe('C:\\Users\\test\\photo.jpg')
  })
})
