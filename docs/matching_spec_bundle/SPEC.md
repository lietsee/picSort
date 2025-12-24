# 1. 概要

本仕様書は、**DBに登録された作品名・キャラ名**（正規名および別名）と、**ファイル名（および任意でフォルダ名）**を照合し、該当するDB項目と一致するファイルをリストアップする機能について、**UI/UXを除外した入力・処理・出力仕様**および **Tauri(React) 実装を前提としたデータ構造**を定義する。

---

# 2. 用語定義

- **項目（Entity）**: DBに登録される単位。`work`（作品）または `character`（キャラ）を指す。
- **正規名（canonical）**: 項目の正式名称（例: `ゼンレスゾーンゼロ`）。
- **別名（alias）**: 略称・通称・英字表記等（例: `ゼンゼロ`, `ZZZ`）。
- **ターゲット文字列（targetText）**: ファイル側から抽出し、照合に用いる文字列。
- **正規化（normalize）**: 文字列の揺れを吸収する統一変換処理。
- **伏せ字（mask）**: `〇`, `◯`, `*`, `?`, `_` 等で一部が隠されている表記。
- **マッチ（match）**: ターゲット文字列に対し、項目がヒットすること。
- **確定（confirmed）**: 自動で紐付け確定可能なマッチ。
- **候補（candidate）**: 人手確認が必要なマッチ（スコア付き）。

---

# 3. スコープ

## 3.1 対象

- 入力: 項目DB（作品・キャラ）および対象ファイル一覧（パス）
- 出力: ファイルごとのマッチ結果（確定/候補/非一致）

## 3.2 非対象

- UI/UX、操作画面、ユーザー編集フロー
- ファイル移動、リネーム、タグ書き込み等の副作用
- 外部API連携（タイトル自動取得等）

---

# 4. 入力仕様

## 4.1 DB入力（項目データ）

DBは以下の情報を提供する。

- `id`（一意識別子）
- `type`（`work` | `character`）
- `canonical`（正規名）
- `aliases`（別名配列、空可）
- `priority`（衝突解決用優先度、整数、デフォルト0）
- `status`（`active` | `disabled`）
- `workId`（キャラの場合に紐づく作品ID、任意）

## 4.2 ファイル入力（対象ファイル一覧）

対象は以下を入力とする。

- `filePath`（絶対パス or ルートからの相対パス）
- `fileName`（パスから抽出可能。拡張子除外したベース名を使用する）

## 4.3 ターゲット文字列（targetText）の構成

照合に用いる `targetText` は、以下の連結で生成する。

- `targetText = parentFolderName + " " + fileBaseName`

定義:
- `parentFolderName`: 親フォルダ名（1階層のみ）
- `fileBaseName`: 拡張子を除いたファイル名

例:
- `...\ゼンレスゾーンゼロ\001_戦闘.mp4`
  - `targetText = "ゼンレスゾーンゼロ 001_戦闘"`

注:
- 親フォルダが存在しない場合（ルート直下）は `fileBaseName` のみとする。

---

# 5. 正規化仕様（normalize）

DB側・ファイル側の双方に**同一の正規化処理**を適用する。

## 5.1 正規化の処理順（固定）

1. Unicode正規化: NFKC
2. 英字の小文字化
3. かなの統一: ひらがな→カタカナ（カタカナ寄せ）
4. 区切り文字のスペース化
5. 装飾記号の削除
6. 連続空白の1つ化
7. 最終的に空白を全削除（スペース無しの連結文字列にする）
8. 伏せ字記号の保持（削除しない）

## 5.2 区切り文字（スペース化対象）

以下をスペースに置換する（例示、実装ではテーブル化すること）。

