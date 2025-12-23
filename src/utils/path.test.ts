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
  it('converts Windows backslashes to forward slashes and removes drive letter', () => {
    expect(encodePathForUrl('C:\\Users\\test\\photo.jpg'))
      .toBe('Users/test/photo.jpg')
  })

  it('encodes spaces in Windows path', () => {
    expect(encodePathForUrl('C:\\Users\\test\\My Documents\\photo.jpg'))
      .toBe('Users/test/My%20Documents/photo.jpg')
  })

  it('encodes Japanese folder names', () => {
    expect(encodePathForUrl('C:\\Users\\test\\画像\\photo.jpg'))
      .toBe('Users/test/%E7%94%BB%E5%83%8F/photo.jpg')
  })

  it('encodes complex file name with spaces and Japanese date', () => {
    expect(encodePathForUrl('C:\\Pictures\\ChatGPT Image 2025年10月2日.png'))
      .toBe('Pictures/ChatGPT%20Image%202025%E5%B9%B410%E6%9C%882%E6%97%A5.png')
  })

  it('handles Unix paths (keeps leading slash as empty segment)', () => {
    expect(encodePathForUrl('/home/user/file name.jpg'))
      .toBe('/home/user/file%20name.jpg')
  })

  it('handles Unix paths without special characters', () => {
    expect(encodePathForUrl('/home/user/photo.jpg'))
      .toBe('/home/user/photo.jpg')
  })

  it('handles file name only', () => {
    expect(encodePathForUrl('photo file.jpg'))
      .toBe('photo%20file.jpg')
  })

  it('encodes emoji in file name', () => {
    expect(encodePathForUrl('/home/user/🎉photo🎨.jpg'))
      .toBe('/home/user/%F0%9F%8E%89photo%F0%9F%8E%A8.jpg')
  })

  it('encodes emoji in Windows path', () => {
    expect(encodePathForUrl('C:\\Users\\test\\📸写真📸.png'))
      .toBe('Users/test/%F0%9F%93%B8%E5%86%99%E7%9C%9F%F0%9F%93%B8.png')
  })

  it('encodes mixed emoji and Japanese', () => {
    expect(encodePathForUrl('/home/user/✨キラキラ✨画像.jpg'))
      .toBe('/home/user/%E2%9C%A8%E3%82%AD%E3%83%A9%E3%82%AD%E3%83%A9%E2%9C%A8%E7%94%BB%E5%83%8F.jpg')
  })

  it('encodes special unicode characters', () => {
    // サロゲートペアを含む文字（𠮷は2バイトではなく4バイト）
    expect(encodePathForUrl('/home/user/𠮷野家.jpg'))
      .toBe('/home/user/%F0%A0%AE%B7%E9%87%8E%E5%AE%B6.jpg')
  })

  it('encodes full-width brackets', () => {
    expect(encodePathForUrl('/home/user/【重要】ファイル.png'))
      .toBe('/home/user/%E3%80%90%E9%87%8D%E8%A6%81%E3%80%91%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB.png')
  })
})

describe('getFileName with emoji', () => {
  it('extracts emoji file name from Unix path', () => {
    expect(getFileName('/Users/test/images/🎉photo🎨.jpg')).toBe('🎉photo🎨.jpg')
  })

  it('extracts emoji file name from Windows path', () => {
    expect(getFileName('C:\\Users\\test\\📸写真📸.png')).toBe('📸写真📸.png')
  })

  it('handles complex emoji with Japanese', () => {
    expect(getFileName('/path/to/✨キラキラ✨.gif')).toBe('✨キラキラ✨.gif')
  })
})

describe('getDirectory with emoji', () => {
  it('extracts directory with emoji folder name', () => {
    expect(getDirectory('/Users/test/📁フォルダ/photo.jpg')).toBe('/Users/test/📁フォルダ')
  })

  it('handles emoji in both folder and file', () => {
    expect(getDirectory('/Users/🎨アート/🖼️絵.png')).toBe('/Users/🎨アート')
  })
})
