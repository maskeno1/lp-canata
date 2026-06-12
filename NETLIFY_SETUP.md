# Netlify setup

管理画面から代表者写真を全訪問者向けに公開するには、Netlifyで環境変数を設定します。

1. Netlifyで対象プロジェクトを開く
2. `Project configuration` → `Environment variables` を開く
3. `Add a variable` を押す
4. Key に `ADMIN_UPLOAD_PASSWORD` を入力
5. Value に推測されにくい長いアップロードキーを入力
6. 保存後、最新デプロイを再実行

写真を保存するときは、管理画面の「アップロードキー」に同じ値を入力します。
