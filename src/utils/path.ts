/**
 * Cross-platform path utilities for Windows/Unix compatibility
 */

/**
 * Get file name from path (handles both / and \ separators)
 */
export function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() || ''
}

/**
 * Get directory part of path (handles both / and \ separators)
 */
export function getDirectory(path: string): string {
  if (!path.includes('/') && !path.includes('\\')) {
    return ''
  }
  return path.replace(/[\\/][^\\/]+$/, '')
}

/**
 * Encode file path for URL (percent-encode spaces and special characters)
 * Preserves directory separators and drive letters (e.g., C:)
 */
export function encodePathForUrl(path: string): string {
  return path
    .split(/([/\\])/)
    .map(segment => {
      // Keep separators and drive letters (C:) as-is
      if (segment === '/' || segment === '\\' || /^[A-Za-z]:$/.test(segment)) {
        return segment
      }
      return encodeURIComponent(segment)
    })
    .join('')
}
