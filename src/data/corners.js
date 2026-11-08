export const TAG_CONFIG = {
  '個人戦': { color: '#1565c0', bg: 'rgba(21,101,192,0.2)' },
  'チーム戦': { color: '#2e7d32', bg: 'rgba(46,125,50,0.2)' },
  '団体戦':  { color: '#00695c', bg: 'rgba(0,105,92,0.2)' },
  '早押し':  { color: '#e65100', bg: 'rgba(230,81,0,0.2)' },
  'ボード':  { color: '#6a1b9a', bg: 'rgba(106,27,154,0.2)' },
  'わいわい':  { color: '#f57f17', bg: 'rgba(245,127,23,0.2)' },
  'スリリング': { color: '#c62828', bg: 'rgba(198,40,40,0.2)' },
}

export const PIYOPIYO_CORNERS = [
  {
    id: 'okaike',
    title: 'お会計クイズ',
    titleColor: '#e53935',
    icon: '🧾',
    tags: ['個人戦', '早押し', 'わいわい'],
    bullets: [
      '早押しクイズで正解した人からお会計！',
      'ボタンはエンドレスチャンス',
    ],
    sections: [
      {
        label: 'クイズ',
        items: [
          { text: '正解→勝ち抜け（ボタンの電源をオフに）でお会計へ', color: '#43a047' },
          { text: '誤答→その問題の解答権を失う', color: '#e53935' },
        ],
      },
      {
        label: '掛け声',
        items: [
          { text: '正解者が出たら「ナイスお会計！」とみんなで言おう！', color: '#cfd8dc' },
        ],
      },
    ],
  },
  {
    id: 'nom',
    title: 'n○m休クイズ',
    titleColor: '#1565c0',
    icon: '🔔',
    tags: ['個人戦', '早押し', 'スリリング'],
    bullets: [
      '個人戦の早押しバトル エンドレスチャンス',
    ],
    sections: [
      {
        label: '得点',
        items: [
          { text: '正解→1ポイント', color: '#43a047' },
          { text: '誤答→m問お休み（その問題の解答権を失う）', color: '#e53935' },
        ],
      },
      {
        label: '勝抜条件',
        items: [
          { text: 'nポイント到達で勝ち抜け！', color: '#e53935' },
          { text: '（nとmに入る数字は当日QMが決定！）', color: '#e53935' },
        ],
      },
      {
        label: 'コツ',
        items: [
          { text: '間違えても失格になることはないよ！', color: '#1565c0' },
          { text: '完全に分かる前に"見当がついたら押す"練習をしてみよう！', color: '#1565c0' },
        ],
      },
    ],
  },
  {
    id: 'board3',
    title: '3段階早押しボードクイズ',
    titleColor: '#6a1b9a',
    icon: '📋',
    tags: ['個人戦', '早押し', 'ボード', 'スリリング'],
    bullets: [
      'ボタンはシングルチャンス 解答は全てボードで 書いたら伏せる',
    ],
    sections: [
      {
        label: '得点',
        items: [
          { text: '①ランプが点いた人', color: '#cfd8dc', bold: true },
          { text: '　正解…+3ポイント　誤答…−2ポイント', color: '#cfd8dc', greenRed: true },
          { text: '②ランプが点いたタイミングで解答する人', color: '#cfd8dc', bold: true },
          { text: '　正解…+2ポイント　誤答…−1ポイント', color: '#cfd8dc', greenRed: true },
          { text: '③最後まで問題を聞いた人', color: '#cfd8dc', bold: true },
          { text: '　正解…+1ポイント　誤答…±0ポイント', color: '#cfd8dc', greenRed: true },
        ],
      },
      {
        label: 'アドバイス',
        items: [
          { text: '最後まで聞けばノーリスク！ 何か答えを書いてみよう！', color: '#1565c0' },
        ],
      },
    ],
  },
  {
    id: 'selfintro',
    title: '自己紹介クイズ',
    titleColor: '#e53935',
    icon: '🙋',
    tags: ['個人戦', '早押し', 'わいわい'],
    bullets: [
      '早押しクイズで正解した人から自己紹介！',
      'ボタンはエンドレスチャンス',
    ],
    sections: [
      {
        label: 'クイズ',
        items: [
          { text: '正解→自己紹介をして勝ち抜け（ボタンの電源をオフに）', color: '#43a047' },
          { text: '誤答→その問題の解答権を失う', color: '#e53935' },
        ],
      },
      {
        label: '自己紹介',
        items: [
          { text: '・名前（ハンドルネーム）', color: '#cfd8dc' },
          { text: '・スアール来店回数／当日QMの回への参加回数', color: '#cfd8dc' },
          { text: '・得意ジャンル・好きなもの', color: '#cfd8dc' },
          { text: '・その他当日QMが指定したもの', color: '#cfd8dc' },
        ],
      },
    ],
  },
  {
    id: 'sengoku',
    title: '戦国合戦クイズ',
    titleColor: '#b71c1c',
    icon: '⚔️',
    tags: ['チーム戦', '早押し', 'スリリング'],
    bullets: [
      '２チーム対抗戦の早押し合戦',
    ],
    sections: [
      {
        label: 'チーム分け',
        items: [
          { text: '各チーム 先鋒・中堅・大将 の3つの役職にメンバーを分ける', color: '#cfd8dc', bold: true },
        ],
      },
      {
        label: '役職戦',
        items: [
          { text: '同じ役職の人だけで限定問題数ありの早押しクイズ', color: '#cfd8dc' },
          { text: '正解時の得点…先鋒10pt　中堅15pt　大将20pt', color: '#43a047' },
          { text: 'n問正解→勝ち抜け　誤答…1問休み', color: '#cfd8dc', greenRed: true },
        ],
      },
      {
        label: '勝敗',
        items: [
          { text: '先鋒×中堅×大将（掛け算）の数値が高いチームが勝利！', color: '#e53935', bold: true },
        ],
      },
    ],
  },
  {
    id: 'sharingan',
    title: '写輪眼クイズ',
    titleColor: '#b71c1c',
    icon: '👁️',
    tags: ['個人戦', '早押し', 'スリリング'],
    bullets: [
      '答えの1文字目が見える能力「写輪眼」を使った早押しクイズ',
    ],
    sections: [
      {
        label: '得点',
        items: [
          { text: '正解…+1ポイント　誤答…m問お休み', color: '#cfd8dc', greenRed: true },
        ],
      },
      {
        label: '写輪眼',
        items: [
          { text: '問題が始まる前にその問題の答えの1文字目を確認できる', color: '#cfd8dc' },
          { text: '自分の得点がnポイントに到達するまで使える', color: '#e53935' },
          { text: '（それ以降は使えなくなるのでヒントボードは見ないようにしてね）', color: '#546e7a' },
        ],
      },
      {
        label: 'コツ',
        items: [
          { text: '写輪眼が使えるうちはめちゃめちゃに有利！', color: '#1565c0', bold: true },
          { text: 'いっぱい押してチャレンジしてみよう！', color: '#1565c0', bold: true },
        ],
      },
    ],
  },
  {
    id: 'xx-world',
    title: 'XX問しかない世界',
    titleColor: '#1565c0',
    icon: '👑',
    tags: ['個人戦', '早押し', 'わいわい'],
    qrUrl: 'https://www.notion.so/70-30996bdea6d644489308af55119cf3b8',
    qrCaption: 'クイズ王用 答えシート',
    bullets: [
      '今からみなさんにはクイズ王になっていただきます',
    ],
    sections: [
      {
        label: '説明',
        items: [
          { text: 'クイズ王の方にはこれから出すクイズの答えを共有します', color: '#cfd8dc' },
          { text: 'QRコードを見ながらクイズに答えてもらって構いません', color: '#cfd8dc' },
          { text: 'クイズに慣れた方は一般人としてQRを見ずに参加していただいても構いません', color: '#546e7a' },
        ],
      },
      {
        label: '得点ルール（人数により調整）',
        items: [
          { text: 'クイズ王：7○n休（nは誤答の回数）', color: '#e53935' },
          { text: '一般人：10○m休（mはその時点の○の数）', color: '#1565c0' },
        ],
      },
    ],
  },
  {
    id: 'wordle',
    title: '文字あて Wordle',
    titleColor: '#ef5350',
    icon: '🟥',
    tags: ['チーム戦', '早押し', 'わいわい'],
    bullets: [
      'クイズ正解で相手チームの秘密の5文字へチャレンジ！',
      '赤は位置まで一致、黄は文字だけ一致',
    ],
    sections: [
      {
        label: 'ルール',
        items: [
          { text: '各チームは同じ文字を使わない秘密の5文字を用意します', color: '#cfd8dc' },
          { text: 'クイズに正解したチームは、相手を選んで5文字を1回予想できます', color: '#cfd8dc' },
          { text: '文字と場所が一致なら赤、別の場所に使われていれば黄色で表示します', color: '#cfd8dc' },
          { text: '秘密ワードを当てられたチームは撃破。最後に残ったチームが勝利です', color: '#cfd8dc' },
        ],
      },
    ],
    isGame: true,
    gameType: 'wordle',
  },
  {
    id: 'mouthpiece',
    title: 'マウスピースクイズ',
    titleColor: '#e53935',
    icon: '🦷',
    tags: ['個人戦', 'ボード', 'わいわい'],
    bullets: [
      'マウスピース着用で問題を読む！聞き取れたら正解！',
    ],
    sections: [
      {
        label: '①ボード回答',
        items: [
          { text: 'マウスピースを付けた状態で問題を読みます', color: '#cfd8dc' },
          { text: '1度目の読み上げで正解　→　+3pt　（誤答マイナスなし）', color: '#cfd8dc', greenRed: true },
          { text: '2度目の読み上げで正解　→　+2pt　（誤答マイナスなし）', color: '#cfd8dc', greenRed: true },
          { text: '※1度目に回答した場合、書き換え禁止', color: '#546e7a' },
        ],
      },
      {
        label: '②早押し回答',
        items: [
          { text: '①で回答しなかった人が対象', color: '#cfd8dc' },
          { text: 'マウスピースを外して問題を読みます', color: '#cfd8dc' },
          { text: 'エンドレスチャンス', color: '#cfd8dc' },
          { text: '正解…+1pt　誤答…−1pt', color: '#cfd8dc', greenRed: true },
        ],
      },
    ],
  },
  {
    id: 'board-rush',
    title: 'ボードラッシュ',
    titleColor: '#546e7a',
    icon: '📝',
    tags: ['団体戦', '早押し', 'ボード', 'スリリング'],
    bullets: ['準備中'],
    comingSoon: true,
  },
  {
    id: 'bai-bai-board',
    title: '倍々ボード',
    titleColor: '#6a1b9a',
    icon: '✖️',
    tags: ['個人戦', 'ボード', 'スリリング'],
    bullets: [
      '立って聞けば2倍！座れば確実に書ける！',
      '20問のボードクイズ',
    ],
    sections: [
      {
        label: '準備',
        items: [
          { text: 'ボードに20個の単語を書けるように「・」を打つ', color: '#cfd8dc' },
          { text: '全員立った状態からスタート', color: '#cfd8dc', bold: true },
        ],
      },
      {
        label: '出題',
        items: [
          { text: '全20問　各問題2回ずつ読み上げ', color: '#cfd8dc' },
          { text: '同じ答えの問題は出ません', color: '#cfd8dc' },
        ],
      },
      {
        label: '立つ／座る',
        items: [
          { text: '好きなタイミングで座ってOK', color: '#cfd8dc' },
          { text: '立った状態ではペンは使えない（座ってから書く）', color: '#e53935' },
          { text: '一度座ったら立つことはできない', color: '#e53935', bold: true },
        ],
      },
      {
        label: '得点',
        items: [
          { text: '立った状態で聞いた問題　→　1問 2pt', color: '#cfd8dc' },
          { text: '座ってから聞いた問題　→　1問 1pt', color: '#cfd8dc' },
          { text: '誤答による減点はなし', color: '#43a047' },
          { text: '回答順は問わない（正解がボードにあればOK）', color: '#1565c0' },
        ],
      },
    ],
  },
  {
    id: 'sales-event',
    title: '出張営業チームクイズ',
    titleColor: '#f7d154',
    icon: '🏅',
    tags: ['チーム戦', '早押し', 'わいわい'],
    bullets: [
      '5名×5チームの3ラウンド戦と5○3×個人決勝',
      'チーム・参加者名を会場得点表示へURL連携',
    ],
    isGame: true,
    gameType: 'sales-event',
  },
  {
    id: 'custom-slot',
    title: 'カスタムスロットミリオネア',
    titleColor: '#ffb300',
    icon: '🎰',
    tags: ['チーム戦', '早押し', 'わいわい'],
    bullets: [
      '10問の正解数だけスピン！',
      '最大3チームでカードを強化して目標VPを目指せ！',
    ],
    isGame: true,
    gameType: 'custom-slot',
  },
  {
    id: 'flip7',
    title: 'Flip 7',
    titleColor: '#ffd740',
    icon: '🃏',
    tags: ['チーム戦', '早押し', 'わいわい'],
    bullets: [
      'クイズ正解者がカードを引くカードゲーム！',
      '7種類の数字を集めてFlip 7達成を目指せ！',
    ],
    isGame: true,
    gameType: 'flip7',
  },
]
