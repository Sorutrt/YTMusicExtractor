# YT Music Song Extractor

YouTube Music のアルバム/EP/プレイリストページから曲名一覧を抽出して、番号付きテキストとしてコピーするブラウザ拡張です。

## 機能

- 曲名を `1. 曲名` 形式で一覧化
- 抽出結果をワンクリックでクリップボードにコピー
- 同名曲の重複を除外
- DOM 差分に備えて複数セレクタで抽出（行ベース + `watch?v=` リンク fallback）

## ファイル構成

- `manifest.json`: 拡張定義（MV3）
- `popup.html`: ポップアップ UI
- `popupState.js`: 対象 URL 判定とポップアップ状態制御
- `popup.js`: ボタン処理、タブへの抽出処理注入
- `extractor.js`: 曲名抽出ロジック（UI から分離）
- `popupState.spec.js`: URL 判定の最小テスト
- `extractor.spec.js`: 抽出ロジックの最小テスト

## インストール（開発版）

### Chrome / Edge

1. このフォルダをローカルに置く
2. `chrome://extensions/`（Edge は `edge://extensions/`）を開く
3. 「デベロッパーモード」を ON
4. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択

### Firefox

1. `about:debugging#/runtime/this-firefox` を開く
2. 「一時的なアドオンを読み込む」から `manifest.json` を選択

## 使い方

1. YouTube Music でアルバム/EP/プレイリストページを開く
2. 拡張のポップアップを開く
3. `曲名を抽出する` をクリック
4. 結果が表示されたら `結果をコピー` をクリック

抽出件数はポップアップ下部のステータスメッセージに表示されます。

## 開発

Node は `mise` 経由で実行します。

### テスト実行

```powershell
mise exec node@24 -- node manifest.spec.js
mise exec node@24 -- node popupState.spec.js
mise exec node@24 -- node extractor.spec.js
```

### 構文チェック

```powershell
mise exec node@24 -- node --check popup.js
mise exec node@24 -- node --check popupState.js
mise exec node@24 -- node --check extractor.js
```

## リリース（自動）

`v*` 形式の Git タグを push すると、GitHub Actions が自動で以下を実行します。

- テスト実行
- 拡張ファイルを ZIP 化
- ZIP を添付した GitHub Release の作成

例:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

## トラブルシュート

- `曲が見つかりませんでした` と出る  
  ページを少しスクロールして再実行してください。遅延描画で行要素が未生成の場合があります。

- `YouTube Musicのページで実行してください` と出る  
  `https://music.youtube.com/` 配下のタブで実行してください。

- 抽出結果が空になるページがある  
  YouTube Music 側の DOM 変更が原因の可能性があります。該当ページ URL と HTML 構造差分を元に `extractor.js` の候補セレクタを更新してください。