- `_` `-` `—` `+` `.` `・` `/` `\` `|` `:` `;` `,`

## 5.3 装飾記号（削除対象）

以下を削除する（例示、実装ではテーブル化すること）。

- `[` `]` `(` `)` `{` `}` `「` `」` `『` `』` `【` `】` `<` `>`

## 5.4 伏せ字（mask）記号（保持対象）

正規化後も削除せず、後続のワイルドカード処理で利用する。

- `〇` `◯` `*` `?` `_`

注:
- `_` は区切り文字としてスペース化対象にも含まれるが、**伏せ字として使われるケースがあるため**、区切り文字処理より前に判定し、伏せ字用途の場合は保持する（実装では「連続する `_` を伏せ字」とみなす等のルールを定義してよい）。

---

# 6. マッチング仕様

マッチングは必ず以下の順序で実施する（優先順位固定）。

- ルールA: 完全一致
- ルールB: 部分一致（条件付き確定）
- ルールC: 伏せ字ワイルドカード一致（条件付き確定）
- ルールD: あいまい一致（候補のみ）

## 6.1 事前計算（DB側インデックス）

各項目について次を事前生成する。

- `canonicalNormalized`
- `aliasesNormalized[]`（空可）
- `searchKeysNormalized[] = [canonicalNormalized, ...aliasesNormalized]`（重複除去）

## 6.2 ルールA: 完全一致（確定）

条件:
- `targetNormalized == searchKeyNormalized`

出力:
- `confirmed` に登録する。

## 6.3 ルールB: 部分一致（条件付き確定）

条件:
- `targetNormalized` が `searchKeyNormalized` を **含む**

確定条件（両方満たす場合のみ `confirmed`）:
- `searchKeyNormalized.length >= 4`
- 同一 `type` 内で一意（同条件でヒットする項目が1つ）

上記を満たさない場合:
- `candidate` とする。

## 6.4 ルールC: 伏せ字ワイルドカード一致

適用条件:
- `targetNormalized` に伏せ字記号（`〇◯*?` 等）が含まれる場合のみ。

処理:
- 伏せ字記号を正規表現のワイルドカードに変換して照合する。
- 変換ルール:
  - 伏せ字1文字 → `.{0,k}`
- `k`（許容量）:
  - デフォルト `k = 2`

照合対象:
- `searchKeyNormalized`（canonical/aliasの双方）

確定条件（両方満たす場合のみ `confirmed`）:
- `searchKeyNormalized.length >= 6`
- スコア（7章参照）が閾値以上

それ以外は候補。

## 6.5 ルールD: あいまい一致（候補のみ）

目的:
- 辞書未登録の略称・誤字・軽微な揺れの拾い上げ。

条件:
- ルールA〜Cで `confirmed` が得られなかった、または `candidate` を補強したい場合。

出力:
- **候補のみ**（自動で確定しない）。
- 上位 `N=5` 件まで。

除外条件:
- スコア `< 0.80` は候補に含めない。

---

# 7. スコアリング仕様（候補の並び順）

候補には `score`（0.0〜1.0）を付与する。

## 7.1 n-gram 類似度

- `ngram` は 2-gram または 3-gram（実装選択可、デフォルト2-gram）
- `ngramSimilarity` は Jaccard 係数等の集合類似度を用いる。

## 7.2 長さボーナス

- `lengthBonus = min(1.0, matchLength / 12)`

## 7.3 合成スコア

- `score = 0.7 * ngramSimilarity + 0.3 * lengthBonus`

## 7.4 閾値

- `score >= 0.92`: 強候補
- `0.80 <= score < 0.92`: 通常候補
- `< 0.80`: 候補から除外

---

# 8. 衝突（複数ヒット）処理仕様

## 8.1 作品（type=work）が複数確定した場合

原則:
- 作品は1ファイルにつき1件に絞る。

ルール:
- `searchKeyNormalized.length` が最大のものを `confirmed` とする（最長一致優先）。
- その他は `candidate` に落とす。

同長の場合:
- `priority` の高いものを優先する。
- それも同じなら `id` の辞書順などで安定化させる。

## 8.2 キャラ（type=character）が複数確定した場合

原則:
- 複数確定を許容する（タグ方式）。

ただし任意で次の制約を設けてよい:
- `workId` が指定されているキャラ同士で、矛盾する作品（異なるworkId）が同時確定した場合は、`priority` により絞る。

## 8.3 作品とキャラが同時確定した場合

- 両方確定を許容する。

---

# 9. 出力仕様

## 9.1 1ファイルあたりの出力

- `filePath`: string
- `targetText`: string（生）
- `targetNormalized`: string
- `confirmed`: MatchItem[]
- `candidates`: MatchItem[]（スコア降順、最大5）
- `unmatched`: boolean（confirmedが空ならtrue）

## 9.2 MatchItem

- `entityId`: string
- `type`: `work` | `character`
- `canonical`: string
- `matchedKey`: string（canonical または alias の原文）
- `matchedKeyNormalized`: string
- `rule`: `A` | `B` | `C` | `D`
- `score`: number（候補は必須、確定は任意/0でも可）
- `debug`: object（任意。matchLength等の内部値を含めてよい）

---

# 10. データ構造（Tauri(React)想定）

本章はアプリ内部で取り回すための **TypeScript データ構造**を定義する。
永続化手段（SQLite/JSON/IndexedDB等）は本仕様では規定しない。

## 10.1 Entity（項目）

```ts
export type EntityType = "work" | "character";
export type EntityStatus = "active" | "disabled";

