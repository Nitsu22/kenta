# Wedding Invitation Clone

`special-invitation.com` の対象ページをベースに、以下構成で再現した静的サイトです。

- フロント: HTML + CSS + JavaScript
- 公開先: Netlify
- 回答保存: Supabase (`invitation_responses` テーブル)

## ディレクトリ構成

- `index.html` 画面本体
- `styles/main.css` デザイン
- `scripts/config.js` Supabase接続設定
- `scripts/supabase-client.js` Supabaseクライアント初期化
- `scripts/main.js` UI制御 / バリデーション / 保存処理
- `supabase/schema.sql` テーブル定義とRLS
- `netlify.toml` Netlify設定

## セットアップ手順

1. Supabaseでテーブルを作成
   - SupabaseのSQL Editorで `supabase/schema.sql` を実行。
2. Supabase接続情報を設定
   - `scripts/config.js` の以下2項目を更新。
   - `supabaseUrl`
   - `supabaseAnonKey`
3. ローカル確認
   - `cd /Users/daichi/Work/kenta`
   - `python3 -m http.server 8080`
   - `http://localhost:8080` を開いて送信確認。
4. Netlifyへデプロイ
   - このフォルダをNetlifyに接続（Git連携 or 手動アップロード）。
   - `netlify.toml` により `/` 配下は `index.html` にルーティング。

## 補足

- 郵便番号入力時、`zipcloud` APIで住所自動入力を試行します（失敗時は手入力）。
- 「情報を保存」をONにするとブラウザ `localStorage` に下書きを保存します。
- ボット対策が必要な場合は Cloudflare Turnstile か reCAPTCHA を追加してください。

## LINE BOT運用コマンド

このリポジトリを操作するBOTは、以下の2コマンドで運用します。

- `変更`
  - `変更 <要望>` で、ホームページ本体（`index.html` / `styles/main.css` / `scripts/main.js` / `assets/`）を編集します。
  - 編集後は `git add -A` -> `git commit` -> `git push origin main` まで自動実行します。
- `相談`
  - 返答のみ。編集・pushは行いません。

詳細ルールは `AGENTS.md` を参照してください。
