# quiz-7flips

スアールのクイズイベントで使用する進行・ルール表示アプリです。Flip 7、コーナー説明、告知スライド、休憩表示、Spotifyイントロクイズなどをまとめています。

## 公開サイト

https://tkoshi-code.github.io/quiz-7flips/

`master` ブランチへpushすると、GitHub Actionsが自動的にビルドしてGitHub Pagesへ公開します。

## ローカル起動

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

ブラウザで `http://127.0.0.1:5173/` を開きます。

## ビルド確認

```sh
npm run build
```

## Spotifyイントロクイズ

トップ画面下部の「ツール」からQM操作画面を開きます。

- Spotifyの曲共有URLと、会場に表示する答えを登録
- 3～30秒の指定時間だけ曲の先頭から再生して自動停止
- 未出題曲からランダムに次の曲を選択
- QM画面とは別の会場表示ウインドウへ、カウントダウンと答えを送信
- 登録曲をJSONでバックアップ・復元

Spotifyプレーヤーには曲名が表示されるため、QM操作画面は会場のスクリーンには映さず、「会場表示を開く」で開いたウインドウを使用してください。ブラウザの自動再生制限により音が出ない場合は、Spotifyプレーヤー内の再生ボタンを一度押します。

登録曲と再生時間は `piyopiyo_spotify_intro_v1` としてブラウザのlocalStorageに保存されます。Spotifyのアカウント情報やOAuthトークンは保存しません。再生時にはSpotifyの公式埋め込みプレーヤーへ通信します。

店舗イベントでの利用に必要な楽曲の権利とSpotifyの利用条件は、運営側で事前に確認してください。

### 初級スターターJSON

[public/data/spotify-intro-starter.json](public/data/spotify-intro-starter.json)を、答えやすいイントロ曲の共有カタログとして管理します。QM画面の「JSONから追加」を押すと、新しく追加された曲だけが端末へ追加されます。登録済みの曲や利用者が編集した答えは削除・上書きしません。

各曲にはSpotify URLのほか、`title`、`artist`、`difficulty`、`category`、`decade`、`recommendedSeconds`、`note`を持たせています。今後は同じ形式で曲を追加し、`catalogVersion`を更新します。