export interface Entity {
  id: string;
  type: EntityType;
  canonical: string;
  aliases: string[];       // 省略可だが空配列推奨
  priority: number;        // default 0
  status: EntityStatus;    // default "active"
  workId?: string;         // character の場合に使用（任意）
}
```

## 10.2 正規化済みインデックス
```ts
export interface EntityIndex {
  entityId: string;
  type: EntityType;
  canonical: string;
  aliases: string[];
  priority: number;
  status: EntityStatus;
  workId?: string;

  canonicalNormalized: string;
  aliasesNormalized: string[];
  searchKeysNormalized: string[]; // canonicalNormalized + aliasesNormalized（重複除去）
  // 逆引き用（任意）:
  // keyToRaw: Record<string, string>; // normalizedKey -> rawKey
}
```

## 10.3 FileInput（対象ファイル）
```ts
export interface FileInput {
  filePath: string;      // 絶対 or 相対（呼び出し側で統一）
  fileBaseName: string;  // 拡張子除外済み
  parentFolderName?: string;
}
```

## 10.4 MatchResult（ファイルごとの結果）
```ts
export type MatchRule = "A" | "B" | "C" | "D";

export interface MatchItem {
  entityId: string;
  type: EntityType;
  canonical: string;

  matchedKey: string;              // raw canonical or raw alias
  matchedKeyNormalized: string;

  rule: MatchRule;
  score?: number;                  // candidates は必須（確定は任意）
  debug?: Record<string, unknown>; // 任意
}

export interface MatchResult {
  filePath: string;

  targetText: string;
  targetNormalized: string;

  confirmed: MatchItem[];
  candidates: MatchItem[]; // score desc, max 5
  unmatched: boolean;
}
```

## 10.5 設定（パラメータ）
```ts
export interface MatchingConfig {
  includeParentFolderName: boolean; // default true
  wildcardToleranceK: number;       // default 2

  partialMatchMinLen: number;       // default 4（rule B）
  wildcardMatchMinLen: number;      // default 6（rule C）

  candidateMaxCount: number;        // default 5
  candidateMinScore: number;        // default 0.80
  strongCandidateScore: number;     // default 0.92

  ngramSize: 2 | 3;                 // default 2
}
```

# 11. 決定済みデフォルト値

targetText: parentFolderName + " " + fileBaseName（親フォルダ1階層を含める）
正規化: NFKC / 英字小文字 / カタカナ寄せ / 区切り→空白 / 装飾削除 / 空白全削除 / 伏せ字保持
伏せ字許容量 k = 2
rule B 確定条件: minLen=4 かつ type内一意
rule C 確定条件: minLen=6 かつ スコア閾値以上
あいまい一致は候補のみ、最大5件、0.80未満は除外
作品が複数確定した場合: 最長一致優先（同長はpriority）