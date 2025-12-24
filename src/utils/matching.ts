/**
 * マッチングエンジン
 * SPEC.md に準拠したファイル名マッチング処理
 */

import type { WordList, WordListEntry } from '../types'
import { normalize, createTargetText, maskToRegex, hasMask } from './normalize'

// =========================
// 型定義
// =========================

export type MatchRule = 'A' | 'B' | 'C' | 'D'

export interface MatchItem {
  entityId: string
  type: 'work' | 'character'
  canonical: string
  matchedKey: string
  matchedKeyNormalized: string
  rule: MatchRule
  score: number
}

export interface MatchResult {
  filePath: string
  targetText: string
  targetNormalized: string
  confirmed: MatchItem[]
  candidates: MatchItem[]
  matched: boolean
}

export interface MatchingConfig {
  partialMatchMinLen: number      // ルールB確定条件（デフォルト4）
  wildcardMatchMinLen: number     // ルールC確定条件（デフォルト6）
  wildcardToleranceK: number      // 伏せ字許容量（デフォルト2）
  candidateMaxCount: number       // 候補最大数（デフォルト5）
  candidateMinScore: number       // 候補最小スコア（デフォルト0.80）
  strongCandidateScore: number    // 強候補スコア（デフォルト0.92）
}

const DEFAULT_CONFIG: MatchingConfig = {
  partialMatchMinLen: 4,
  wildcardMatchMinLen: 6,
  wildcardToleranceK: 2,
  candidateMaxCount: 5,
  candidateMinScore: 0.80,
  strongCandidateScore: 0.92,
}

// =========================
// n-gram 類似度
// =========================

function getNgrams(str: string, n: number = 2): Set<string> {
  const ngrams = new Set<string>()
  for (let i = 0; i <= str.length - n; i++) {
    ngrams.add(str.slice(i, i + n))
  }
  return ngrams
}

function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1
  if (set1.size === 0 || set2.size === 0) return 0

  let intersection = 0
  for (const item of set1) {
    if (set2.has(item)) intersection++
  }

  const union = set1.size + set2.size - intersection
  return union === 0 ? 0 : intersection / union
}

function calculateScore(targetNormalized: string, keyNormalized: string): number {
  const ngramSimilarity = jaccardSimilarity(
    getNgrams(targetNormalized),
    getNgrams(keyNormalized)
  )
  const lengthBonus = Math.min(1.0, keyNormalized.length / 12)
  return 0.7 * ngramSimilarity + 0.3 * lengthBonus
}

// =========================
// マッチングルール
// =========================

function ruleA(targetNormalized: string, entry: WordListEntry): MatchItem | null {
  // 完全一致
  for (const key of entry.searchKeysNormalized) {
    if (targetNormalized === key) {
      return {
        entityId: `${entry.type}:${entry.canonical}`,
        type: entry.type,
        canonical: entry.canonical,
        matchedKey: entry.canonical,
        matchedKeyNormalized: key,
        rule: 'A',
        score: 1.0,
      }
    }
  }
  return null
}

function ruleB(
  targetNormalized: string,
  entry: WordListEntry,
  config: MatchingConfig
): MatchItem | null {
  // 部分一致
  for (const key of entry.searchKeysNormalized) {
    if (key.length >= config.partialMatchMinLen && targetNormalized.includes(key)) {
      return {
        entityId: `${entry.type}:${entry.canonical}`,
        type: entry.type,
        canonical: entry.canonical,
        matchedKey: entry.canonical,
        matchedKeyNormalized: key,
        rule: 'B',
        score: calculateScore(targetNormalized, key),
      }
    }
  }
  return null
}

