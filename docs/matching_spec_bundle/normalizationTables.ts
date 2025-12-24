/**
 * Normalization tables (v0.2)
 * - Use NFKC + lowercasing + hira->kata outside of this table section.
 * - IMPORTANT: mask-detection/protection should run BEFORE separator->space and decorations removal.
 *
 * Notes:
 * - "_" handling: single "_" => separator, "__" (2+) => mask (handled by MASK pattern first).
 * - "x/X" handling: "xx" (2+) => mask (optional; enabled by default here).
 */

// =========================
// 1) MASK (keep / protect)
// =========================

/**
 * Single-character mask symbols that should be treated as "mask length = 1"
 * if they appear literally in the text.
 *
 * Include circle variants often used as redaction.
 */
export const MASK_SINGLE_CHARS = [
  "〇", // U+3007
  "◯", // U+25EF
  "○", // U+25CB
  "●", // U+25CF
  "*", // U+002A
  "?", // U+003F
] as const;

/**
 * Mask runs:
 * - "__" or longer => mask run (underscore redaction)
 * - "xx"/"XX"/mixed 2+ => mask run (optional but enabled here)
 *
 * These should be detected and replaced with a protected token BEFORE other normalization.
 */
export const MASK_RUN_PATTERNS = {
  underscoreRun: /_{2,}/g,
  // If you do NOT want x/X to become mask, set this to null and skip it.
  xRun: /[xX]{2,}/g,
} as const;

/**
 * Token format for protected masks (recommended).
 * Keep it simple and unambiguous.
 */
export const MASK_TOKEN_PREFIX = "<MASK:";
export const MASK_TOKEN_SUFFIX = ">";

/** Utility (spec-level) to build a token. */
export const makeMaskToken = (len: number) => `${MASK_TOKEN_PREFIX}${len}${MASK_TOKEN_SUFFIX}`;

/**
 * Regex to find tokens later (for restore / wildcard transform).
 */
export const MASK_TOKEN_REGEX = /<MASK:(\d+)>/g;


// =========================
// 2) SEPARATORS (to space)
// =========================

/**
 * Characters to be converted to SPACE (then spaces are collapsed, then removed at end).
 *
 * IMPORTANT: "_" is NOT included here because "_" is special:
 * - "__" is handled as mask run in MASK_RUN_PATTERNS.underscoreRun
 * - single "_" may be treated as separator by SEPARATOR_REGEX (below).
 */
export const SEPARATOR_CHARS_TO_SPACE = [
  // whitespace
  " ", "　",

  // hyphen/dash/minus variants
  "-", "‐", "-", "‒", "–", "—", "―", "−",

  // middle dots / bullets used as separators
  "・", "･", "·", "•",

  // slashes and backslashes
  "/", "／", "\\", "＼",

  // pipes
  "|", "｜", "¦",

  // commas / Japanese commas
  ",", "，", "、",

  // periods / Japanese periods
  ".", "．", "。",

  // colon / semicolon
  ":", "：", ";", "；",

  // tilde / wave dash
  "~", "〜", "～",

  // connectors
  "+", "＋", "=", "＝",

  // tag-like separators
  "#", "＃",
  "@", "＠",

  // ampersand as separator (decision: treat as separator)
  "&", "＆",

  // exclamation / question (question mark is also mask-single; mask protection should run first)
  "!", "！", "‼", "？",
] as const;

/**
 * Additionally treat a single "_" as separator.
 * This regex is applied AFTER mask-run protection so remaining "_" are single underscores.
 */
export const SINGLE_UNDERSCORE_SEPARATOR_REGEX = /_/g;

/**
 * A compiled regex alternative for faster replacement:
 * - Uses a character class. Escapes are included as needed.
 * - Includes backslash and some regex metacharacters.
 *
 * NOTE: Not every char above can safely be represented in a single [] without escaping.
 * This regex is a practical subset matching the list above (except "_" which is separate).
 */
export const SEPARATOR_REGEX = /[ \u3000\-,‐-‒–—―−・･·•\/／\\＼|｜¦,，、\.．。:：;；~〜～\+＋=＝#＃@＠&＆!！‼？]+/g;


// =========================
// 3) DECORATIONS (remove)
// =========================

/**
 * Decorative characters to remove entirely.
 * IMPORTANT: "○" "●" are also mask candidates, so mask protection should run first.
 */
export const DECORATION_CHARS_TO_REMOVE = [
  // ASCII brackets
  "(", ")", "[", "]", "{", "}", "<", ">",

  // Full-width brackets
  "（", "）", "［", "］", "｛", "｝", "＜", "＞",

  // Japanese quote/bracket styles
  "「", "」", "『", "』", "【", "】", "〔", "〕", "〈", "〉", "《", "》", "〖", "〗",

  // Quotes
  "\"", "“", "”", "'", "‘", "’", "＂", "＇",

  // Misc decorations
  "※", "★", "☆", "♪", "♯", "♭", "◆", "◇", "■", "□",
] as const;

/**
 * Compiled regex for removal (character class).
 * Note: includes both half/full-width bracket & quote variants.
 */
export const DECORATION_REGEX =
  /[()\[\]{}<>（）」『』【】〔〕〈〉《》〖〗"“”'‘’＂＇※★☆♪♯♭◆◇■□]/g;


// =========================
// 4) SPACE handling
// =========================

export const MULTISPACE_REGEX = /\s+/g;


// =========================
// 5) Optional: circle/black-circle as decoration (if NOT treated as mask)
// =========================

/**
 * If you decide later that "○" "●" should not be treated as mask,
 * you can move them here and remove them from MASK_SINGLE_CHARS.
 *
 * Current decision (v0.2): they ARE mask-capable, so they stay in MASK_SINGLE_CHARS.
 */
export const OPTIONAL_DECORATION_CIRCLES = ["○", "●"] as const;
