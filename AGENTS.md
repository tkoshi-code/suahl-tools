# 開発ガイド

## アプリの目的

クイズイベントのルール表示、会場進行、クイズ連動ゲームをスマートフォン・PCで提供するPWA。

## ファイル構成

- `src/App.vue`: 画面ルーティングとFlip 7設定
- `src/components/`: 各画面
- `src/components/SlotMillionaireView.vue`: カスタムスロットの画面・ロジック
- `src/data/corners.js`: ホームのコーナー定義
- `public/manifest.json`, `public/sw.js`: PWA・オフライン対応
- `README.md`, `SPEC.md`, `PRIVACY.md`: 利用・仕様・プライバシー文書

## データ保存方式

入力データは機能別のlocalStorageキーへ保存し、外部送信しない。カスタムスロットは `piyopiyo_custom_slot_v1`。フィールド追加は `value ??= defaultValue` で後方互換にし、既存データを削除・上書きする移行は禁止する。

## 変更時の必須ルール

- 利用者の未コミット変更を保護する。
- `APP_VERSION`、CHANGELOG先頭、`public/sw.js`のCACHEを同時更新する。
- 利用者向け変更はREADMEと必要なSPEC、収集情報変更はPRIVACYを更新する。
- スマートフォン幅、ビルド、Service Worker、バックアップ復元を確認する。

## 壊してはいけない業務仕様

- ホームの既存コーナー並び替えと保存。
- Flip 7の既存進行。
- Spotifyの登録曲を追加JSONで上書き・削除しないこと。
- カスタムスロットは2〜3チーム、10問の正解数に応じた一括スピン、低VP順のカードセットドラフト、端末内保存のみ。

## 動作確認方法

`npm ci` 後に `npm run build`。`npm run dev -- --host 0.0.0.0` で初回起動、主要操作、スマートフォン幅を確認する。PWAは `npm run preview` でService Worker登録とオフライン再読み込みを確認する。

## デプロイ方法

`master`へpushすると `.github/workflows/deploy-pages.yml` がビルドし、GitHub Pagesへ公開する。公開後にURLを開き、バージョンと主要機能を確認する。

## コミット規則

対象ファイルだけを明示的にステージする。コミットメッセージは日本語とし、末尾にバージョンを付ける（例: `スロットゲームを追加 (v1.01)`）。