function ruleC(
  targetNormalized: string,
  entry: WordListEntry,
  config: MatchingConfig
): MatchItem | null {
  // 伏せ字ワイルドカード一致
  if (!hasMask(targetNormalized)) return null

  const regex = maskToRegex(targetNormalized, config.wildcardToleranceK)
  if (!regex) return null

  for (const key of entry.searchKeysNormalized) {
    if (key.length >= config.wildcardMatchMinLen && regex.test(key)) {
      return {
        entityId: `${entry.type}:${entry.canonical}`,
        type: entry.type,
        canonical: entry.canonical,
        matchedKey: entry.canonical,
        matchedKeyNormalized: key,
        rule: 'C',
        score: calculateScore(targetNormalized.replace(/<MASK:\d+>/g, ''), key),
      }
    }
  }
  return null
}

function ruleD(
  targetNormalized: string,
  entry: WordListEntry,
  config: MatchingConfig
): MatchItem | null {
  // あいまい一致（候補のみ）
  let bestScore = 0
  let bestKey = ''

  for (const key of entry.searchKeysNormalized) {
    const score = calculateScore(targetNormalized, key)
    if (score >= config.candidateMinScore && score > bestScore) {
      bestScore = score
      bestKey = key
    }
  }

  if (bestScore >= config.candidateMinScore) {
    return {
      entityId: `${entry.type}:${entry.canonical}`,
      type: entry.type,
      canonical: entry.canonical,
      matchedKey: entry.canonical,
      matchedKeyNormalized: bestKey,
      rule: 'D',
      score: bestScore,
    }
  }

  return null
}

// =========================
// メイン関数
// =========================

/**
 * ファイルと単語リストをマッチング
 */
export function matchFile(
  filePath: string,
  wordList: WordList,
  config: Partial<MatchingConfig> = {}
): MatchResult {
  const cfg = { ...DEFAULT_CONFIG, ...config }
  const targetText = createTargetText(filePath)
  const targetNormalized = normalize(targetText, { keepMaskTokens: true })

  const confirmed: MatchItem[] = []
  const candidates: MatchItem[] = []

  for (const entry of wordList.entries) {
    // ルールA: 完全一致
    const matchA = ruleA(targetNormalized, entry)
    if (matchA) {
      confirmed.push(matchA)
      continue
    }

    // ルールB: 部分一致
    const matchB = ruleB(targetNormalized, entry, cfg)
    if (matchB) {
      // 確定条件: type内一意かチェック（簡略化: 常に確定扱い）
      confirmed.push(matchB)
      continue
    }

    // ルールC: 伏せ字ワイルドカード
    const matchC = ruleC(targetNormalized, entry, cfg)
    if (matchC) {
      if (matchC.score >= cfg.strongCandidateScore) {
        confirmed.push(matchC)
      } else {
        candidates.push(matchC)
      }
      continue
    }

    // ルールD: あいまい一致
    const matchD = ruleD(targetNormalized, entry, cfg)
    if (matchD) {
      candidates.push(matchD)
    }
  }

  // 候補をスコア降順でソートし、上位N件に絞る
  candidates.sort((a, b) => b.score - a.score)
  const topCandidates = candidates.slice(0, cfg.candidateMaxCount)

  return {
    filePath,
    targetText,
    targetNormalized,
    confirmed,
    candidates: topCandidates,
    matched: confirmed.length > 0,
  }
}

/**
 * 複数ファイルを一括マッチング
 */
export function matchFiles(
  filePaths: string[],
  wordList: WordList,
  config: Partial<MatchingConfig> = {}
): MatchResult[] {
  return filePaths.map((filePath) => matchFile(filePath, wordList, config))
}

/**
 * ファイルがWordListにマッチするかどうかを簡易判定
 */
export function isFileMatching(filePath: string, wordList: WordList): boolean {
  const result = matchFile(filePath, wordList)
  return result.matched
}

/**
 * 複数のWordListの中からマッチするものを返す
 */
export function findMatchingWordLists(
  filePath: string,
  wordLists: Record<string, WordList | null>
): string[] {
  const matchingKeys: string[] = []

  for (const [key, wordList] of Object.entries(wordLists)) {
    if (wordList && isFileMatching(filePath, wordList)) {
      matchingKeys.push(key)
    }
  }

  return matchingKeys
}
