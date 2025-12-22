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
