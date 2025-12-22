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
 * Encode file path for URL (for Tauri's convertFileSrc)
 * On Windows, convertFileSrc requires:
 * - Backslashes converted to forward slashes
 * - Drive letter (C:) removed
 * - Path segments URL-encoded
 * See: https://github.com/tauri-apps/tauri/issues/7970
 */
export function encodePathForUrl(path: string): string {
  // Windows: convert backslashes to forward slashes
  let normalized = path.replace(/\\/g, '/')

  // Windows: remove drive letter (e.g., C:/)
  normalized = normalized.replace(/^[A-Za-z]:\//, '')

  // URL-encode each path segment (preserve slashes)
  return normalized
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}
