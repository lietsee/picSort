/**
 * 正規化エンジン
 * SPEC.md に準拠した文字列正規化処理
 */

// =========================
// 1) MASK (伏せ字) - 保持対象
// =========================

const MASK_SINGLE_CHARS = ['〇', '◯', '○', '●', '*', '?'] as const

const MASK_RUN_PATTERNS = {
  underscoreRun: /_{2,}/g,
  xRun: /[xX]{2,}/g,
} as const

const MASK_TOKEN_PREFIX = '<MASK:'
const MASK_TOKEN_SUFFIX = '>'
const MASK_TOKEN_REGEX = /<MASK:(\d+)>/g

function makeMaskToken(len: number): string {
  return `${MASK_TOKEN_PREFIX}${len}${MASK_TOKEN_SUFFIX}`
}

// =========================
// 2) SEPARATORS (区切り文字 → スペース化)
// =========================

const SEPARATOR_REGEX =
  /[ \u3000\-‐‒–—―−・･·•\/／\\＼|｜¦,，、.．。:：;；~〜～+＋=＝#＃@＠&＆!！‼？]+/g

const SINGLE_UNDERSCORE_REGEX = /_/g

// =========================
// 3) DECORATIONS (装飾記号 → 削除)
// =========================

const DECORATION_REGEX =
  /[()[\]{}<>（）［］｛｝＜＞「」『』【】〔〕〈〉《》〖〗"""'''＂＇※★☆♪♯♭◆◇■□]/g

// =========================
// 4) ひらがな → カタカナ変換
// =========================

function hiraganaToKatakana(str: string): string {
  return str.replace(/[\u3041-\u3096]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  )
}

// =========================
// 5) 正規化メイン関数
// =========================

/**
 * 文字列を正規化する
 * 処理順序:
 * 1. 伏せ字の保護（マスクトークン化）
 * 2. NFKC正規化
 * 3. 小文字化
 * 4. ひらがな→カタカナ
 * 5. 区切り文字→スペース
 * 6. 装飾記号削除
 * 7. 連続空白→1つ
 * 8. 空白全削除
 * 9. マスクトークン復元（オプション）
 */
export function normalize(text: string, options?: { keepMaskTokens?: boolean }): string {
  let result = text

  // 1. 伏せ字の保護（連続アンダースコア・連続x/X）
  result = result.replace(MASK_RUN_PATTERNS.underscoreRun, (match) =>
    makeMaskToken(match.length)
  )
  result = result.replace(MASK_RUN_PATTERNS.xRun, (match) =>
    makeMaskToken(match.length)
  )

  // 単一マスク文字をトークン化
  for (const maskChar of MASK_SINGLE_CHARS) {
    result = result.split(maskChar).join(makeMaskToken(1))
  }

  // 2. NFKC正規化
  result = result.normalize('NFKC')

  // 3. 小文字化
  result = result.toLowerCase()

  // 4. ひらがな→カタカナ
  result = hiraganaToKatakana(result)

  // 5. 区切り文字→スペース
  result = result.replace(SEPARATOR_REGEX, ' ')
  result = result.replace(SINGLE_UNDERSCORE_REGEX, ' ')

  // 6. 装飾記号削除
  result = result.replace(DECORATION_REGEX, '')

  // 7. 連続空白→1つ
  result = result.replace(/\s+/g, ' ')

  // 8. 空白全削除
  result = result.replace(/\s/g, '')

  // 9. マスクトークン復元（デフォルトでは復元しない）
  if (!options?.keepMaskTokens) {
    // マスクトークンはそのまま保持（マッチング時に使用）
  }

  return result
}

/**
 * ターゲット文字列を生成する
 * targetText = parentFolderName + " " + fileBaseName
 */
export function createTargetText(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/')
  const fileName = parts.pop() || ''
  const parentFolder = parts.pop() || ''

  // 拡張子を除去
  const fileBaseName = fileName.replace(/\.[^.]+$/, '')

  if (parentFolder) {
    return `${parentFolder} ${fileBaseName}`
  }
  return fileBaseName
}

/**
 * 伏せ字を正規表現パターンに変換
 * k = 許容量（デフォルト2）
 */
export function maskToRegex(normalizedText: string, k: number = 2): RegExp | null {
  if (!MASK_TOKEN_REGEX.test(normalizedText)) {
    return null
  }

  // マスクトークンを正規表現パターンに変換
  const pattern = normalizedText.replace(MASK_TOKEN_REGEX, (_match, len) => {
    const maskLen = parseInt(len, 10)
    // 各マスク文字に対して 0〜k 文字をマッチ
    return `.{0,${maskLen * k}}`
  })

  try {
    return new RegExp(`^${pattern}$`, 'i')
  } catch {
    return null
  }
}

/**
 * 検索キーに伏せ字が含まれるかチェック
 */
export function hasMask(normalizedText: string): boolean {
  return MASK_TOKEN_REGEX.test(normalizedText)
}
