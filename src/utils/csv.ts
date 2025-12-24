/**
 * CSV パースユーティリティ
 * 単語リストCSVの読み込みと解析
 */

import type { WordList, WordListEntry } from '../types'
import { normalize } from './normalize'

/**
 * CSVテキストをパースしてWordListを生成
 *
 * フォーマット:
 * ```
 * @work,作品名,英語名,別名1,別名2
 * 日本語名,英語名,中国語名,aliases
 * キャラ1,Char1,角色1,alias1|alias2
 * キャラ2,Char2,角色2,alias3
 * ```
 */
export function parseWordListCSV(csvText: string, fileName: string): WordList {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const entries: WordListEntry[] = []
  let headerFound = false

  for (const line of lines) {
    // @work で始まる行は作品名
    if (line.startsWith('@work,') || line.startsWith('@work，')) {
      const parts = parseCSVLine(line)
      if (parts.length >= 2) {
        const canonical = parts[1] // 最初の値が作品名
        const aliases = parts.slice(2).filter((a) => a.length > 0)

        const entry = createEntry('work', canonical, aliases)
        entries.push(entry)
      }
      continue
    }

    // ヘッダー行をスキップ
    if (!headerFound && isHeaderLine(line)) {
      headerFound = true
      continue
    }

    // キャラクター行
    const parts = parseCSVLine(line)
    if (parts.length >= 1 && parts[0].length > 0) {
      const canonical = parts[0] // 日本語名
      const aliases: string[] = []

      // 英語名
      if (parts[1]?.length > 0) {
        aliases.push(parts[1])
      }

      // 中国語名
      if (parts[2]?.length > 0) {
        aliases.push(parts[2])
      }

      // aliases列（パイプ区切り）
      if (parts[3]?.length > 0) {
        const extraAliases = parts[3].split('|').map((a) => a.trim()).filter((a) => a.length > 0)
        aliases.push(...extraAliases)
      }

      const entry = createEntry('character', canonical, aliases)
      entries.push(entry)
    }
  }

  return {
    fileName,
    entries,
  }
}

/**
 * CSV行をパース（カンマ区切り、クォート対応）
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたクォート
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if ((char === ',' || char === '，') && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

/**
 * ヘッダー行かどうか判定
 */
function isHeaderLine(line: string): boolean {
  const lower = line.toLowerCase()
  return (
    lower.includes('日本語') ||
    lower.includes('英語') ||
    lower.includes('中国語') ||
    lower.includes('aliases') ||
    lower.includes('name')
  )
}

/**
 * WordListEntryを作成
 */
function createEntry(
  type: 'work' | 'character',
  canonical: string,
  aliases: string[]
): WordListEntry {
  const canonicalNormalized = normalize(canonical)
  const aliasesNormalized = aliases.map((a) => normalize(a))

  // 検索キー（重複除去）
  const searchKeysSet = new Set<string>([canonicalNormalized, ...aliasesNormalized])

  // 複数単語の別名から各単語も検索キーに追加
  // 例: "Grace Howard" → ["gracehoward", "grace", "howard"]
  // 例: "シーザー・キング" → ["シーザーキング", "シーザー", "キング"]
  const MIN_WORD_LENGTH = 4
  for (const alias of aliases) {
    const words = alias.split(/[\s\u3000・•\-－‐]+/)
    if (words.length > 1) {
      for (const word of words) {
        const normalizedWord = normalize(word)
        if (normalizedWord.length >= MIN_WORD_LENGTH) {
          searchKeysSet.add(normalizedWord)
        }
      }
    }
  }

  const searchKeysNormalized = Array.from(searchKeysSet).filter((k) => k.length > 0)

  return {
    type,
    canonical,
    aliases,
    canonicalNormalized,
    aliasesNormalized,
    searchKeysNormalized,
  }
}

/**
 * ファイルからCSVを読み込んでWordListを生成
 */
export async function loadWordListFromFile(filePath: string): Promise<WordList> {
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  const csvText = await readTextFile(filePath)

  // ファイル名を抽出
  const fileName = filePath.replace(/\\/g, '/').split('/').pop() || filePath

  return parseWordListCSV(csvText, fileName)
}
