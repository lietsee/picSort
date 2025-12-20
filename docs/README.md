# 画像仕分けアプリ ドキュメント

フォルダ内の画像をキーボード操作で素早く仕分けるデスクトップアプリケーションの設計ドキュメントです。

## ドキュメント一覧

| ドキュメント | 概要 |
|------------|------|
| [spec.md](./spec.md) | 概要・技術スタック・非機能要件 |
| [functional-requirements.md](./functional-requirements.md) | 機能要件詳細・状態遷移 |
| [ui-ux-design.md](./ui-ux-design.md) | UI/UX設計・レイアウト・インタラクション |
| [architecture.md](./architecture.md) | 技術アーキテクチャ・システム構成 |
| [error-handling.md](./error-handling.md) | エラー処理・例外仕様・ログ |
| [testing.md](./testing.md) | テスト戦略・テストケース |
| [extensions.md](./extensions.md) | 拡張機能詳細仕様 |

## プロジェクト概要

### コンセプト
大量の画像ファイルを効率的に分類するためのデスクトップアプリケーション。キーボードのみで操作可能なシンプルなUIにより、高速な仕分け作業を実現する。

### 主要機能
- 分別元フォルダから画像を1枚ずつ表示
- 数字キー（1〜5）で指定フォルダへ即座に移動
- 先読みによるスムーズな画像切り替え
- ダーク/ライトテーマ対応

### 技術スタック
- **デスクトップフレームワーク**: Tauri (Rust backend + Web frontend)
- **フロントエンド**: React + TypeScript
- **状態管理**: React Context
- **対象OS**: Windows 10以降 / macOS 12以降

## 読み方ガイド

1. **初めて読む方**: [spec.md](./spec.md) → [functional-requirements.md](./functional-requirements.md) の順で概要を把握
2. **UI設計を確認したい方**: [ui-ux-design.md](./ui-ux-design.md)
3. **実装を始める方**: [architecture.md](./architecture.md) でシステム構成を理解
4. **テストを書く方**: [testing.md](./testing.md) でテスト方針を確認
5. **将来の拡張を検討する方**: [extensions.md](./extensions.md)

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2025-12-20 | 初版作成 |
