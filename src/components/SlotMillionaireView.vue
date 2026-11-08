<template>
  <main class="slot-game">
    <header class="slot-header">
      <button class="ghost-button" :disabled="state.phase === 'rolling'" @click="emit('back')">← ホーム</button>
      <div>
        <p class="eyebrow">QUIZ × SLOT</p>
        <h1>🎰 カスタムスロットミリオネア</h1>
      </div>
      <div class="header-actions">
        <div class="audio-control">
          <button class="bgm-button" :class="{ playing: bgmPlaying }" :aria-pressed="bgmPlaying" @click="toggleBgm">
            <span>{{ bgmPlaying ? '♫ BGM ON' : '♪ BGM OFF' }}</span>
            <small>{{ Math.round(bgmBpm) }} BPM</small>
          </button>
          <label title="BGM音量。最大300%まで増幅できます">
            <input v-model.number="state.bgmVolume" type="range" min="0" max="300" step="10" aria-label="BGM音量" @change="previewAudio('bgm')" />
            <output>{{ state.bgmVolume }}%</output>
          </label>
        </div>
        <div class="audio-control">
          <button class="sfx-button" :class="{ playing: sfxEnabled }" :aria-pressed="sfxEnabled" @click="toggleSfx">
            {{ sfxEnabled ? '🔊 SE ON' : '🔇 SE OFF' }}
          </button>
          <label title="効果音音量。最大300%まで増幅できます">
            <input v-model.number="state.sfxVolume" type="range" min="0" max="300" step="10" aria-label="効果音音量" @change="previewAudio('sfx')" />
            <output>{{ state.sfxVolume }}%</output>
          </label>
        </div>
        <button class="ghost-button" @click="showGuide = !showGuide">ルール</button>
      </div>
    </header>

    <section v-if="showGuide" class="guide panel">
      <h2>使い方ガイド</h2>
      <ol>
        <li>開始時に全チームが1回ずつスロットを回します。</li>
        <li>初回を含む全チームのスピン後、低VP順に3枚組の育成カードセットを選びます。</li>
        <li>相談時間の目安を見ながらカードでスロットを育て、準備ができたら出題内容スロットへ進みます。</li>
        <li>出題内容スロットを回し、その10問の難易度・ジャンル・出題形式を決めます。</li>
        <li>1ラウンド10問。正解したチームのクレジットコインが1枚増え、スルーした問題は没収ポットへ1枚入ります。</li>
        <li>10問終了後、獲得したクレジットの回数だけチームごとにスピンし、再びカード選択と育成へ進みます。</li>
      </ol>
      <p>出題内容スロットは3リールです。対戦設定で各リールの見出しと候補を1行ずつ登録でき、決まった内容はそのラウンドの10問が終わるまで表示されます。</p>
      <p>妨害カードはありません。有効ラインで同じ数字が3個揃うと「数字×ライン倍率」のVPを獲得します。1/2カードはラインごとに1または2として扱えます。</p>
      <p>2〜4チームで対戦できます。PCではスピン中のチームを中央に大きく、全チームの小型盤面を左右へ最大2チームずつ表示します。狭い画面では操作中のチームだけを表示します。</p>
      <p>強化カードは効果とレベルを色分けバッジで表示します。リスクリターンは使用せず、標準でリムーブ7枚と最大2枚を除外するダブルリムーブ2枚が入ります。3（+1VP）は水色、3（+2VP）は紫色に光り、ライン成立とは別の出現VPだと分かります。</p>
      <p>カード名は大きく表示し、PCではカードへマウスを重ねるかキーボードで選ぶと効果説明が前面に出ます。タッチ端末では説明をカード内へ常時表示します。</p>
      <p>各チームの「現在の数字セット」には、数字カードの種類・枚数・合計枚数を表示します。</p>
      <div class="card-count-help">
        <strong>このゲームの共有カード構成（全{{ activeCardTotal }}枚）</strong>
        <span v-for="item in cardConfigItems" :key="item.key">{{ item.shortTitle }} <b>{{ activeCardCounts[item.key] }}枚</b></span>
      </div>
      <p>共有カードの枚数は対戦設定の「共有カード枚数」で変更でき、保存・バックアップにも含まれます。</p>
      <p>スピン待機中と結果確認中はEnterまたはSpaceキーで「回す」「次のスピンへ／次のチームへ」を進められます。キーボード入力として動くUSB／Bluetoothボタンと、ゲームパッドのAボタンにも対応します。</p>
      <p>「📈 得点推移」から、各スピン終了時のチーム別累積VPを折れ線グラフで確認できます。グラフは必要なときだけ表示されます。</p>
      <p>勝利VPはプリセットのほか、10〜9999VPの整数を直接入力できます。</p>
      <p>ラッキー・ビッグ・スモールで数字が変わる場合は、元の数字で停止した後に専用SEと発光演出が入り、対象リールだけが滑って揃います。「変化前→変化後」は結果確認まで表示します。</p>
      <p>BGMと回転・停止・当たりSEは画面上部から個別にON/OFF・0〜300%の音量調整ができます。100%が従来音量です。BGMは120 BPMから始まり、ラウンドごとに+5 BPM、先頭チームが目標VPの80%へ到達するとさらに+10 BPM、最大165 BPMまで滑らかに加速します。</p>
      <p>7のライン成立時は通常当たり音にジャックポットSEを重ね、優勝確定時はBGMを止めて専用ファンファーレを再生します。どちらもSEのON/OFFと音量設定に従います。</p>
    </section>

    <section v-if="state.phase === 'setup'" class="setup panel">
      <h2>対戦設定</h2>
      <label>チーム数</label>
      <div class="choice-row">
        <button v-for="number in [2, 3, 4]" :key="number" :class="{ selected: setup.teamCount === number }" @click="setup.teamCount = number">{{ number }}チーム</button>
      </div>
      <label>勝利VP</label>
      <div class="choice-row">
        <button v-for="number in [50, 75, 100, 200, 300]" :key="number" :class="{ selected: setup.targetVp === number }" @click="setup.targetVp = number">{{ number }}VP</button>
      </div>
      <label class="target-vp-field">
        <span>カスタム設定</span>
        <span class="target-vp-input">
          <input v-model.number="setup.targetVp" type="number" min="10" max="9999" step="1" inputmode="numeric" aria-label="勝利VPのカスタム値" />
          <b>VP</b>
        </span>
        <small>10〜9999の整数で入力</small>
      </label>
      <label>改造時間</label>
      <div class="choice-row">
        <button v-for="seconds in [60, 90, 120]" :key="seconds" :class="{ selected: setup.customizeSeconds === seconds }" @click="setup.customizeSeconds = seconds">{{ seconds }}秒</button>
      </div>
      <div class="team-inputs">
        <label v-for="(_, index) in setup.teamCount" :key="index">
          チーム{{ index + 1 }}
          <input v-model.trim="setup.names[index]" maxlength="12" :placeholder="`チーム${index + 1}`" />
        </label>
      </div>
      <details class="question-slot-config" open>
        <summary>出題内容スロット設定 <strong>3リール</strong></summary>
        <p>各リールの見出しと候補を設定します。候補は1行に1つ入力してください。</p>
        <div class="question-reel-configs">
          <section v-for="(reel, index) in setup.questionReels" :key="index" class="question-reel-config">
            <label>
              <span>リール{{ index + 1 }}の見出し</span>
              <input v-model.trim="reel.label" maxlength="12" :aria-label="`出題内容リール${index + 1}の見出し`" />
            </label>
            <label>
              <span>候補（1行に1つ）</span>
              <textarea v-model="reel.itemsText" rows="5" maxlength="500" :aria-label="`出題内容リール${index + 1}の候補`"></textarea>
            </label>
            <small>{{ questionReelSetupItems(reel).length }}候補</small>
          </section>
        </div>
        <div class="question-slot-config__actions">
          <button type="button" class="secondary" @click="resetQuestionReels">標準設定に戻す</button>
        </div>
      </details>
      <details class="card-config">
        <summary>共有カード枚数 <strong>全{{ setupCardTotal }}枚</strong></summary>
        <p>カードドラフトで使う共有山札です。各0〜99枚で設定できます。</p>
        <section v-for="group in CARD_CONFIG_GROUPS" :key="group.label" class="card-config__group">
          <h3>{{ group.label }}</h3>
          <label v-for="item in group.items" :key="item.key">
            <span>{{ item.title }}</span>
            <span class="card-count-input"><input v-model.number="setup.cardCounts[item.key]" type="number" min="0" max="99" step="1" inputmode="numeric" :aria-label="`${item.title}の枚数`" /><b>枚</b></span>
          </label>
        </section>
        <button type="button" class="secondary" @click="resetCardCounts">標準枚数に戻す</button>
      </details>
      <p v-if="setupError" class="error">{{ setupError }}</p>
      <div class="setup-actions">
        <button v-if="hasSave" class="secondary" @click="resumeGame">保存したゲームを再開</button>
        <button class="primary" @click="startGame">ゲーム開始</button>
      </div>
    </section>

    <template v-else>
      <div class="game-toolbar">
        <section class="next-action" aria-live="polite">
          <span>いまやること</span>
          <strong>{{ phaseInstruction }}</strong>
        </section>

        <section class="status panel">
          <div><span>フェイズ</span><strong>{{ phaseLabel }}</strong></div>
          <div><span>ラウンド</span><strong>{{ state.roundNumber || '初回' }}</strong></div>
          <div v-if="state.phase === 'quiz'"><span>問題</span><strong>{{ state.questionInRound + 1 }} / 10</strong></div>
          <div><span>目標</span><strong>{{ state.targetVp }} VP</strong></div>
          <button class="score-chart-button" @click="showScoreChart = true">📈 得点推移</button>
          <button class="ghost-button" :disabled="!history.length || state.phase === 'rolling'" @click="undo">↶ 取り消し</button>
          <button class="ghost-button" :disabled="state.phase === 'rolling'" @click="confirmReset">新しいゲーム</button>
        </section>
      </div>

      <section
        v-if="showCreditBank"
        class="credit-bank panel"
        :style="{ '--credit-columns': state.teams.length }"
        aria-label="チーム別スロットクレジット"
      >
        <article
          v-for="(team, index) in state.teams"
          :key="team.id"
          class="credit-team"
          :class="{ active: state.activeTeamIndex === index }"
          :style="{ '--team': team.color }"
        >
          <div class="credit-team__heading">
            <span>TEAM {{ index + 1 }} · {{ team.name }}</span>
            <strong>CREDIT {{ displayedCredits(team, index) }}</strong>
          </div>
          <TransitionGroup
            tag="div"
            name="credit-coin"
            class="credit-coins"
            :aria-label="`${team.name} ${displayedCredits(team, index)}クレジット`"
            aria-live="polite"
          >
            <span v-for="coin in displayedCredits(team, index)" :key="coin" class="credit-coin" aria-hidden="true">C</span>
            <small v-if="displayedCredits(team, index) === 0" key="empty">NO CREDIT</small>
          </TransitionGroup>
        </article>
        <article class="pass-vault" aria-label="スルーで没収されたコイン">
          <div class="pass-vault__heading">
            <span>HOUSE · スルー没収ポット</span>
            <strong>{{ state.roundPasses }}枚</strong>
          </div>
          <TransitionGroup tag="div" name="confiscated-coin" class="confiscated-coins" aria-live="polite">
            <span v-for="coin in state.roundPasses" :key="coin" class="confiscated-coin" aria-hidden="true">×</span>
            <small v-if="state.roundPasses === 0" key="empty">スルーなし</small>
          </TransitionGroup>
        </article>
      </section>

      <section v-if="state.phase === 'question-slot'" class="question-slot panel action-panel" aria-live="polite">
        <p class="quiz-kicker">ROUND {{ state.roundNumber }} · QUESTION SELECT</p>
        <h2>この10問の出題内容を決定</h2>
        <p>3つのリールを回して、ラウンド中に出す問題の条件を決めます。</p>
        <div class="question-slot-reels" :class="{ spinning: questionSlotSpinning }">
          <article v-for="(reel, index) in state.questionReels" :key="reel.id || index" class="question-slot-reel">
            <small>{{ reel.label }}</small>
            <strong>{{ questionSlotDisplay[index] || '？' }}</strong>
          </article>
        </div>
        <button
          v-if="!hasQuestionSlotResult"
          class="primary question-slot-spin-button"
          :disabled="questionSlotSpinning"
          @click="spinQuestionSlot"
        >{{ questionSlotSpinning ? '抽選中…' : '🎰 出題内容を決める' }}</button>
        <div v-else class="question-slot-actions">
          <button class="primary" @click="confirmQuestionSlot">この内容で10問開始</button>
          <button class="secondary" @click="spinQuestionSlot">もう一度回す</button>
        </div>
        <small>Enter・Space・外部ボタンでも「回す → 10問開始」を進められます。</small>
      </section>

      <section v-if="state.phase === 'quiz'" class="quiz-console panel">
        <p class="quiz-kicker">ROUND {{ state.roundNumber }} · QUESTION {{ state.questionInRound + 1 }}</p>
        <h2>正解したチームを記録</h2>
        <div v-if="state.questionSlotResult.length" class="question-theme-summary" aria-label="このラウンドの出題内容">
          <span v-for="(value, index) in state.questionSlotResult" :key="`${index}-${value}`">
            <small>{{ state.questionReels[index]?.label }}</small>
            <strong>{{ value }}</strong>
          </span>
        </div>
        <div class="quiz-buttons">
          <button
            v-for="(team, index) in state.teams"
            :key="team.id"
            :style="{ '--team': team.color }"
            @click="recordQuestion(index)"
          >✓ {{ team.name }}</button>
          <button class="pass-button" @click="recordQuestion(null)">⬇ スルー（コイン没収）</button>
        </div>
        <div class="round-corrects">
          <span v-for="team in state.teams" :key="team.id">{{ team.name }} <strong>{{ team.roundCorrect }}問</strong></span>
          <span class="pass-summary">没収 <strong>{{ state.roundPasses }}枚</strong></span>
        </div>
      </section>

      <section v-if="state.phase === 'draft'" class="draft panel action-panel">
        <p class="quiz-kicker">CARD DRAFT</p>
        <h2>{{ draftTeam?.name }}がカードセットを選択</h2>
        <p>低VPのチームから順番に、スロットを育てる3枚組を1セット獲得します。</p>
        <div class="draft-order">
          <span v-for="(teamIndex, orderIndex) in state.draftOrder" :key="teamIndex" :class="{ current: orderIndex === state.draftCursor }">{{ orderIndex + 1 }}. {{ state.teams[teamIndex].name }}</span>
        </div>
        <div class="card-sets">
          <button v-for="set in state.marketSets" :key="set.id" class="card-set" @click="chooseCardSet(set.id)">
            <span class="set-label">SET {{ set.label }}</span>
            <span
              v-for="card in set.cards"
              :key="card.uid"
              class="mini-card"
              :class="`card--${card.kind}`"
              :title="card.description"
              :data-tooltip="card.description"
              role="group"
              :aria-label="`${cardKindLabel(card)} ${card.title}：${card.description}`"
            >
              <span class="card-kind">{{ cardKindLabel(card) }}</span>
              <strong>{{ card.title }}</strong>
              <small class="card-description">{{ card.description }}</small>
            </span>
          </button>
        </div>
      </section>

      <section v-if="state.phase === 'customize'" class="customize panel action-panel">
        <p class="quiz-kicker">CUSTOMIZE PHASE</p>
        <h2>カードを使ってスロットを育成</h2>
        <small class="timer-caption">相談時間の目安</small>
        <div class="timer" :class="{ expired: customizeRemaining === 0 }">
          {{ formatTime(customizeRemaining) }}
        </div>
        <p v-if="customizeRemaining > 0">各チームで相談し、所持カードを使ってください。未使用カードは次ラウンドへ持ち越せます。</p>
        <p v-else class="timer-over">目安時間になりました。相談とカード操作はそのまま続けられます。</p>
        <button class="primary next-round-button" @click="finishCustomize">育成を終了して出題内容スロットへ</button>
      </section>

      <section class="teams" :class="{ 'teams--focus': state.activeTeamIndex !== null }">
        <aside v-if="state.activeTeamIndex !== null" class="focus-side focus-side--left" aria-label="左側チーム一覧">
          <article
            v-for="entry in leftFocusTeams"
            :key="`left-${entry.team.id}`"
            class="focus-team"
            :class="{ active: state.activeTeamIndex === entry.index }"
            :style="{ '--team': entry.team.color }"
          >
            <div class="focus-team__heading"><span>TEAM {{ entry.index + 1 }}</span><strong>{{ entry.team.vp }} VP</strong></div>
            <h3>{{ entry.team.name }}</h3>
            <div class="focus-mini-reels" aria-hidden="true">
              <span v-for="(card, reelIndex) in entry.team.reels" :key="reelIndex" :class="{ hit: entry.team.hitCells.includes(reelIndex), bonus: card?.bonus > 0, 'bonus--two': card?.bonus >= 2 }">{{ card ? numberCardLabel(card) : '–' }}</span>
            </div>
            <div class="focus-team__footer"><span>● {{ displayedCredits(entry.team, entry.index) }}</span><span>{{ entry.team.hand.length }} CARD</span></div>
          </article>
        </aside>
        <article
          v-for="(team, index) in state.teams"
          :key="team.id"
          class="team-card"
          :class="{
            active: state.activeTeamIndex === index,
            winner: state.phase === 'finished' && team.vp === winner?.vp,
          }"
          :style="{ '--team': team.color }"
        >
          <div class="team-heading">
            <div>
              <span class="team-number">TEAM {{ index + 1 }}</span>
              <h2>{{ team.name }}</h2>
            </div>
            <div class="score"><strong>{{ team.vp }}</strong><span>VP</span></div>
          </div>
          <div class="meter"><i :style="{ width: `${Math.min(100, team.vp / state.targetVp * 100)}%` }"></i></div>
          <div class="resources">
            <span><small>ラウンド正解</small><strong>{{ team.roundCorrect }}問</strong></span>
            <span><small>{{ state.phase === 'quiz' ? '獲得CREDIT' : '残りCREDIT' }}</small><strong>● {{ displayedCredits(team, index) }}</strong></span>
            <span><small>所持カード</small><strong>{{ team.hand.length }}枚</strong></span>
          </div>

          <div v-if="state.phase !== 'quiz'" class="reel-stage">
            <div
              class="reels"
              :class="{ rolling: state.phase === 'rolling' && rollingTeamIndex === index }"
              aria-label="3行3列のスロット結果"
              aria-live="polite"
            >
              <span
                v-for="(card, reelIndex) in team.reels"
                :key="reelIndex"
                :class="[{
                  hit: team.hitCells.includes(reelIndex),
                  bonus: card?.bonus > 0,
                  'bonus--two': card?.bonus >= 2,
                  'rolling-cell': isCellRolling(index, reelIndex),
                  'transforming-cell': isTransformingCell(index, reelIndex),
                  'transformed-cell': Boolean(cellTransformation(index, reelIndex)),
                }, transformationClass(index, reelIndex)]"
                :data-bonus="card?.bonus ? `+${card.bonus}VP` : null"
              >
                <div v-if="isTransformingCell(index, reelIndex)" class="reel-slip-window" aria-hidden="true">
                  <div
                    class="reel-slip-strip"
                    :class="{ 'reel-slip-strip--landed': cellTransformation(index, reelIndex).applied }"
                  >
                    <b>{{ cellTransformation(index, reelIndex).beforeLabel }}</b>
                    <b>{{ cellTransformation(index, reelIndex).afterLabel }}</b>
                  </div>
                </div>
                <b v-else class="reel-value">{{ card ? numberCardLabel(card) : '–' }}</b>
                <small v-if="cellTransformation(index, reelIndex)" class="change-tag">
                  {{ cellTransformation(index, reelIndex).icon }}
                  {{ cellTransformation(index, reelIndex).beforeLabel }}→{{ cellTransformation(index, reelIndex).afterLabel }}
                </small>
              </span>
            </div>
            <i
              v-for="(_, lineIndex) in LINES"
              :key="lineIndex"
              class="payline"
              :class="[`payline--${lineIndex}`, { enabled: team.lineMultipliers[lineIndex] > 0 }]"
              :style="{ '--line': team.color }"
            ></i>
          </div>

          <div v-if="state.phase !== 'quiz'" class="line-heading">
            <strong>有効ライン {{ enabledLineCount(team) }} / 8</strong>
            <span>配当＝数字 × 倍率</span>
          </div>
          <div v-if="state.phase !== 'quiz'" class="line-status" aria-label="有効ラインと倍率">
            <span
              v-for="(lineName, lineIndex) in LINE_NAMES"
              :key="lineName"
              :class="{ enabled: team.lineMultipliers[lineIndex] > 0 }"
            >
              {{ lineName }}
              <strong>{{ team.lineMultipliers[lineIndex] ? `×${team.lineMultipliers[lineIndex]}` : 'OFF' }}</strong>
            </span>
          </div>

          <div v-if="state.phase !== 'quiz'" class="deck-status" aria-label="現在の数字セット">
            <div class="deck-status__heading">
              <strong>現在の数字セット</strong>
              <span>全{{ team.numberDeck.length }}枚</span>
            </div>
            <div class="number-set">
              <span
                v-for="entry in deckEntries(team)"
                :key="entry.key"
                class="number-set__chip"
                :class="`number-set__chip--${entry.tone}`"
              >
                <b>{{ entry.label }}</b><em>×{{ entry.count }}</em>
              </span>
            </div>
          </div>
          <div v-if="state.phase !== 'quiz'" class="ability-status" aria-label="強化バッジ">
            <span v-if="!abilityBadges(team).length" class="no-ability">強化なし</span>
            <span
              v-for="badge in abilityBadges(team)"
              :key="badge.key"
              class="ability-badge"
              :class="`ability-badge--${badge.key}`"
              :title="badge.title"
              :aria-label="`${badge.label} レベル${badge.level} ${badge.effect}`"
            >
              <b aria-hidden="true">{{ badge.icon }}</b>
              <strong>{{ badge.label }}</strong>
              <small>{{ badge.effect }}</small>
              <em>Lv.{{ badge.level }}</em>
            </span>
          </div>
          <p v-if="state.phase !== 'quiz'" class="result" :class="{ 'result--confirmed': state.phase === 'spin-result' && state.activeTeamIndex === index }">{{ team.lastResult || '初回スピンを待っています' }}</p>

          <button
            v-if="state.phase === 'spin-turn' && state.activeTeamIndex === index"
            class="spin-button"
            aria-keyshortcuts="Enter Space"
            @click="spinOnce(index)"
          >🎰 スピンする（残り{{ team.spinRightsRemaining }}回）<small>Enter / Space / 外部ボタン</small></button>

          <div v-else-if="state.phase === 'rolling' && state.activeTeamIndex === index" class="rolling-message">
            <span class="rolling-lamp"></span>
            SPINNING…
          </div>

          <button
            v-else-if="state.phase === 'spin-result' && state.activeTeamIndex === index"
            class="continue-button"
            aria-keyshortcuts="Enter Space"
            @click="continueSpin"
          >{{ team.spinRightsRemaining > 0 ? `次のスピンへ（残り${team.spinRightsRemaining}回）` : '次のチームへ' }} →<small>Enter / Space / 外部ボタン</small></button>

          <div v-if="state.phase === 'customize'" class="hand">
            <h3>所持カード</h3>
            <p v-if="!team.hand.length" class="empty">使用できるカードはありません</p>
            <button
              v-for="card in team.hand"
              :key="card.uid"
              class="hand-card"
              :class="`card--${card.kind}`"
              :title="card.description"
              :data-tooltip="card.description"
              :aria-label="`${cardKindLabel(card)} ${card.title}：${card.description}`"
              @click="useCard(index, card.uid)"
            >
              <span class="card-kind">{{ cardKindLabel(card) }}</span>
              <strong>{{ card.title }}</strong>
              <small class="card-description">{{ card.description }}</small>
            </button>
          </div>
        </article>
        <aside v-if="state.activeTeamIndex !== null" class="focus-side focus-side--right" aria-label="右側チーム一覧">
          <article
            v-for="entry in rightFocusTeams"
            :key="`right-${entry.team.id}`"
            class="focus-team"
            :class="{ active: state.activeTeamIndex === entry.index }"
            :style="{ '--team': entry.team.color }"
          >
            <div class="focus-team__heading"><span>TEAM {{ entry.index + 1 }}</span><strong>{{ entry.team.vp }} VP</strong></div>
            <h3>{{ entry.team.name }}</h3>
            <div class="focus-mini-reels" aria-hidden="true">
              <span v-for="(card, reelIndex) in entry.team.reels" :key="reelIndex" :class="{ hit: entry.team.hitCells.includes(reelIndex), bonus: card?.bonus > 0, 'bonus--two': card?.bonus >= 2 }">{{ card ? numberCardLabel(card) : '–' }}</span>
            </div>
            <div class="focus-team__footer"><span>● {{ displayedCredits(entry.team, entry.index) }}</span><span>{{ entry.team.hand.length }} CARD</span></div>
          </article>
        </aside>
      </section>

      <section v-if="pendingUse?.mode === 'line'" class="choice-modal panel">
        <h2>{{ pendingUse.card.title }}の配置先</h2>
        <div class="line-upgrade-grid">
          <button v-for="lineIndex in pendingUse.validLines" :key="lineIndex" @click="applyMultiplier(lineIndex)">
            {{ LINE_NAMES[lineIndex] }}
            <strong>{{ pendingTeam.lineMultipliers[lineIndex] ? `×${pendingTeam.lineMultipliers[lineIndex]} → ×${pendingTeam.lineMultipliers[lineIndex] + pendingUse.card.amount}` : `OFF → ×${pendingUse.card.amount}` }}</strong>
          </button>
        </div>
        <button class="secondary" @click="pendingUse = null">キャンセル</button>
      </section>

      <section v-if="pendingUse?.mode === 'remove'" class="choice-modal panel">
        <h2>リムーブする数字カード</h2>
        <p>{{ pendingUse.card.title }}：あと{{ pendingUse.remaining }}枚選択できます。山札は10枚未満にできません。</p>
        <div class="remove-grid">
          <button v-for="card in pendingTeam.numberDeck" :key="card.uid" @click="applyRemove(card.uid)">{{ numberCardLabel(card) }}</button>
        </div>
        <button v-if="pendingUse.removed === 0" class="secondary" @click="pendingUse = null">キャンセル</button>
      </section>

      <section v-if="showScoreChart" class="score-chart-modal panel" role="dialog" aria-modal="true" aria-labelledby="score-chart-title">
        <div class="score-chart-heading">
          <div>
            <p class="quiz-kicker">SCORE HISTORY</p>
            <h2 id="score-chart-title">チーム別 得点推移</h2>
          </div>
          <button class="ghost-button" @click="showScoreChart = false">閉じる ×</button>
        </div>
        <div class="score-chart-legend" aria-label="現在のチーム得点">
          <span v-for="(team, index) in state.teams" :key="team.id" :style="{ '--team': team.color }">
            <i></i><b>{{ team.name }}</b><strong>{{ team.vp }} VP</strong>
          </span>
        </div>
        <div class="score-chart-scroll">
          <svg
            class="score-chart"
            :viewBox="`0 0 ${scoreChartWidth} ${SCORE_CHART_HEIGHT}`"
            :style="{ width: `${scoreChartWidth}px` }"
            role="img"
            aria-label="各スピン後のチーム別累積VP折れ線グラフ"
          >
            <g class="score-grid">
              <g v-for="value in scoreGridValues" :key="value">
                <line :x1="SCORE_CHART_LEFT" :x2="scoreChartWidth - SCORE_CHART_RIGHT" :y1="scoreY(value)" :y2="scoreY(value)" />
                <text :x="SCORE_CHART_LEFT - 10" :y="scoreY(value) + 4">{{ value }}</text>
              </g>
            </g>
            <g class="score-axis-labels">
              <g v-for="(entry, pointIndex) in state.scoreHistory" :key="entry.id || pointIndex">
                <line :x1="scoreX(pointIndex)" :x2="scoreX(pointIndex)" :y1="SCORE_CHART_BOTTOM" :y2="SCORE_CHART_BOTTOM + 5" />
                <text :x="scoreX(pointIndex)" :y="SCORE_CHART_BOTTOM + 19" text-anchor="middle">{{ entry.label }}</text>
              </g>
            </g>
            <g v-for="(team, teamIndex) in state.teams" :key="team.id" class="score-team-line">
              <polyline :points="scorePolyline(teamIndex)" :style="{ stroke: team.color }" />
              <circle
                v-for="(entry, pointIndex) in state.scoreHistory"
                :key="`${team.id}-${entry.id || pointIndex}`"
                :cx="scoreX(pointIndex)"
                :cy="scoreY(entry.scores[teamIndex] || 0)"
                r="4"
                :style="{ fill: team.color }"
              >
                <title>{{ entry.label }}・{{ team.name }}：{{ entry.scores[teamIndex] || 0 }}VP</title>
              </circle>
            </g>
          </svg>
        </div>
        <p class="score-chart-note">各スピンの得点確定後に記録します。横へスクロールすると過去の全スピンを確認できます。</p>
      </section>

      <section v-if="state.phase === 'finished' && winner" class="winner-banner">
        <span>🏆 WINNER</span>
        <strong>{{ winner.name }}</strong>
        <p>{{ winner.vp }} VP</p>
        <div class="winner-actions">
          <button @click="showScoreChart = true">📈 得点推移を見る</button>
          <button @click="confirmReset">もう一度遊ぶ</button>
        </div>
      </section>

      <details class="log panel">
        <summary>進行ログ・データ管理</summary>
        <ol>
          <li v-for="(entry, index) in state.log" :key="index">{{ entry }}</li>
        </ol>
        <div class="data-actions">
          <button @click="downloadBackup">JSONバックアップ</button>
          <label class="file-button">JSONから復元<input type="file" accept="application/json" @change="restoreBackup" /></label>
        </div>
        <p v-if="dataError" class="error">{{ dataError }}</p>
      </details>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

const emit = defineEmits(['back'])
const STORAGE_KEY = 'piyopiyo_custom_slot_v1'
const COLORS = ['#ffb300', '#42a5f5', '#ef5350', '#66bb6a']
const QUESTIONS_PER_ROUND = 10
const SCORE_CHART_HEIGHT = 330
const SCORE_CHART_LEFT = 52
const SCORE_CHART_RIGHT = 24
const SCORE_CHART_TOP = 20
const SCORE_CHART_BOTTOM = 278
const BGM_BASE_BPM = 120
const BGM_MAX_BPM = 165
const BGM_ROUND_BONUS = 5
const BGM_FINAL_STRETCH_BONUS = 10
const DEFAULT_QUESTION_REELS = Object.freeze([
  { id: 'difficulty', label: '難易度', items: ['初級', '中級', '上級'] },
  { id: 'genre', label: 'ジャンル', items: ['ノンジャンル', '芸能・音楽', 'スポーツ', 'アニメ・ゲーム', '学問・一般常識'] },
  { id: 'format', label: '出題形式', items: ['通常問題', 'イントロ', '画像問題'] },
])
const DEFAULT_CARD_COUNTS = Object.freeze({
  wild12: 8,
  '3p1': 8,
  '3p2': 8,
  7: 8,
  remove: 7,
  doubleRemove: 2,
  oneTwoBeat: 3,
  luckyNumber: 3,
  bigNumber: 3,
  smallNumber: 3,
  horizontal1: 4,
  vertical1: 4,
  vertical2: 3,
  diagonal1: 4,
  diagonal2: 3,
})
const CARD_CONFIG_GROUPS = [
  {
    label: 'ナンバーカード',
    items: [
      { key: 'wild12', title: '1/2', shortTitle: '1/2' },
      { key: '3p1', title: '3（+1VP）', shortTitle: '3+1' },
      { key: '3p2', title: '3（+2VP）', shortTitle: '3+2' },
      { key: '7', title: '7', shortTitle: '7' },
    ],
  },
  {
    label: '強化カード',
    items: [
      { key: 'remove', title: 'リムーブ', shortTitle: 'リムーブ' },
      { key: 'doubleRemove', title: 'ダブルリムーブ', shortTitle: 'ダブルリムーブ' },
      { key: 'oneTwoBeat', title: 'ワンツービート', shortTitle: 'ワンツー' },
      { key: 'luckyNumber', title: 'ラッキーナンバー', shortTitle: 'ラッキー' },
      { key: 'bigNumber', title: 'ビッグナンバー', shortTitle: 'ビッグ' },
      { key: 'smallNumber', title: 'スモールナンバー', shortTitle: 'スモール' },
    ],
  },
  {
    label: '倍率カード',
    items: [
      { key: 'horizontal1', title: '横 ×1', shortTitle: '横×1' },
      { key: 'vertical1', title: '縦 ×1', shortTitle: '縦×1' },
      { key: 'vertical2', title: '縦 ×2', shortTitle: '縦×2' },
      { key: 'diagonal1', title: '斜め ×1', shortTitle: '斜め×1' },
      { key: 'diagonal2', title: '斜め ×2', shortTitle: '斜め×2' },
    ],
  },
]
const cardConfigItems = CARD_CONFIG_GROUPS.flatMap(group => group.items)
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]
const LINE_NAMES = ['横・上', '横・中', '横・下', '縦・左', '縦・中', '縦・右', '斜め・＼', '斜め・／']
const TRANSFORM_ABILITY_META = {
  luckyNumber: { icon: '🍀7', label: 'ラッキーナンバー' },
  bigNumber: { icon: '⬆+1', label: 'ビッグナンバー' },
  smallNumber: { icon: '⬇−', label: 'スモールナンバー' },
}
const PHASE_LABELS = {
  'initial-spin': '初回スロット',
  'question-slot': '出題決定',
  quiz: 'クイズ',
  'spin-turn': 'スロット',
  rolling: '回転中',
  'spin-result': '結果確認',
  draft: 'カード選択',
  customize: '改造',
  finished: 'ゲーム終了',
}

let uidSequence = 0
const setup = reactive({
  teamCount: 3,
  targetVp: 100,
  customizeSeconds: 90,
  names: ['オレンジ', 'ブルー', 'レッド', 'グリーン'],
  questionReels: questionReelsToSetup(DEFAULT_QUESTION_REELS),
  cardCounts: { ...DEFAULT_CARD_COUNTS },
})
const showGuide = ref(false)
const showScoreChart = ref(false)
const setupError = ref('')
const dataError = ref('')
const history = reactive([])
const rollingTeamIndex = ref(null)
const stoppedColumns = ref([])
const activeTransformation = ref(null)
const lastTransformations = ref({})
const customizeRemaining = ref(90)
const pendingUse = ref(null)
const bgmPlaying = ref(false)
const bgmBpm = ref(BGM_BASE_BPM)
const sfxEnabled = ref(true)
const questionSlotSpinning = ref(false)
const questionSlotDisplay = ref([])
let spinRunId = 0
let questionSlotRunId = 0
let questionSlotTimers = []
let customizeTimer = null
let audioContext = null
let bgmTimer = null
let bgmStep = 0
let reelSoundTimer = null
let reelSoundStep = 0
let gamepadAnimationFrame = null
const gamepadButtonStates = new Map()

const saved = loadSaved()
const hasSave = ref(Boolean(saved))
const state = reactive(saved || emptyState())
if (saved?.questionReels) setup.questionReels = questionReelsToSetup(saved.questionReels)
questionSlotDisplay.value = [...(state.questionSlotResult || [])]

const phaseLabel = computed(() => activeTransformation.value ? '強化発動' : (PHASE_LABELS[state.phase] || state.phase))
const phaseInstruction = computed(() => {
  const activeTeam = state.teams[state.activeTeamIndex]
  if (activeTransformation.value) {
    const change = activeTransformation.value
    return `${change.icon} ${change.label}：${change.beforeLabel} → ${change.afterLabel}`
  }
  if (state.phase === 'question-slot') {
    if (questionSlotSpinning.value) return '出題内容スロットの回転中'
    return hasQuestionSlotResult.value ? '結果を確認して10問を開始する' : '出題内容スロットを回す'
  }
  if (state.phase === 'quiz') return `Q${state.questionInRound + 1}の正解チームを押す`
  if (state.phase === 'spin-turn') return `${activeTeam?.name || '対象チーム'}がスロットを回す`
  if (state.phase === 'rolling') return `${activeTeam?.name || '対象チーム'}のリール回転中`
  if (state.phase === 'spin-result') return '結果と獲得VPを確認して次へ進む'
  if (state.phase === 'draft') return `${draftTeam.value?.name || '対象チーム'}が育成カード3枚組を選ぶ`
  if (state.phase === 'customize') return '目安時間を見ながらカードを使い、準備ができたら次へ進む'
  if (state.phase === 'finished') return '優勝チームを確認する'
  return '対戦を開始する'
})
const winner = computed(() => state.phase === 'finished'
  ? [...state.teams].sort((left, right) => right.vp - left.vp)[0]
  : null)
const draftTeam = computed(() => state.teams[state.draftOrder?.[state.draftCursor]] || null)
const pendingTeam = computed(() => pendingUse.value ? state.teams[pendingUse.value.teamIndex] : null)
const showCreditBank = computed(() => ['quiz', 'spin-turn', 'rolling', 'spin-result'].includes(state.phase))
const focusTeamEntries = computed(() => state.teams.map((team, index) => ({ team, index })))
const focusTeamSplit = computed(() => Math.ceil(focusTeamEntries.value.length / 2))
const leftFocusTeams = computed(() => focusTeamEntries.value.slice(0, focusTeamSplit.value))
const rightFocusTeams = computed(() => focusTeamEntries.value.slice(focusTeamSplit.value))
const activeCardCounts = computed(() => state.phase === 'setup' ? setup.cardCounts : state.cardCounts)
const setupCardTotal = computed(() => cardCountTotal(setup.cardCounts))
const activeCardTotal = computed(() => cardCountTotal(activeCardCounts.value))
const hasQuestionSlotResult = computed(() => (
  state.questionReels.length > 0
  && state.questionSlotResult.length === state.questionReels.length
  && state.questionSlotResult.every(value => Boolean(String(value || '').trim()))
))
const targetBgmBpm = computed(() => {
  const highestVp = Math.max(0, ...state.teams.map(team => Number(team.vp) || 0))
  const finalStretch = state.targetVp > 0 && highestVp >= state.targetVp * 0.8 ? BGM_FINAL_STRETCH_BONUS : 0
  return Math.min(BGM_MAX_BPM, BGM_BASE_BPM + Math.max(0, state.roundNumber) * BGM_ROUND_BONUS + finalStretch)
})
const scoreChartWidth = computed(() => Math.max(760, SCORE_CHART_LEFT + SCORE_CHART_RIGHT + Math.max(1, state.scoreHistory.length - 1) * 72))
const scoreChartMax = computed(() => {
  const highest = Math.max(0, ...state.scoreHistory.flatMap(entry => entry.scores || []))
  return Math.max(20, Math.ceil(highest / 20) * 20)
})
const scoreGridValues = computed(() => Array.from({ length: 5 }, (_, index) => scoreChartMax.value / 4 * index))

function displayedCredits(team, teamIndex) {
  if (state.phase === 'quiz') return Math.max(0, Number(team.roundCorrect) || 0)
  const credits = Math.max(0, Number(team.spinRightsRemaining) || 0)
  return state.phase === 'rolling' && state.activeTeamIndex === teamIndex
    ? Math.max(0, credits - 1)
    : credits
}

function scoreX(pointIndex) {
  if (state.scoreHistory.length <= 1) return SCORE_CHART_LEFT
  const drawableWidth = scoreChartWidth.value - SCORE_CHART_LEFT - SCORE_CHART_RIGHT
  return SCORE_CHART_LEFT + drawableWidth * pointIndex / (state.scoreHistory.length - 1)
}

function scoreY(value) {
  const drawableHeight = SCORE_CHART_BOTTOM - SCORE_CHART_TOP
  return SCORE_CHART_BOTTOM - drawableHeight * Math.max(0, Number(value) || 0) / scoreChartMax.value
}

function scorePolyline(teamIndex) {
  return state.scoreHistory.map((entry, pointIndex) => `${scoreX(pointIndex)},${scoreY(entry.scores?.[teamIndex] || 0)}`).join(' ')
}

function triggerSpinAction() {
  if (showScoreChart.value) return
  if (state.phase === 'question-slot') {
    if (questionSlotSpinning.value) return
    if (hasQuestionSlotResult.value) confirmQuestionSlot()
    else spinQuestionSlot()
    return
  }
  const teamIndex = state.activeTeamIndex
  if (!Number.isInteger(teamIndex)) return
  if (state.phase === 'spin-turn') spinOnce(teamIndex)
  else if (state.phase === 'spin-result') continueSpin()
}

function handleSpinShortcut(event) {
  if (event.key === 'Escape' && showScoreChart.value) {
    showScoreChart.value = false
    return
  }
  if (showScoreChart.value) return
  if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return
  const isSpinKey = event.key === 'Enter' || event.key === ' ' || event.code === 'Space'
  if (!isSpinKey || !['question-slot', 'spin-turn', 'spin-result'].includes(state.phase)) return
  const target = event.target
  if (target instanceof Element && target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return
  event.preventDefault()
  triggerSpinAction()
}

function pollGamepads() {
  gamepadAnimationFrame = null
  const gamepads = navigator.getGamepads?.() || []
  let hasGamepad = false
  for (const gamepad of gamepads) {
    if (!gamepad) continue
    hasGamepad = true
    const pressed = Boolean(gamepad.buttons?.[0]?.pressed)
    const wasPressed = Boolean(gamepadButtonStates.get(gamepad.index))
    if (pressed && !wasPressed) triggerSpinAction()
    gamepadButtonStates.set(gamepad.index, pressed)
  }
  if (hasGamepad) gamepadAnimationFrame = window.requestAnimationFrame(pollGamepads)
  else gamepadButtonStates.clear()
}

function startGamepadPolling() {
  if (gamepadAnimationFrame === null) gamepadAnimationFrame = window.requestAnimationFrame(pollGamepads)
}

watch(state, saveState, { deep: true })
watch(() => state.phase, phase => {
  if (phase === 'customize') startCustomizeTimer()
  else stopCustomizeTimer()
}, { immediate: true })

function emptyState() {
  return {
    schemaVersion: 8,
    phase: 'setup',
    targetVp: 100,
    customizeSeconds: 90,
    bgmVolume: 100,
    sfxVolume: 100,
    roundNumber: 0,
    questionInRound: 0,
    questionCount: 0,
    roundPasses: 0,
    questionReels: normalizeQuestionReels(DEFAULT_QUESTION_REELS),
    questionSlotResult: [],
    activeTeamIndex: null,
    teams: [],
    cardCounts: { ...DEFAULT_CARD_COUNTS },
    cardPool: [],
    discardPile: [],
    marketSets: [],
    draftOrder: [],
    draftCursor: 0,
    spinOrder: [],
    spinCursor: 0,
    spinContext: null,
    scoreHistory: [],
    log: [],
  }
}

function makeBaseNumberCard(value, index) {
  return {
    uid: `base-${value}-${index}-${nextUid()}`,
    key: String(value),
    value,
    bonus: 0,
    label: String(value),
    basic: true,
  }
}

function initialNumberDeck() {
  return [
    ...Array.from({ length: 4 }, (_, index) => makeBaseNumberCard(1, index)),
    ...Array.from({ length: 4 }, (_, index) => makeBaseNumberCard(2, index)),
    ...Array.from({ length: 3 }, (_, index) => makeBaseNumberCard(3, index)),
    makeBaseNumberCard(7, 0),
  ]
}

function makeTeam(name, index) {
  return {
    id: crypto.randomUUID?.() || `${Date.now()}-${index}`,
    name: name || `チーム${index + 1}`,
    color: COLORS[index],
    vp: 0,
    lineMultipliers: [1, 1, 1, 0, 0, 0, 0, 0],
    numberDeck: initialNumberDeck(),
    abilities: {
      oneTwoBeat: 0,
      luckyNumber: 0,
      bigNumber: 0,
      smallNumber: 0,
    },
    hand: [],
    roundCorrect: 0,
    spinRights: 0,
    spinRightsRemaining: 0,
    reels: Array(9).fill(null),
    hitCells: [],
    lastResult: '',
  }
}

function nextUid() {
  uidSequence++
  return `${Date.now().toString(36)}-${uidSequence.toString(36)}`
}

function makeCard(kind, key, title, description, extra = {}) {
  return { uid: `card-${nextUid()}`, kind, key, title, description, ...extra }
}

function buildCardPool(cardCounts = DEFAULT_CARD_COUNTS) {
  const counts = normalizeCardCounts(cardCounts)
  const cards = []
  const addCopies = (count, factory) => {
    for (let index = 0; index < count; index++) cards.push(factory(index))
  }

  addCopies(counts.wild12, () => makeCard('number', 'wild12', '1/2', 'ラインごとに1または2として扱う', { numberCard: { key: 'wild12', value: null, bonus: 0, label: '1/2' } }))
  addCopies(counts['3p1'], () => makeCard('number', '3p1', '3（+1VP）', '出現するだけで+1VP。ライン上は3', { numberCard: { key: '3p1', value: 3, bonus: 1, label: '3⁺¹' } }))
  addCopies(counts['3p2'], () => makeCard('number', '3p2', '3（+2VP）', '出現するだけで+2VP。ライン上は3', { numberCard: { key: '3p2', value: 3, bonus: 2, label: '3⁺²' } }))
  addCopies(counts['7'], () => makeCard('number', '7', '7', '高配当の7を山札へ追加', { numberCard: { key: '7', value: 7, bonus: 0, label: '7' } }))

  addCopies(counts.remove, () => makeCard('upgrade', 'remove', 'リムーブ', '数字カードを1枚除外（最低10枚）'))
  addCopies(counts.doubleRemove, () => makeCard('upgrade', 'doubleRemove', 'ダブルリムーブ', '数字カードを最大2枚除外（最低10枚）'))
  addCopies(counts.oneTwoBeat, () => makeCard('upgrade', 'oneTwoBeat', 'ワンツービート', '1・2・1/2が3枚出るごとに、レベル分のVPを加算'))
  addCopies(counts.luckyNumber, () => makeCard('upgrade', 'luckyNumber', 'ラッキーナンバー', '得点が最大になる1マスを自動で7に変更'))
  addCopies(counts.bigNumber, () => makeCard('upgrade', 'bigNumber', 'ビッグナンバー', '得点が最大になる1マスを自動で+1'))
  addCopies(counts.smallNumber, () => makeCard('upgrade', 'smallNumber', 'スモールナンバー', '得点が最大になる1マスを自動で-1/-2'))

  addCopies(counts.horizontal1, () => makeCard('multiplier', 'horizontal1', '横倍率 ×1', '横の任意ラインを開放・強化', { orientation: 'horizontal', amount: 1 }))
  addCopies(counts.vertical1, () => makeCard('multiplier', 'vertical1', '縦倍率 ×1', '縦の任意ラインを開放・強化', { orientation: 'vertical', amount: 1 }))
  addCopies(counts.vertical2, () => makeCard('multiplier', 'vertical2', '縦倍率 ×2', '縦の任意ラインを×2強化', { orientation: 'vertical', amount: 2 }))
  addCopies(counts.diagonal1, () => makeCard('multiplier', 'diagonal1', '斜め倍率 ×1', '斜めの任意ラインを開放・強化', { orientation: 'diagonal', amount: 1 }))
  addCopies(counts.diagonal2, () => makeCard('multiplier', 'diagonal2', '斜め倍率 ×2', '斜めの任意ラインを×2強化', { orientation: 'diagonal', amount: 2 }))

  return shuffled(cards)
}

function loadSaved() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (!value || !Array.isArray(value.teams)) return null
    migrateState(value)
    return value
  } catch {
    return null
  }
}

function migrateState(value) {
  const previousSchemaVersion = Number(value.schemaVersion) || 1
  const hadCardPool = Array.isArray(value.cardPool)
  value.schemaVersion = 8
  value.targetVp ||= 100
  value.customizeSeconds ||= 90
  value.bgmVolume = normalizeAudioVolume(value.bgmVolume)
  value.sfxVolume = normalizeAudioVolume(value.sfxVolume)
  value.roundNumber ??= previousSchemaVersion < 2 ? 1 : 0
  value.questionInRound ||= 0
  value.questionCount ||= 0
  value.roundPasses = Math.max(0, Number(value.roundPasses) || 0)
  value.questionReels = normalizeQuestionReels(value.questionReels)
  value.questionSlotResult = normalizeQuestionSlotResult(value.questionSlotResult, value.questionReels)
  value.cardCounts = normalizeCardCounts(value.cardCounts)
  value.cardPool ||= buildCardPool(value.cardCounts)
  if (previousSchemaVersion < 5 && hadCardPool) {
    for (let index = 0; index < value.cardCounts.doubleRemove; index++) {
      value.cardPool.push(makeCard('upgrade', 'doubleRemove', 'ダブルリムーブ', '数字カードを最大2枚除外（最低10枚）'))
    }
    value.cardPool = shuffled(value.cardPool)
  }
  value.discardPile ||= []
  value.marketSets ||= []
  value.draftOrder ||= []
  value.draftCursor ||= 0
  value.spinOrder ||= []
  value.spinCursor ||= 0
  value.spinContext ||= null
  value.log ||= []

  value.cardPool = normalizeGrowthCards(value.cardPool)
  value.discardPile = normalizeGrowthCards(value.discardPile)
  value.marketSets = value.marketSets.map(set => ({ ...set, cards: normalizeGrowthCards(set.cards) }))
  value.marketSets.forEach(set => {
    while (set.cards.length < 3 && value.cardPool.length) set.cards.push(value.cardPool.pop())
  })

  const oldPhases = ['action', 'result', 'upgrade', 'attack', 'attack-type']
  if (value.phase === 'rolling' || value.phase === 'question-slot-rolling' || oldPhases.includes(value.phase)) value.phase = 'quiz'

  value.teams.forEach((team, teamIndex) => {
    team.color ||= COLORS[teamIndex]
    team.vp ||= 0
    if (!Array.isArray(team.lineMultipliers)) {
      const level = Number(team.lineLevel) || 3
      const multiplier = Math.max(1, Number(team.multiplier) || 1)
      team.lineMultipliers = LINES.map((_, lineIndex) => lineIndex < level ? multiplier : 0)
    }
    team.lineMultipliers = LINES.map((_, lineIndex) => Math.max(0, Number(team.lineMultipliers[lineIndex]) || 0))
    team.numberDeck = normalizeNumberDeck(team.numberDeck)
    team.abilities ||= {}
    team.abilities.oneTwoBeat ||= team.spiritSmallBonus ? 1 : 0
    team.abilities.luckyNumber ||= 0
    team.abilities.bigNumber ||= 0
    team.abilities.smallNumber ||= 0
    team.hand = normalizeGrowthCards(team.hand)
    team.nextRoundDouble = false
    team.nextRoundBonus = 0
    team.nextRoundBlocked = 0
    team.roundCorrect ||= 0
    team.spinRights ||= 0
    team.spinRightsRemaining ||= 0
    team.reels = Array.isArray(team.reels)
      ? team.reels.map((card, index) => normalizeNumberCard(card, `reel-${teamIndex}-${index}`))
      : Array(9).fill(null)
    team.hitCells ||= []
    team.lastResult ||= ''
  })
  value.scoreHistory = Array.isArray(value.scoreHistory)
    ? value.scoreHistory.map((entry, index) => ({
        id: entry.id || `score-${nextUid()}-${index}`,
        label: entry.label || `${index}`,
        scores: value.teams.map((_, teamIndex) => Math.max(0, Number(entry.scores?.[teamIndex]) || 0)),
      }))
    : []
  if (!value.scoreHistory.length && value.teams.length) {
    value.scoreHistory.push({
      id: `score-${nextUid()}`,
      label: previousSchemaVersion < 7 ? '移行時点' : '開始',
      scores: value.teams.map(team => Math.max(0, Number(team.vp) || 0)),
    })
  }
}

function isGrowthCard(card) {
  return card?.key !== 'riskReturn'
    && (card?.kind === 'number' || card?.kind === 'upgrade' || card?.kind === 'multiplier')
}

function normalizeGrowthCards(cards) {
  return (cards || [])
    .map(card => {
      if (card?.key === 'riskReturn') {
        return {
          ...card,
          kind: 'upgrade',
          key: 'remove',
          title: 'リムーブ',
          description: '数字カードを1枚除外（最低10枚）',
        }
      }
      if (card?.key === 'oneTwoBeat') {
        return {
          ...card,
          description: '1・2・1/2が3枚出るごとに、レベル分のVPを加算',
        }
      }
      return card
    })
    .filter(isGrowthCard)
}

function normalizeNumberDeck(deck) {
  if (!Array.isArray(deck) || !deck.length) return initialNumberDeck()
  return deck.map((card, index) => normalizeNumberCard(card, `migrated-${index}`)).filter(Boolean)
}

function normalizeNumberCard(card, fallbackId) {
  if (card === null || card === undefined || card === '–') return null
  if (typeof card === 'object' && card.key) {
    card.uid ||= `${fallbackId}-${nextUid()}`
    card.label ||= card.key === 'wild12' ? '1/2' : String(card.value)
    card.bonus ||= 0
    return card
  }
  const value = Number(card)
  if (!Number.isFinite(value)) return null
  return { uid: `${fallbackId}-${nextUid()}`, key: String(value), value, bonus: 0, label: String(value), basic: true }
}

function questionReelSetupItems(reel) {
  return [...new Set(String(reel?.itemsText || '')
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean))]
    .slice(0, 30)
}

function normalizeQuestionReels(reels) {
  const source = Array.isArray(reels) ? reels : DEFAULT_QUESTION_REELS
  return DEFAULT_QUESTION_REELS.map((fallback, index) => {
    const candidate = source[index] || fallback
    const rawItems = Array.isArray(candidate.items) ? candidate.items : fallback.items
    const items = [...new Set(rawItems
      .map(item => String(item || '').trim().slice(0, 30))
      .filter(Boolean))]
      .slice(0, 30)
    return {
      id: fallback.id,
      label: String(candidate.label || '').trim().slice(0, 12) || fallback.label,
      items: items.length ? items : [...fallback.items],
    }
  })
}

function questionReelsToSetup(reels) {
  return normalizeQuestionReels(reels).map(reel => ({
    id: reel.id,
    label: reel.label,
    itemsText: reel.items.join('\n'),
  }))
}

function questionReelsFromSetup() {
  return normalizeQuestionReels(setup.questionReels.map((reel, index) => ({
    id: DEFAULT_QUESTION_REELS[index].id,
    label: reel.label,
    items: questionReelSetupItems(reel),
  })))
}

function normalizeQuestionSlotResult(result, reels) {
  if (!Array.isArray(result) || result.length !== reels.length) return []
  const values = result.map(value => String(value || '').trim().slice(0, 30))
  return values.every((value, index) => value && reels[index].items.includes(value)) ? values : []
}

function resetQuestionReels() {
  setup.questionReels = questionReelsToSetup(DEFAULT_QUESTION_REELS)
}

function normalizeCardCounts(cardCounts) {
  return Object.fromEntries(cardConfigItems.map(item => {
    const value = Number(cardCounts?.[item.key])
    return [item.key, Number.isInteger(value) && value >= 0 && value <= 99 ? value : DEFAULT_CARD_COUNTS[item.key]]
  }))
}

function normalizeAudioVolume(value) {
  const volume = Number(value)
  return Number.isFinite(volume) ? Math.min(300, Math.max(0, Math.round(volume / 10) * 10)) : 100
}

function cardCountTotal(cardCounts) {
  return cardConfigItems.reduce((total, item) => total + (Number(cardCounts?.[item.key]) || 0), 0)
}

function resetCardCounts() {
  Object.assign(setup.cardCounts, DEFAULT_CARD_COUNTS)
}

function saveState() {
  if (state.phase === 'setup' || state.phase === 'rolling') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    hasSave.value = true
  } catch {
    dataError.value = '保存容量が不足しているため、ゲームを自動保存できませんでした。'
  }
}

function snapshot() {
  history.push(JSON.stringify(state))
  if (history.length > 30) history.shift()
}

function clearTransformationDisplay() {
  spinRunId++
  stopReelSound()
  activeTransformation.value = null
  lastTransformations.value = {}
}

function undo() {
  const previous = history.pop()
  if (!previous) return
  clearTransformationDisplay()
  clearQuestionSlotAnimation()
  Object.assign(state, JSON.parse(previous))
  questionSlotDisplay.value = [...(state.questionSlotResult || [])]
  pendingUse.value = null
}

function startGame() {
  setupError.value = ''
  const names = setup.names.slice(0, setup.teamCount).map(name => name.trim())
  const targetVp = Number(setup.targetVp)
  const questionReelsAreValid = setup.questionReels.length === 3 && setup.questionReels.every(reel => (
    Boolean(String(reel.label || '').trim()) && questionReelSetupItems(reel).length > 0
  ))
  const questionReels = questionReelsFromSetup()
  const cardCountsAreValid = cardConfigItems.every(item => {
    if (setup.cardCounts[item.key] === '') return false
    const count = Number(setup.cardCounts[item.key])
    return Number.isInteger(count) && count >= 0 && count <= 99
  })
  const cardCounts = normalizeCardCounts(setup.cardCounts)
  const audioSettings = {
    bgmVolume: normalizeAudioVolume(state.bgmVolume),
    sfxVolume: normalizeAudioVolume(state.sfxVolume),
  }
  if (!Number.isInteger(targetVp) || targetVp < 10 || targetVp > 9999) {
    setupError.value = '勝利VPは10〜9999の整数で入力してください。'
    return
  }
  if (names.some(name => !name)) {
    setupError.value = 'すべてのチーム名を入力してください。'
    return
  }
  if (new Set(names).size !== names.length) {
    setupError.value = 'チーム名はそれぞれ異なる名前にしてください。'
    return
  }
  if (!questionReelsAreValid) {
    setupError.value = '出題内容スロットは、3リールすべてに見出しと1つ以上の候補を入力してください。'
    return
  }
  if (!cardCountsAreValid) {
    setupError.value = 'カード枚数はすべて0〜99の整数で入力してください。'
    return
  }
  const minimumDraftCards = (setup.teamCount + 1) * 3
  if (cardCountTotal(cardCounts) < minimumDraftCards) {
    setupError.value = `共有カードは最初のドラフトに必要な${minimumDraftCards}枚以上にしてください。`
    return
  }

  clearTransformationDisplay()
  clearQuestionSlotAnimation()
  bgmBpm.value = BGM_BASE_BPM
  Object.assign(state, {
    ...emptyState(),
    phase: 'initial-spin',
    targetVp,
    customizeSeconds: setup.customizeSeconds,
    ...audioSettings,
    teams: names.map(makeTeam),
    questionReels,
    questionSlotResult: [],
    cardCounts,
    cardPool: buildCardPool(cardCounts),
    spinOrder: names.map((_, index) => index),
    spinContext: 'initial',
    log: ['ゲームを開始しました。全チームが初回スピンを行います。'],
  })
  appendScoreHistory('開始')
  showScoreChart.value = false
  state.teams.forEach(team => {
    team.spinRights = 1
    team.spinRightsRemaining = 1
  })
  state.activeTeamIndex = state.spinOrder[0]
  state.spinCursor = 0
  state.phase = 'spin-turn'
  history.splice(0)
}

function resumeGame() {
  const value = loadSaved()
  if (value) {
    clearTransformationDisplay()
    clearQuestionSlotAnimation()
    Object.assign(state, value)
    setup.questionReels = questionReelsToSetup(value.questionReels)
    questionSlotDisplay.value = [...value.questionSlotResult]
    bgmBpm.value = targetBgmBpm.value
  }
}

function recordQuestion(teamIndex) {
  if (state.phase !== 'quiz') return
  snapshot()
  state.questionCount++
  if (teamIndex !== null) {
    state.teams[teamIndex].roundCorrect++
    addLog(`Q${state.questionInRound + 1}：${state.teams[teamIndex].name}が正解。`)
  } else {
    state.roundPasses++
    addLog(`Q${state.questionInRound + 1}：スルー。コイン1枚を没収ポットへ。`)
  }
  state.questionInRound++
  if (state.questionInRound >= QUESTIONS_PER_ROUND) prepareRoundSpins()
}

function prepareRoundSpins() {
  state.teams.forEach(team => {
    team.spinRights = team.roundCorrect
    team.spinRightsRemaining = team.spinRights
    team.lastResult = `${team.roundCorrect}問正解 → スロット権${team.spinRights}回`
  })
  state.spinOrder = state.teams
    .map((team, index) => ({ index, vp: team.vp }))
    .sort((left, right) => left.vp - right.vp || left.index - right.index)
    .map(item => item.index)
  state.spinCursor = -1
  state.spinContext = 'round'
  advanceSpinTeam()
}

function advanceSpinTeam() {
  state.spinCursor++
  while (state.spinCursor < state.spinOrder.length) {
    const teamIndex = state.spinOrder[state.spinCursor]
    if (state.teams[teamIndex].spinRightsRemaining > 0) {
      state.activeTeamIndex = teamIndex
      state.phase = 'spin-turn'
      return
    }
    state.spinCursor++
  }
  finishSpinPhase()
}

async function spinOnce(index) {
  if (state.phase !== 'spin-turn' || index !== state.activeTeamIndex) return
  snapshot()
  playSpinStartSfx()
  startReelSound()
  const team = state.teams[index]
  const finalReels = drawReels(team)
  const runId = ++spinRunId
  state.phase = 'rolling'
  rollingTeamIndex.value = index
  stoppedColumns.value = []
  activeTransformation.value = null
  lastTransformations.value = { ...lastTransformations.value, [index]: [] }
  team.hitCells = []
  team.lastResult = 'リール回転中…'
  await animateReels(team, finalReels, runId)
  if (runId !== spinRunId) {
    stopReelSound()
    return
  }

  stopReelSound()
  const result = calculateSpin(team, finalReels)
  await animateTransformations(team, index, result.transformations, runId)
  if (runId !== spinRunId) {
    activeTransformation.value = null
    return
  }
  lastTransformations.value = {
    ...lastTransformations.value,
    [index]: collapseTransformations(result.transformations),
  }
  team.reels = result.reels
  team.hitCells = result.hitCells
  team.vp += result.points
  team.spinRightsRemaining--
  const spinNumber = team.spinRights - team.spinRightsRemaining
  const scoreLabel = state.spinContext === 'initial' ? `初回 T${index + 1}` : `R${state.roundNumber} T${index + 1}-${spinNumber}`
  appendScoreHistory(scoreLabel)
  team.lastResult = result.message
  addLog(`${team.name}がスピンし、${result.points}VPを獲得。`)
  if (result.points > 0) playWinSfx(result.points, result.hitCount, result.sevenHitCount)
  else playMissSfx()
  rollingTeamIndex.value = null
  stoppedColumns.value = []
  activeTransformation.value = null
  state.phase = 'spin-result'
}

function continueSpin() {
  const team = state.teams[state.activeTeamIndex]
  if (team.spinRightsRemaining > 0) {
    state.phase = 'spin-turn'
    return
  }
  advanceSpinTeam()
}

function finishSpinPhase() {
  state.activeTeamIndex = null
  const reached = state.teams.some(team => team.vp >= state.targetVp)
  if (reached && state.spinContext === 'round') {
    state.phase = 'finished'
    addLog('規定VPに到達したチームが出たためゲーム終了。')
    playWinnerFanfare()
    return
  }
  if (state.spinContext === 'initial') {
    beginDraft()
    return
  }
  beginDraft()
}

function beginQuestionSlotRound() {
  clearQuestionSlotAnimation()
  state.roundNumber++
  state.questionInRound = 0
  state.roundPasses = 0
  state.questionSlotResult = []
  questionSlotDisplay.value = []
  state.activeTeamIndex = null
  state.spinContext = null
  state.teams.forEach(team => {
    team.roundCorrect = 0
    team.spinRights = 0
    team.spinRightsRemaining = 0
  })
  state.phase = 'question-slot'
  addLog(`ラウンド${state.roundNumber}の出題内容スロットを開始。`)
}

async function spinQuestionSlot() {
  if (state.phase !== 'question-slot' || questionSlotSpinning.value) return
  snapshot()
  const finalValues = state.questionReels.map(reel => reel.items[Math.floor(Math.random() * reel.items.length)])
  const runId = ++questionSlotRunId
  state.questionSlotResult = []
  questionSlotDisplay.value = state.questionReels.map(reel => reel.items[0] || '？')
  questionSlotSpinning.value = true
  playSpinStartSfx()
  startReelSound()
  questionSlotTimers = state.questionReels.map((reel, index) => window.setInterval(() => {
    const items = reel.items
    questionSlotDisplay.value[index] = items[Math.floor(Math.random() * items.length)] || '？'
  }, 65 + index * 18))

  for (let index = 0; index < state.questionReels.length; index++) {
    await wait(index === 0 ? 700 : 420)
    if (runId !== questionSlotRunId) return
    window.clearInterval(questionSlotTimers[index])
    questionSlotDisplay.value[index] = finalValues[index]
    playReelStopSfx(index)
  }

  stopQuestionSlotTimers()
  stopReelSound()
  if (runId !== questionSlotRunId) return
  state.questionSlotResult = finalValues
  questionSlotSpinning.value = false
  addLog(`出題内容：${state.questionReels.map((reel, index) => `${reel.label}「${finalValues[index]}」`).join('／')}`)
}

function confirmQuestionSlot() {
  if (state.phase !== 'question-slot' || questionSlotSpinning.value || !hasQuestionSlotResult.value) return
  snapshot()
  state.phase = 'quiz'
  addLog(`ラウンド${state.roundNumber}のクイズ10問を開始（${state.questionSlotResult.join('／')}）。`)
}

function stopQuestionSlotTimers() {
  questionSlotTimers.forEach(timer => window.clearInterval(timer))
  questionSlotTimers = []
}

function clearQuestionSlotAnimation() {
  questionSlotRunId++
  stopQuestionSlotTimers()
  questionSlotSpinning.value = false
  questionSlotDisplay.value = [...(state.questionSlotResult || [])]
}

function beginDraft() {
  const requiredCards = (state.teams.length + 1) * 3
  ensureCardPool(requiredCards)
  state.marketSets = Array.from({ length: state.teams.length + 1 }, (_, setIndex) => ({
    id: `set-${nextUid()}`,
    label: String.fromCharCode(65 + setIndex),
    cards: Array.from({ length: 3 }, () => state.cardPool.pop()).filter(Boolean),
  }))
  state.draftOrder = state.teams
    .map((team, index) => ({ index, vp: team.vp, correct: team.roundCorrect }))
    .sort((left, right) => left.vp - right.vp || left.correct - right.correct || left.index - right.index)
    .map(item => item.index)
  state.draftCursor = 0
  state.phase = 'draft'
  addLog('低VP順のカードセット選択を開始。')
}

function ensureCardPool(required) {
  if (state.cardPool.length >= required) return
  state.cardPool.push(...shuffled(state.discardPile.splice(0)))
  state.cardPool = shuffled(state.cardPool)
}

function chooseCardSet(setId) {
  const setIndex = state.marketSets.findIndex(set => set.id === setId)
  const teamIndex = state.draftOrder[state.draftCursor]
  if (setIndex < 0 || teamIndex === undefined) return
  snapshot()
  const [set] = state.marketSets.splice(setIndex, 1)
  state.teams[teamIndex].hand.push(...set.cards)
  addLog(`${state.teams[teamIndex].name}がセット${set.label}を獲得。`)
  state.draftCursor++
  if (state.draftCursor >= state.draftOrder.length) {
    state.marketSets.forEach(setItem => state.discardPile.push(...setItem.cards))
    state.marketSets = []
    beginCustomize()
  }
}

function beginCustomize() {
  customizeRemaining.value = state.customizeSeconds
  state.phase = 'customize'
  addLog(`改造フェイズを開始（${state.customizeSeconds}秒）。`)
}

function startCustomizeTimer() {
  stopCustomizeTimer()
  if (customizeRemaining.value <= 0 || customizeRemaining.value > state.customizeSeconds) {
    customizeRemaining.value = state.customizeSeconds
  }
  customizeTimer = window.setInterval(() => {
    if (customizeRemaining.value > 0) {
      customizeRemaining.value--
      if (customizeRemaining.value === 0) {
        stopCustomizeTimer()
      }
    } else stopCustomizeTimer()
  }, 1000)
}

function stopCustomizeTimer() {
  if (customizeTimer) window.clearInterval(customizeTimer)
  customizeTimer = null
}

function finishCustomize() {
  if (!window.confirm('改造フェイズを終了して、次の出題内容スロットへ進みますか？')) return
  snapshot()
  pendingUse.value = null
  beginQuestionSlotRound()
}

function useCard(teamIndex, cardUid) {
  if (state.phase !== 'customize') return
  const team = state.teams[teamIndex]
  const card = team.hand.find(item => item.uid === cardUid)
  if (!card) return

  if (card.kind === 'number') {
    snapshot()
    team.numberDeck.push({ ...card.numberCard, uid: `number-${nextUid()}`, basic: false })
    consumeHandCard(team, cardUid)
    team.lastResult = `${card.title}を数字山札へ追加`
    return
  }

  if (card.kind === 'multiplier') {
    const ranges = { horizontal: [0, 1, 2], vertical: [3, 4, 5], diagonal: [6, 7] }
    pendingUse.value = { mode: 'line', teamIndex, cardUid, card, validLines: ranges[card.orientation] }
    return
  }

  if (card.key === 'remove' || card.key === 'doubleRemove') {
    if (team.numberDeck.length <= 10) {
      dataError.value = '数字山札は10枚未満にできません。'
      return
    }
    const removeLimit = card.key === 'doubleRemove' ? 2 : 1
    pendingUse.value = {
      mode: 'remove',
      teamIndex,
      cardUid,
      card,
      remaining: Math.min(removeLimit, team.numberDeck.length - 10),
      removed: 0,
    }
    return
  }

  snapshot()
  team.abilities[card.key] = (team.abilities[card.key] || 0) + 1
  consumeHandCard(team, cardUid)
  team.lastResult = `${card.title}をマシンへ装着`
}

function applyMultiplier(lineIndex) {
  const use = pendingUse.value
  if (!use || state.phase !== 'customize') return
  snapshot()
  const team = state.teams[use.teamIndex]
  team.lineMultipliers[lineIndex] += use.card.amount
  consumeHandCard(team, use.cardUid)
  team.lastResult = `${LINE_NAMES[lineIndex]}を×${team.lineMultipliers[lineIndex]}へ強化`
  pendingUse.value = null
}

function applyRemove(numberUid) {
  const use = pendingUse.value
  if (!use || state.phase !== 'customize') return
  const team = state.teams[use.teamIndex]
  if (team.numberDeck.length <= 10) return
  const cardIndex = team.numberDeck.findIndex(card => card.uid === numberUid)
  if (cardIndex < 0) return
  if (use.removed === 0) snapshot()
  team.numberDeck.splice(cardIndex, 1)
  use.removed++
  use.remaining--
  if (use.remaining > 0 && team.numberDeck.length > 10) {
    team.lastResult = `${use.card.title}：${use.removed}枚目をリムーブ`
    return
  }
  consumeHandCard(team, use.cardUid)
  team.lastResult = `数字カードを${use.removed}枚リムーブ`
  pendingUse.value = null
}

function consumeHandCard(team, cardUid) {
  const index = team.hand.findIndex(card => card.uid === cardUid)
  if (index >= 0) team.hand.splice(index, 1)
}

function drawReels(team) {
  return shuffled(team.numberDeck).slice(0, 9).map(card => ({ ...card }))
}

function randomDeckCard(team) {
  const card = team.numberDeck[Math.floor(Math.random() * team.numberDeck.length)]
  return card ? { ...card } : null
}

async function animateReels(team, finalReels, runId) {
  stoppedColumns.value = []
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    team.reels = finalReels
    await wait(100)
    playReelStopSfx(2)
    return
  }
  const interval = window.setInterval(() => {
    if (runId !== spinRunId) return
    team.reels = team.reels.map((value, cellIndex) =>
      stoppedColumns.value.includes(cellIndex % 3) ? value : randomDeckCard(team)
    )
  }, 70)
  for (const column of [0, 1, 2]) {
    await wait(column === 0 ? 700 : 480)
    if (runId !== spinRunId) {
      window.clearInterval(interval)
      return
    }
    team.reels = team.reels.map((value, cellIndex) =>
      cellIndex % 3 === column ? finalReels[cellIndex] : value
    )
    stoppedColumns.value = [...stoppedColumns.value, column]
    playReelStopSfx(column)
  }
  window.clearInterval(interval)
  await wait(200)
}

async function animateTransformations(team, teamIndex, transformations, runId) {
  if (!transformations.length) return
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const chargeDelay = reducedMotion ? 180 : 420
  const revealDelay = reducedMotion ? 180 : 720
  for (const change of transformations) {
    if (runId !== spinRunId) return
    activeTransformation.value = { ...change, teamIndex, applied: false }
    team.lastResult = `${change.icon} ${change.label}発動：${change.beforeLabel} → ${change.afterLabel}`
    playTransformationSfx(change.abilityKey)
    await wait(chargeDelay)
    if (runId !== spinRunId) return
    team.reels = team.reels.map((card, cellIndex) => cellIndex === change.cellIndex ? { ...change.afterCard } : card)
    activeTransformation.value = { ...change, teamIndex, applied: true }
    await wait(revealDelay)
  }
}

function collapseTransformations(transformations) {
  const byCell = new Map()
  transformations.forEach(change => {
    const previous = byCell.get(change.cellIndex)
    byCell.set(change.cellIndex, previous
      ? { ...change, beforeLabel: previous.beforeLabel }
      : { ...change })
  })
  return [...byCell.values()]
}

function calculateSpin(team, originalReels) {
  const originalBonus = originalReels.reduce((sum, card) => sum + (card?.bonus || 0), 0)
  let reels = originalReels.map(card => ({ ...card }))
  const notes = []
  const transformations = []

  reels = applyBestConversions(team, reels, 'luckyNumber', [7], notes, 'ラッキー7', transformations)
  reels = applyBestConversions(team, reels, 'bigNumber', [1], notes, '+1', transformations)
  reels = applyBestConversions(team, reels, 'smallNumber', [-1, -2], notes, '-1/-2', transformations)

  const lineResult = scoreReels(team, reels)
  const oneTwoCount = originalReels.filter(card => card?.key === 'wild12' || card?.value === 1 || card?.value === 2).length
  const oneTwoBonus = Math.floor(oneTwoCount / 3) * (team.abilities.oneTwoBeat || 0)
  const points = lineResult.points + originalBonus + oneTwoBonus

  if (originalBonus) notes.push(`出現+${originalBonus}`)
  if (oneTwoBonus) notes.push(`ワンツー+${oneTwoBonus}`)
  const lineText = lineResult.hitCount ? `${lineResult.hitCount}ライン` : 'ラインなし'
  const noteText = notes.length ? `（${notes.join('、')}）` : ''
  return {
    points,
    hitCount: lineResult.hitCount,
    sevenHitCount: lineResult.sevenHitCount,
    reels,
    hitCells: lineResult.hitCells,
    transformations,
    message: `${lineText}・合計+${points}VP${noteText}`,
  }
}

function applyBestConversions(team, sourceReels, abilityKey, deltas, notes, label, transformations) {
  let reels = sourceReels.map(card => ({ ...card }))
  const count = team.abilities[abilityKey] || 0
  for (let useIndex = 0; useIndex < count; useIndex++) {
    const current = scoreReels(team, reels).points
    let best = { points: current, reels, cellIndex: null, beforeCard: null, afterCard: null }
    reels.forEach((card, cardIndex) => {
      const baseValue = card.key === 'wild12' ? 2 : card.value
      deltas.forEach(deltaOrValue => {
        const value = abilityKey === 'luckyNumber' ? deltaOrValue : baseValue + deltaOrValue
        if (value < 1 || value > 7) return
        const candidate = reels.map((item, index) => index === cardIndex
          ? { ...item, key: String(value), value, label: String(value) }
          : { ...item })
        const points = scoreReels(team, candidate).points
        if (points > best.points) {
          best = {
            points,
            reels: candidate,
            cellIndex: cardIndex,
            beforeCard: { ...card },
            afterCard: { ...candidate[cardIndex] },
          }
        }
      })
    })
    if (best.points > current) {
      reels = best.reels
      notes.push(label)
      const meta = TRANSFORM_ABILITY_META[abilityKey]
      transformations.push({
        abilityKey,
        icon: meta.icon,
        label: meta.label,
        cellIndex: best.cellIndex,
        beforeLabel: numberCardLabel(best.beforeCard),
        afterLabel: numberCardLabel(best.afterCard),
        afterCard: best.afterCard,
      })
    }
  }
  return reels
}

function scoreReels(team, reels) {
  let points = 0
  let hitCount = 0
  const hitCells = []
  const hitValues = []
  LINES.forEach((line, lineIndex) => {
    const multiplier = team.lineMultipliers[lineIndex]
    if (!multiplier) return
    const cards = line.map(cellIndex => reels[cellIndex])
    const value = matchingValue(cards)
    if (value !== null) {
      points += value * multiplier
      hitCount++
      hitValues.push(value)
      hitCells.push(...line)
    }
  })
  return {
    points,
    hitCount,
    sevenHitCount: hitValues.filter(value => value === 7).length,
    hitCells: [...new Set(hitCells)],
  }
}

function matchingValue(cards) {
  const wildCount = cards.filter(card => card?.key === 'wild12').length
  const fixedValues = cards.filter(card => card?.key !== 'wild12').map(card => card?.value)
  if (fixedValues.length && !fixedValues.every(value => value === fixedValues[0])) return null
  if (!wildCount) return fixedValues[0] ?? null
  if (!fixedValues.length) return 2
  return fixedValues[0] === 1 || fixedValues[0] === 2 ? fixedValues[0] : null
}

function shuffled(values) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function numberCardLabel(card) {
  return card?.label || '–'
}

function deckEntries(team) {
  const order = ['1', 'wild12', '2', '3', '3p1', '3p2', '4', '5', '6', '7']
  const entries = new Map()
  team.numberDeck.forEach(card => {
    const key = card.key || String(card.value)
    const current = entries.get(key)
    if (current) {
      current.count++
      return
    }
    entries.set(key, {
      key,
      label: numberCardLabel(card),
      count: 1,
      tone: card.bonus >= 2 ? 'bonus-two' : card.bonus > 0 ? 'bonus-one' : card.key === 'wild12' ? 'wild' : 'base',
    })
  })
  return [...entries.values()].sort((left, right) => {
    const leftOrder = order.indexOf(left.key)
    const rightOrder = order.indexOf(right.key)
    return (leftOrder < 0 ? order.length : leftOrder) - (rightOrder < 0 ? order.length : rightOrder)
  })
}

function abilityBadges(team) {
  const abilities = team.abilities || {}
  const badges = [
    {
      key: 'oneTwoBeat',
      icon: '1·2',
      label: 'ワンツー',
      effect: `3枚ごと+${abilities.oneTwoBeat || 0}VP`,
      title: '1・2・1/2が3枚出るごとに、レベルと同じVPを獲得',
    },
    {
      key: 'luckyNumber',
      icon: '🍀7',
      label: 'ラッキー',
      effect: `自動7化 ${abilities.luckyNumber || 0}回`,
      title: '得点が増える場合、レベル回数ぶん盤面を自動で7へ変更',
    },
    {
      key: 'bigNumber',
      icon: '⬆+1',
      label: 'ビッグ',
      effect: `自動+1 ${abilities.bigNumber || 0}回`,
      title: '得点が増える場合、レベル回数ぶん盤面を自動で+1',
    },
    {
      key: 'smallNumber',
      icon: '⬇−',
      label: 'スモール',
      effect: `自動−1/−2 ${abilities.smallNumber || 0}回`,
      title: '得点が増える場合、レベル回数ぶん盤面を自動で-1または-2',
    },
  ]
  return badges
    .map(badge => ({ ...badge, level: abilities[badge.key] || 0 }))
    .filter(badge => badge.level > 0)
}

function enabledLineCount(team) {
  return team.lineMultipliers.filter(multiplier => multiplier > 0).length
}

function cardKindLabel(card) {
  return { number: 'ナンバー', upgrade: '強化', multiplier: '倍率' }[card?.kind] || 'カード'
}

function cellTransformation(teamIndex, reelIndex) {
  if (activeTransformation.value?.teamIndex === teamIndex && activeTransformation.value?.cellIndex === reelIndex) {
    return activeTransformation.value
  }
  return lastTransformations.value[teamIndex]?.find(change => change.cellIndex === reelIndex) || null
}

function isTransformingCell(teamIndex, reelIndex) {
  return activeTransformation.value?.teamIndex === teamIndex && activeTransformation.value?.cellIndex === reelIndex
}

function transformationClass(teamIndex, reelIndex) {
  const change = cellTransformation(teamIndex, reelIndex)
  return change ? `transform--${change.abilityKey}` : ''
}

function isCellRolling(teamIndex, reelIndex) {
  return state.phase === 'rolling'
    && rollingTeamIndex.value === teamIndex
    && !stoppedColumns.value.includes(reelIndex % 3)
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function ensureAudioContext() {
  if (audioContext && audioContext.state !== 'closed') return audioContext
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) {
    dataError.value = 'このブラウザはBGM・SE再生に対応していません。'
    return null
  }
  audioContext = new AudioContextClass()
  return audioContext
}

function scaledAudioVolume(volume, channel = 'sfx') {
  const setting = channel === 'bgm' ? state.bgmVolume : state.sfxVolume
  return Math.min(0.35, Math.max(0, volume * normalizeAudioVolume(setting) / 100))
}

function playTone(frequency, duration = 0.12, type = 'sine', volume = 0.025, delay = 0, channel = 'sfx') {
  const context = ensureAudioContext()
  if (!context) return
  if (context.state === 'suspended') context.resume().catch(() => {})
  const startAt = context.currentTime + delay
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, scaledAudioVolume(volume, channel)), startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
}

function previewAudio(channel) {
  if (channel === 'sfx' && !sfxEnabled.value) return
  playTone(channel === 'bgm' ? 659 : 880, 0.1, 'sine', 0.025, 0, channel)
}

async function toggleBgm() {
  if (bgmPlaying.value) {
    stopBgm()
    return
  }
  const context = ensureAudioContext()
  if (!context) return
  try {
    await context.resume()
    bgmPlaying.value = true
    bgmStep = 0
    playBgmStep()
  } catch {
    dataError.value = 'BGMを開始できませんでした。もう一度BGMボタンを押してください。'
  }
}

function stopBgm() {
  if (bgmTimer) window.clearTimeout(bgmTimer)
  bgmTimer = null
  bgmPlaying.value = false
}

function playBgmStep() {
  if (!bgmPlaying.value) return
  bgmTimer = null
  const bpmDifference = targetBgmBpm.value - bgmBpm.value
  if (Math.abs(bpmDifference) > 0.01) {
    bgmBpm.value += Math.sign(bpmDifference) * Math.min(Math.abs(bpmDifference), 0.45)
  } else {
    bgmBpm.value = targetBgmBpm.value
  }
  const melody = [659, 784, 880, 784, 659, 784, 988, 880, 698, 831, 988, 831, 698, 831, 1047, 988]
  const bass = [131, 131, 165, 165, 175, 175, 196, 196]
  const note = melody[bgmStep % melody.length]
  playTone(note, 0.18, 'square', 0.016, 0, 'bgm')
  if (bgmStep % 2 === 0) playTone(bass[Math.floor(bgmStep / 2) % bass.length], 0.32, 'triangle', 0.022, 0, 'bgm')
  if (bgmStep % 4 === 3) playTone(note * 2, 0.05, 'sine', 0.009, 0, 'bgm')
  bgmStep++
  const stepMilliseconds = 60000 / (bgmBpm.value * 2)
  bgmTimer = window.setTimeout(playBgmStep, stepMilliseconds)
}

function toggleSfx() {
  sfxEnabled.value = !sfxEnabled.value
  if (!sfxEnabled.value) {
    stopReelSound()
    return
  }
  playTone(880, 0.08, 'sine', 0.025)
}

function playSpinStartSfx() {
  if (!sfxEnabled.value) return
  const context = ensureAudioContext()
  if (!context) return
  if (context.state === 'suspended') context.resume().catch(() => {})
  const now = context.currentTime
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sawtooth'
  oscillator.frequency.setValueAtTime(110, now)
  oscillator.frequency.exponentialRampToValueAtTime(420, now + 0.32)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, scaledAudioVolume(0.035, 'sfx')), now + 0.03)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + 0.36)
}

function startReelSound() {
  stopReelSound()
  if (!sfxEnabled.value) return
  reelSoundStep = 0
  reelSoundTimer = window.setInterval(() => {
    playTone(170 + (reelSoundStep % 6) * 18, 0.055, 'square', 0.009)
    reelSoundStep++
  }, 95)
}

function stopReelSound() {
  if (reelSoundTimer) window.clearInterval(reelSoundTimer)
  reelSoundTimer = null
}

function playReelStopSfx(column) {
  if (!sfxEnabled.value) return
  playTone([440, 554, 659][column] || 659, 0.14, 'square', 0.035)
  playTone([880, 1108, 1318][column] || 1318, 0.09, 'sine', 0.018, 0.025)
}

function playTransformationSfx(abilityKey) {
  if (!sfxEnabled.value) return
  const notes = {
    luckyNumber: [659, 988, 1318],
    bigNumber: [440, 554, 740],
    smallNumber: [659, 494, 370],
  }[abilityKey] || [523, 659, 784]
  notes.forEach((frequency, index) => playTone(frequency, 0.16, index === 1 ? 'triangle' : 'sine', 0.026, index * 0.1))
}

function playMissSfx() {
  if (!sfxEnabled.value) return
  playTone(294, 0.14, 'triangle', 0.025)
  playTone(220, 0.22, 'triangle', 0.024, 0.12)
}

function playWinSfx(points, hitCount, sevenHitCount = 0) {
  if (!sfxEnabled.value) return
  const notes = hitCount >= 2 || points >= 10
    ? [523, 659, 784, 1047, 1319]
    : [523, 659, 784, 1047]
  notes.forEach((note, index) => playTone(note, index === notes.length - 1 ? 0.36 : 0.14, 'square', 0.035, index * 0.09))
  if (hitCount > 0) playTone(262, 0.5, 'triangle', 0.028, 0.02)
  if (sevenHitCount > 0) playSevenJackpotSfx(sevenHitCount)
}

function playSevenJackpotSfx(sevenHitCount) {
  if (!sfxEnabled.value) return
  const sparkle = [784, 988, 1175, 1568, 1976, 2350]
  sparkle.forEach((note, index) => playTone(note, index === sparkle.length - 1 ? 0.55 : 0.18, index % 2 ? 'sine' : 'square', 0.032, 0.16 + index * 0.075))
  playTone(196, 0.75, 'sawtooth', 0.035, 0.1)
  playTone(392, 0.55, 'triangle', 0.032, 0.28)
  if (sevenHitCount >= 2) {
    ;[1047, 1319, 1568].forEach(note => playTone(note, 0.7, 'square', 0.028, 0.68))
  }
}

function playWinnerFanfare() {
  if (!sfxEnabled.value || normalizeAudioVolume(state.sfxVolume) === 0) return
  if (bgmPlaying.value) stopBgm()
  const melody = [523, 659, 784, 1047, 784, 1047, 1319]
  const delays = [0, 0.16, 0.32, 0.54, 0.78, 0.98, 1.22]
  melody.forEach((note, index) => playTone(note, index === melody.length - 1 ? 0.95 : 0.22, index % 2 ? 'triangle' : 'square', 0.04, delays[index]))
  playTone(131, 1.65, 'sawtooth', 0.035, 0)
  playTone(196, 1.3, 'triangle', 0.032, 0.32)
  ;[1047, 1319, 1568].forEach(note => playTone(note, 1.05, 'square', 0.032, 1.22))
  ;[2093, 2637, 3136].forEach((note, index) => playTone(note, 0.38, 'sine', 0.025, 1.38 + index * 0.08))
}

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds))
}

function addLog(message) {
  state.log.unshift(`R${state.roundNumber} ${message}`)
  state.log = state.log.slice(0, 100)
}

function appendScoreHistory(label) {
  state.scoreHistory.push({
    id: `score-${nextUid()}`,
    label,
    scores: state.teams.map(team => Math.max(0, Number(team.vp) || 0)),
  })
}

function confirmReset() {
  if (!window.confirm('現在のゲームを終了して、新しい対戦設定へ戻りますか？')) return
  const audioSettings = {
    bgmVolume: normalizeAudioVolume(state.bgmVolume),
    sfxVolume: normalizeAudioVolume(state.sfxVolume),
  }
  setup.questionReels = questionReelsToSetup(state.questionReels)
  clearTransformationDisplay()
  clearQuestionSlotAnimation()
  bgmBpm.value = BGM_BASE_BPM
  localStorage.removeItem(STORAGE_KEY)
  history.splice(0)
  pendingUse.value = null
  showScoreChart.value = false
  Object.assign(state, emptyState(), audioSettings)
  hasSave.value = false
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify({ app: 'custom-slot-millionaire', version: 8, state }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `custom-slot-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function restoreBackup(event) {
  dataError.value = ''
  try {
    const json = JSON.parse(await event.target.files?.[0]?.text())
    if (json?.app !== 'custom-slot-millionaire' || !Array.isArray(json?.state?.teams)) throw new Error()
    snapshot()
    migrateState(json.state)
    clearTransformationDisplay()
    clearQuestionSlotAnimation()
    Object.assign(state, json.state)
    setup.questionReels = questionReelsToSetup(json.state.questionReels)
    questionSlotDisplay.value = [...json.state.questionSlotResult]
  } catch {
    dataError.value = 'このファイルは復元できません。正しいバックアップJSONを選んでください。'
  } finally {
    event.target.value = ''
  }
}

onMounted(() => {
  if (state.phase !== 'setup') bgmBpm.value = targetBgmBpm.value
  window.addEventListener('keydown', handleSpinShortcut)
  window.addEventListener('custom-slot-spin', triggerSpinAction)
  window.addEventListener('gamepadconnected', startGamepadPolling)
  if ([...(navigator.getGamepads?.() || [])].some(Boolean)) startGamepadPolling()
})

onUnmounted(() => {
  spinRunId++
  clearQuestionSlotAnimation()
  window.removeEventListener('keydown', handleSpinShortcut)
  window.removeEventListener('custom-slot-spin', triggerSpinAction)
  window.removeEventListener('gamepadconnected', startGamepadPolling)
  if (gamepadAnimationFrame !== null) window.cancelAnimationFrame(gamepadAnimationFrame)
  gamepadAnimationFrame = null
  gamepadButtonStates.clear()
  stopCustomizeTimer()
  stopReelSound()
  stopBgm()
  if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(() => {})
})
</script>

<style scoped>
.slot-game { min-height: 100vh; padding: 12px 16px; background: radial-gradient(circle at top, #4a2d06, #100d09 55%); color: #fffdf4; }
.slot-header { max-width: 1320px; margin: 0 auto 8px; display: grid; grid-template-columns: 92px 1fr auto; align-items: center; gap: 10px; text-align: center; }
.slot-header h1 { margin: 0; font-size: clamp(1.25rem, 3vw, 1.75rem); color: #ffd54f; line-height: 1.15; }
.slot-header button { min-height: 38px; padding: 7px 10px; }
.header-actions { display: flex; justify-content: flex-end; align-items: center; flex-wrap: wrap; gap: 6px; }
.audio-control { display: flex; align-items: center; gap: 5px; padding-right: 5px; border: 1px solid #55483e; border-radius: 9px; background: #18130f; }
.audio-control label { display: flex; align-items: center; gap: 4px; }
.audio-control input[type="range"] { width: 76px; accent-color: #ffd54f; cursor: pointer; }
.audio-control output { min-width: 39px; color: #ffe082; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .68rem; font-weight: 900; text-align: right; }
.bgm-button, .sfx-button { min-width: 92px; background: #2b2119; font-weight: 800; }
.bgm-button span, .bgm-button small { display: block; }
.bgm-button small { margin-top: 1px; color: #ffe082; font-size: .58rem; letter-spacing: .06em; }
.bgm-button.playing, .sfx-button.playing { border-color: #ffd54f; background: #5d3a00; color: #fff3b0; box-shadow: 0 0 12px rgba(255,193,7,.22); }
.eyebrow, .quiz-kicker { margin: 0; color: #e0d0c5; font-size: .7rem; font-weight: 800; letter-spacing: .16em; }
.panel { max-width: 960px; margin: 14px auto; padding: 20px; border: 2px solid rgba(255,193,7,.35); border-radius: 16px; background: rgba(20,16,10,.94); }
.game-toolbar { max-width: 1320px; margin: 0 auto 10px; display: grid; grid-template-columns: minmax(260px, .75fr) minmax(620px, 1.8fr); gap: 10px; align-items: stretch; }
.next-action { display: grid; align-content: center; margin: 0; padding: 9px 14px; border: 2px solid #ffd54f; border-radius: 12px; background: linear-gradient(135deg, #7a3e00, #3b2100); text-align: left; box-shadow: 0 4px 16px rgba(0,0,0,.28); }
.next-action span { display: block; color: #ffe0a3; font-size: .68rem; font-weight: 900; letter-spacing: .14em; }
.next-action strong { display: block; margin-top: 2px; color: #fff; font-size: clamp(1rem, 2vw, 1.25rem); line-height: 1.25; }
.guide { line-height: 1.8; }
.card-count-help { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; padding: 12px; border: 1px solid #665128; border-radius: 10px; background: #1c1710; }
.card-count-help > strong { width: 100%; color: #ffd54f; }
.card-count-help span { padding: 4px 8px; border-radius: 99px; background: #33281e; color: #e8ddd5; font-size: .78rem; }
.card-count-help b { color: #fff; }
.setup { max-width: 960px; display: grid; gap: 14px; }
.setup h2, .quiz-console h2, .draft h2, .customize h2 { margin: 0; color: #ffd54f; }
.choice-row, .setup-actions, .data-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.target-vp-field { display: grid; gap: 5px; color: #bcaaa4; }
.target-vp-input { display: flex; align-items: center; gap: 8px; }
.target-vp-input input { width: min(220px, 100%); padding: 11px 12px; border: 2px solid #7a5a24; border-radius: 8px; background: #1d1712; color: #fff; font-size: 1.15rem; font-weight: 900; }
.target-vp-input input:focus { outline: 3px solid rgba(255,193,7,.3); border-color: #ffd54f; }
.target-vp-input b { color: #ffd54f; }
.target-vp-field small { color: #a99588; }
button, .file-button { min-height: 44px; border: 1px solid rgba(255,255,255,.28); border-radius: 9px; padding: 10px 14px; background: rgba(255,255,255,.1); color: #fff; cursor: pointer; font-family: inherit; }
button:hover:not(:disabled), .file-button:hover { border-color: #ffd54f; }
button:disabled { opacity: .35; cursor: not-allowed; }
button.selected, .primary { background: #e65100; border-color: #ffb300; font-weight: 800; }
.secondary, .ghost-button { background: transparent; }
.team-inputs { display: grid; gap: 10px; }
.team-inputs label { display: grid; gap: 5px; color: #bcaaa4; }
.team-inputs input { padding: 11px; border: 1px solid #5d4037; border-radius: 8px; background: #1d1712; color: #fff; font-size: 1rem; }
.question-slot-config { padding: 12px; border: 1px solid #7a5a24; border-radius: 10px; background: #18130f; }
.question-slot-config summary { display: flex; justify-content: space-between; gap: 12px; color: #ffd54f; cursor: pointer; font-weight: 900; }
.question-slot-config > p { color: #bcaaa4; font-size: .82rem; }
.question-reel-configs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.question-reel-config { min-width: 0; display: grid; gap: 8px; padding: 10px; border: 1px solid #51443b; border-radius: 10px; background: #251d17; }
.question-reel-config label { min-width: 0; display: grid; gap: 5px; color: #e5d5ca; font-size: .78rem; font-weight: 800; }
.question-reel-config input, .question-reel-config textarea { width: 100%; box-sizing: border-box; padding: 9px; border: 1px solid #806a5d; border-radius: 7px; background: #100d0b; color: #fff; font: inherit; }
.question-reel-config textarea { resize: vertical; line-height: 1.5; }
.question-reel-config small { color: #ffd180; font-weight: 800; }
.question-slot-config__actions { margin-top: 10px; }
.card-config { padding: 12px; border: 1px solid #5d4037; border-radius: 10px; background: #18130f; }
.card-config summary { display: flex; justify-content: space-between; gap: 12px; color: #ffd54f; cursor: pointer; font-weight: 900; }
.card-config > p { color: #bcaaa4; font-size: .8rem; }
.card-config__group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin: 12px 0; }
.card-config__group h3 { grid-column: 1 / -1; margin: 0; color: #e6d7cf; font-size: .82rem; }
.card-config__group label { min-width: 0; display: flex; justify-content: space-between; align-items: center; gap: 6px; padding: 7px 8px; border-radius: 8px; background: #29211b; color: #f0e6df; font-size: .78rem; }
.card-count-input { display: inline-flex; align-items: center; gap: 4px; }
.card-count-input input { width: 56px; padding: 7px 5px; border: 1px solid #806a5d; border-radius: 6px; background: #100d0b; color: #fff; font-weight: 900; text-align: right; }
.card-count-input b { color: #cdbdb3; font-size: .7rem; }
.status { max-width: none; margin: 0; padding: 9px 12px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 7px; }
.status div { min-width: 76px; display: grid; padding: 4px 8px; border-radius: 8px; background: #2b211b; text-align: center; }
.status span { color: #d7c5b9; font-size: .67rem; font-weight: 700; }
.status strong { color: #fff; font-size: .94rem; }
.status button { min-height: 38px; padding: 7px 10px; }
.credit-bank { --credit-columns: 3; max-width: 1180px; margin: 0 auto 10px; display: grid; grid-template-columns: repeat(var(--credit-columns), minmax(0, 1fr)); gap: 8px; padding: 9px; border-color: #72551c; background: linear-gradient(180deg, rgba(38,28,12,.96), rgba(17,14,10,.96)); }
.credit-team { min-width: 0; padding: 8px 10px; border: 2px solid #514538; border-radius: 11px; background: #15110c; transition: border-color .2s, box-shadow .2s; }
.credit-team.active { border-color: var(--team); box-shadow: inset 0 0 15px color-mix(in srgb, var(--team) 15%, transparent), 0 0 10px color-mix(in srgb, var(--team) 22%, transparent); }
.credit-team__heading { display: flex; justify-content: space-between; align-items: center; gap: 7px; margin-bottom: 6px; }
.credit-team__heading span { min-width: 0; overflow: hidden; color: var(--team); font-size: .69rem; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.credit-team__heading strong { flex: none; color: #ffe082; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .78rem; letter-spacing: .04em; }
.credit-coins { min-height: 24px; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
.credit-coins small { color: #776b5e; font-size: .62rem; font-weight: 900; letter-spacing: .12em; }
.credit-coin { width: 22px; height: 22px; display: grid; flex: 0 0 22px; place-items: center; border: 2px solid #ffe082; border-radius: 50%; background: radial-gradient(circle at 35% 28%, #fff3b0 0 8%, #ffc928 35%, #b56a00 76%); color: #653600; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .62rem; font-weight: 1000; line-height: 1; box-shadow: inset 0 0 0 2px rgba(130,75,0,.28), 0 2px 4px rgba(0,0,0,.45); }
.credit-coin-enter-active { animation: credit-in .32s cubic-bezier(.2,1.35,.35,1); }
.credit-coin-leave-active { transition: transform .24s ease, opacity .24s ease; }
.credit-coin-leave-to { opacity: 0; transform: translateY(-15px) rotate(80deg) scale(.35); }
.pass-vault { grid-column: 1 / -1; min-width: 0; display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 12px; padding: 8px 10px; border: 2px solid #70453d; border-radius: 11px; background: linear-gradient(135deg, #2a1714, #120d0c); }
.pass-vault__heading { display: grid; gap: 1px; min-width: 150px; }
.pass-vault__heading span { color: #ef9a9a; font-size: .68rem; font-weight: 900; letter-spacing: .07em; }
.pass-vault__heading strong { color: #ffccbc; font-size: 1rem; }
.confiscated-coins { min-height: 26px; display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
.confiscated-coins small { color: #755e59; font-size: .68rem; font-weight: 900; }
.confiscated-coin { width: 24px; height: 24px; display: grid; flex: 0 0 24px; place-items: center; border: 2px solid #9e7770; border-radius: 50%; background: radial-gradient(circle at 35% 28%, #e3cdc8 0 8%, #8b6660 38%, #3d2926 78%); color: #291715; font-size: .75rem; font-weight: 1000; box-shadow: inset 0 0 0 2px rgba(30,10,8,.3), 0 2px 4px rgba(0,0,0,.5); }
.confiscated-coin-enter-active { animation: confiscated-in .48s cubic-bezier(.22,1.2,.35,1); }
.question-slot { display: grid; justify-items: center; gap: 10px; text-align: center; background: radial-gradient(circle at top, #523300, #17110a 62%); }
.question-slot h2 { margin: 0; color: #ffd54f; }
.question-slot > p { margin: 0; color: #e5d4c7; }
.question-slot-reels { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 8px 0; }
.question-slot-reel { min-width: 0; display: grid; gap: 8px; padding: 12px; border: 3px solid #8d6e63; border-radius: 14px; background: linear-gradient(180deg, #fffdf7, #e7ddd3); color: #29180d; box-shadow: inset 0 0 20px rgba(92,53,20,.2), 0 5px 16px rgba(0,0,0,.35); }
.question-slot-reel small { color: #6d4c41; font-size: .78rem; font-weight: 1000; letter-spacing: .1em; }
.question-slot-reel strong { min-height: 2.7em; display: grid; place-items: center; overflow-wrap: anywhere; font-size: clamp(1.3rem, 3.4vw, 2.1rem); line-height: 1.25; }
.question-slot-reels.spinning .question-slot-reel { border-color: #ffb300; box-shadow: inset 0 0 20px rgba(255,179,0,.18), 0 0 15px rgba(255,179,0,.5); }
.question-slot-reels.spinning .question-slot-reel strong { animation: question-reel-roll .16s linear infinite; }
.question-slot-spin-button { width: min(440px, 100%); min-height: 60px; font-size: 1.2rem; }
.question-slot-actions { width: 100%; display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; }
.question-slot-actions button { min-height: 54px; font-size: 1rem; }
.question-theme-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 12px 0 4px; }
.question-theme-summary span { min-width: 0; display: grid; gap: 3px; padding: 9px; border: 2px solid #795d29; border-radius: 10px; background: linear-gradient(135deg, #3d2a0b, #21180d); }
.question-theme-summary small { color: #ffd180; font-size: .66rem; font-weight: 900; letter-spacing: .08em; }
.question-theme-summary strong { overflow-wrap: anywhere; color: #fff; font-size: 1rem; }
.quiz-console { text-align: center; }
.quiz-buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
.quiz-buttons button { min-height: 58px; font-size: 1rem; }
.quiz-buttons button:not(.secondary) { background: color-mix(in srgb, var(--team) 72%, #181818); border: 2px solid var(--team); font-weight: 900; }
.quiz-buttons .pass-button { grid-column: 1 / -1; background: linear-gradient(135deg, #522823, #2a1714); border: 2px solid #a66155; color: #ffccbc; font-weight: 900; }
.round-corrects, .draft-order { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; }
.round-corrects span, .draft-order span { padding: 8px 13px; border-radius: 99px; background: rgba(255,255,255,.1); color: #f1e4dc; font-size: .88rem; }
.round-corrects .pass-summary { background: #452621; color: #ffccbc; }
.draft-order span.current { color: #ffd54f; border: 1px solid #ffb300; }
.action-panel { max-width: 1100px; border-color: #ffb300; box-shadow: 0 8px 30px rgba(0,0,0,.35); }
.teams { max-width: 1320px; margin: 10px auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; }
.team-card { --team: #ffb300; padding: 18px; border: 3px solid color-mix(in srgb, var(--team) 48%, transparent); border-radius: 18px; background: rgba(8,7,6,.92); box-shadow: inset 0 0 30px color-mix(in srgb, var(--team) 8%, transparent); }
.team-card.active { border-color: var(--team); box-shadow: 0 0 28px color-mix(in srgb, var(--team) 45%, transparent); }
.teams--focus { grid-template-columns: minmax(175px, 1fr) minmax(500px, 640px) minmax(175px, 1fr); align-items: start; }
.teams--focus > .team-card.active { grid-column: 2; grid-row: 1; width: 100%; padding: 14px; justify-self: center; }
.teams--focus > .team-card:not(.active) { display: none; }
.focus-side { display: grid; align-content: start; gap: 10px; }
.focus-side--left { grid-column: 1; grid-row: 1; }
.focus-side--right { grid-column: 3; grid-row: 1; }
.focus-team { padding: 9px; border: 2px solid color-mix(in srgb, var(--team) 42%, #4a4039); border-radius: 12px; background: rgba(12,10,8,.92); opacity: .78; }
.focus-team.active { border-color: var(--team); background: color-mix(in srgb, var(--team) 10%, #0c0a08); opacity: 1; box-shadow: 0 0 13px color-mix(in srgb, var(--team) 28%, transparent); }
.focus-team__heading, .focus-team__footer { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
.focus-team__heading span { color: var(--team); font-size: .63rem; font-weight: 900; letter-spacing: .06em; }
.focus-team__heading strong { color: #fff; font-size: .82rem; }
.focus-team h3 { margin: 2px 0 6px; overflow: hidden; font-size: .95rem; text-overflow: ellipsis; white-space: nowrap; }
.focus-mini-reels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
.focus-mini-reels span { aspect-ratio: 1.45; display: grid; place-items: center; border: 2px solid #5d4037; border-radius: 5px; background: #f6f0e9; color: #271810; font-size: .88rem; font-weight: 1000; }
.focus-mini-reels span.hit { border-color: #ffb300; color: #d84315; box-shadow: 0 0 5px #ffb300; }
.focus-mini-reels span.bonus { border-color: #00acc1; background: #bcecf1; color: #005662; }
.focus-mini-reels span.bonus--two { border-color: #8e5be8; background: #dfc7fa; color: #4a148c; }
.focus-team__footer { margin-top: 6px; color: #cdbdb3; font-size: .62rem; font-weight: 900; }
.team-card.winner { animation: winner 1s infinite alternate; }
.team-heading { display: flex; justify-content: space-between; align-items: center; }
.team-number { color: var(--team); font-size: .78rem; font-weight: 900; letter-spacing: .08em; }
.team-heading h2 { margin: 1px 0; font-size: 1.4rem; }
.score { display: flex; align-items: baseline; gap: 4px; }
.score strong { color: var(--team); font-size: 2.35rem; line-height: 1; }
.score span { font-size: .9rem; font-weight: 900; }
.meter { height: 7px; margin: 7px 0; border-radius: 99px; background: #33271f; overflow: hidden; }
.meter i { display: block; height: 100%; background: var(--team); transition: width .3s; }
.resources { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.resources span { display: grid; gap: 1px; padding: 5px 4px; border-radius: 8px; background: #251e19; text-align: center; }
.resources small { color: #cdbdb3; font-size: .7rem; }
.resources strong { color: #fff; font-size: 1rem; }
.reel-stage { position: relative; margin: 8px 0 5px; }
.reels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin: 8px 0; }
.reels span { position: relative; z-index: 4; aspect-ratio: 1.5; display: grid; place-items: center; overflow: hidden; border: 3px solid #5d4037; border-radius: 10px; background: linear-gradient(#fffef8, #e8ded5); color: #271810; font-size: clamp(1.55rem, 4vw, 2.5rem); font-weight: 1000; text-shadow: 0 1px #fff; }
.teams--focus .team-card.active .reels span { aspect-ratio: 1.65; font-size: clamp(2rem, 5vw, 3rem); }
.reels span.bonus { border-color: #00acc1; background: linear-gradient(145deg, #e0fbff, #8de5ef); color: #005662; box-shadow: inset 0 0 18px rgba(0,172,193,.22), 0 0 9px rgba(0,229,255,.42); }
.reels span.bonus--two { border-color: #8e5be8; background: linear-gradient(145deg, #f5eaff, #cfadff); color: #4a148c; box-shadow: inset 0 0 18px rgba(126,87,194,.25), 0 0 10px rgba(179,136,255,.5); }
.reels span.bonus::after { content: attr(data-bonus); position: absolute; top: 5px; right: 6px; z-index: 6; padding: 2px 5px; border-radius: 99px; background: #007c91; color: #fff; font-size: .55rem; font-weight: 900; line-height: 1.2; text-shadow: none; }
.reels span.bonus--two::after { background: #6a1b9a; }
.reels span.hit { border-color: #ffb300; color: #d84315; box-shadow: 0 0 13px #ffb300; transform: scale(1.03); }
.reels span.hit.bonus { box-shadow: 0 0 0 2px #00e5ff, 0 0 15px #ffb300; }
.reels span.hit.bonus--two { box-shadow: 0 0 0 2px #ce93d8, 0 0 15px #ffb300; }
.reel-value { font: inherit; color: inherit; }
.reel-slip-window { position: absolute; inset: 0; z-index: 5; overflow: hidden; border-radius: inherit; }
.reel-slip-strip { height: 200%; display: grid; grid-template-rows: repeat(2, 1fr); transform: translateY(0); transition: transform .62s cubic-bezier(.2,.9,.25,1.08); will-change: transform; }
.reel-slip-strip--landed { transform: translateY(-50%); }
.reel-slip-strip b { display: grid; place-items: center; min-height: 0; font: inherit; color: inherit; }
.change-tag { position: absolute; left: 5px; bottom: 5px; z-index: 6; max-width: calc(100% - 10px); padding: 3px 6px; border-radius: 7px; background: #263238; color: #fff; font-size: .58rem; font-weight: 900; line-height: 1.15; text-shadow: none; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,.35); }
.reels span.transformed-cell { outline: 2px solid var(--transform-color, #90a4ae); outline-offset: -5px; }
.reels span.transforming-cell { z-index: 7; animation: ability-transform .48s ease-in-out infinite alternate; }
.reels span.transform--luckyNumber { --transform-color: #43a047; }
.reels span.transform--bigNumber { --transform-color: #ef6c00; }
.reels span.transform--smallNumber { --transform-color: #039be5; }
.reels span.transforming-cell.transform--luckyNumber { background: linear-gradient(145deg, #f2ffe9, #b9ef9d); }
.reels span.transforming-cell.transform--bigNumber { background: linear-gradient(145deg, #fff4df, #ffc477); }
.reels span.transforming-cell.transform--smallNumber { background: linear-gradient(145deg, #e7f8ff, #8bd7f7); }
.reels span.transform--luckyNumber .change-tag { background: #2e7d32; }
.reels span.transform--bigNumber .change-tag { background: #d84315; }
.reels span.transform--smallNumber .change-tag { background: #0277bd; }
.payline { --line: #ffb300; position: absolute; z-index: 3; height: 0; border-top: 2px dashed rgba(120,120,120,.35); pointer-events: none; opacity: .35; transform-origin: center; }
.payline:not(.enabled) { display: none; }
.payline.enabled { border-top: 3px solid var(--line); opacity: .78; filter: drop-shadow(0 0 3px #000); }
.payline--0, .payline--1, .payline--2 { left: 2%; width: 96%; }
.payline--0 { top: 16.5%; } .payline--1 { top: 50%; } .payline--2 { top: 83.5%; }
.payline--3, .payline--4, .payline--5 { top: 50%; width: 96%; transform: rotate(90deg); }
.payline--3 { left: -31.5%; } .payline--4 { left: 2%; } .payline--5 { left: 35.5%; }
.payline--6, .payline--7 { left: -8%; top: 50%; width: 116%; }
.payline--6 { transform: rotate(43deg); } .payline--7 { transform: rotate(-43deg); }
.line-heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 8px 0 5px; }
.line-heading strong { color: #fff; font-size: .95rem; }
.line-heading span { color: #cdbdb3; font-size: .75rem; }
.line-status { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
.line-status span { display: flex; justify-content: space-between; gap: 5px; padding: 5px 7px; border: 1px dashed #665850; border-radius: 7px; color: #ad9d94; background: #1c1714; font-size: .72rem; }
.line-status span.enabled { border: 2px solid color-mix(in srgb, var(--team) 70%, #fff); color: #fff; background: color-mix(in srgb, var(--team) 18%, #17120f); font-weight: 800; }
.teams--focus .team-card.active .line-status { grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 4px; }
.teams--focus .team-card.active .line-status span { padding: 4px 5px; font-size: .65rem; }
.deck-status { min-height: 1.25em; margin: 8px 0; padding: 8px; border: 1px solid #4e4038; border-radius: 10px; background: #181311; color: #eee2da; }
.deck-status__heading { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 6px; }
.deck-status__heading strong { color: #ffd54f; font-size: .78rem; }
.deck-status__heading span { color: #cdbdb3; font-size: .68rem; font-weight: 800; }
.number-set { display: flex; flex-wrap: wrap; gap: 5px; }
.number-set__chip { min-width: 49px; display: inline-flex; justify-content: center; align-items: center; gap: 4px; padding: 5px 7px; border: 2px solid #6d5a4e; border-radius: 8px; background: #fffaf2; color: #271810; line-height: 1; }
.number-set__chip b { font-size: .9rem; }
.number-set__chip em { color: #5d4037; font-size: .67rem; font-style: normal; font-weight: 900; }
.number-set__chip--wild { border-color: #42a5f5; background: #e3f2fd; color: #0d47a1; }
.number-set__chip--bonus-one { border-color: #00acc1; background: #dff9fc; color: #006064; }
.number-set__chip--bonus-two { border-color: #8e5be8; background: #f2e7ff; color: #4a148c; }
.ability-status { min-height: 27px; margin: 6px 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px; color: #eee2da; }
.no-ability { color: #b7a69c; font-size: .72rem; }
.ability-badge { --ability: #78909c; min-height: 25px; display: inline-flex; align-items: center; gap: 4px; padding: 3px 6px; border: 1px solid color-mix(in srgb, var(--ability) 76%, #fff); border-radius: 99px; background: color-mix(in srgb, var(--ability) 22%, #17120f); color: #fff; line-height: 1; box-shadow: inset 0 0 8px color-mix(in srgb, var(--ability) 15%, transparent); }
.ability-badge > b { min-width: 24px; color: color-mix(in srgb, var(--ability) 76%, #fff); text-align: center; font-size: .72rem; }
.ability-badge > strong { font-size: .68rem; }
.ability-badge > small { color: #efe8e4; font-size: .6rem; }
.ability-badge > em { padding: 2px 4px; border-radius: 99px; background: var(--ability); color: #fff; font-size: .58rem; font-style: normal; font-weight: 900; }
.ability-badge--oneTwoBeat { --ability: #1e88e5; }
.ability-badge--luckyNumber { --ability: #43a047; }
.ability-badge--bigNumber { --ability: #ef6c00; }
.ability-badge--smallNumber { --ability: #00acc1; }
.result { min-height: 2em; margin: 7px 0; color: #ffe082; text-align: center; font-size: .94rem; font-weight: 700; }
.result--confirmed { padding: 9px 7px; border: 2px solid #ffb300; border-radius: 9px; background: rgba(255,179,0,.15); font-size: 1.05rem; font-weight: 900; }
.spin-button, .continue-button { width: 100%; min-height: 48px; background: linear-gradient(135deg, #ef6c00, #d84315); border: 2px solid #ffca28; font-size: 1rem; font-weight: 900; }
.spin-button small, .continue-button small { display: block; margin-top: 3px; color: #fff3d0; font-size: .67rem; letter-spacing: .05em; }
.rolling-cell { color: #f4511e !important; filter: blur(1px); animation: reel-roll .14s linear infinite; }
.rolling-message { min-height: 42px; display: flex; align-items: center; justify-content: center; gap: 9px; color: #ffd54f; font-size: .78rem; font-weight: 900; letter-spacing: .18em; }
.rolling-lamp { width: 9px; height: 9px; border-radius: 50%; background: #ffb300; box-shadow: 0 0 12px #ffb300; animation: lamp .45s ease-in-out infinite alternate; }
.card-sets { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 16px; }
.card-set { display: grid; gap: 9px; padding: 13px; border: 2px solid #5d514a; text-align: left; }
.set-label { color: #ffd54f; font-size: .82rem; font-weight: 900; letter-spacing: .15em; }
.mini-card, .hand-card { position: relative; display: grid; gap: 7px; min-height: 78px; padding: 13px; border-left: 6px solid #795548; border-radius: 8px; background: #2b2420; }
.mini-card strong, .hand-card strong { color: #fff; font-size: 1.18rem; line-height: 1.25; }
.card-description { display: none; color: #f2e7df; font-size: .9rem; line-height: 1.5; }
.card-kind { width: fit-content; padding: 3px 8px; border-radius: 99px; background: rgba(255,255,255,.14); color: #fff; font-size: .74rem; font-weight: 900; letter-spacing: .05em; }
.mini-card::after, .hand-card::after { content: attr(data-tooltip); position: absolute; inset: 4px; z-index: 5; display: grid; place-items: center; padding: 10px; border: 2px solid #ffd54f; border-radius: 7px; background: rgba(18,13,9,.98); color: #fff7df; font-size: .95rem; font-weight: 800; line-height: 1.45; text-align: center; opacity: 0; transform: scale(.96); pointer-events: none; transition: opacity .16s ease, transform .16s ease; }
.mini-card:hover::after, .card-set:focus-visible .mini-card::after, .hand-card:hover::after, .hand-card:focus-visible::after { opacity: 1; transform: scale(1); }
.card--number { border-left-color: #42a5f5; }
.card--upgrade { border-left-color: #ab47bc; }
.card--multiplier { border-left-color: #ffa726; }
.hand { display: grid; gap: 6px; margin-top: 12px; }
.hand h3 { margin: 0; color: #ffd54f; font-size: 1rem; }
.hand-card { width: 100%; text-align: left; }
.empty { color: #b7a69c; font-size: .8rem; }
.customize { text-align: center; }
.timer-caption { display: block; margin-top: 10px; color: #cdbdb3; font-weight: 800; }
.timer { margin: 4px auto 12px; color: #ffd54f; font-size: clamp(2.5rem, 8vw, 5rem); font-weight: 900; }
.timer.expired { color: #ffb74d; }
.timer-over { color: #ffe0b2; font-weight: 800; }
.next-round-button { min-height: 52px; font-size: 1rem; }
.choice-modal { position: fixed; left: 50%; bottom: 12px; z-index: 20; width: min(900px, calc(100% - 24px)); max-height: calc(100vh - 24px); overflow-y: auto; transform: translateX(-50%); box-shadow: 0 8px 40px #000; text-align: center; }
.choice-modal h2 { color: #ffd54f; }
.line-upgrade-grid, .remove-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 12px 0; }
.line-upgrade-grid button { display: grid; gap: 3px; }
.line-upgrade-grid strong { color: #ffd54f; font-size: .7rem; }
.score-chart-button { color: #d9f6ff; border-color: #4f8394; background: #17333c; font-weight: 800; }
.score-chart-modal { position: fixed; left: 50%; top: 50%; z-index: 40; width: min(1120px, calc(100% - 24px)); max-width: none; max-height: calc(100vh - 24px); margin: 0; overflow-y: auto; transform: translate(-50%, -50%); border-color: #4f8394; box-shadow: 0 12px 60px rgba(0,0,0,.85); }
.score-chart-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.score-chart-heading h2 { margin: 2px 0; color: #d9f6ff; }
.score-chart-legend { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
.score-chart-legend span { display: flex; align-items: center; gap: 6px; padding: 6px 9px; border: 1px solid color-mix(in srgb, var(--team) 65%, #fff); border-radius: 99px; background: color-mix(in srgb, var(--team) 14%, #16110e); font-size: .78rem; }
.score-chart-legend i { width: 10px; height: 10px; border-radius: 50%; background: var(--team); box-shadow: 0 0 7px var(--team); }
.score-chart-legend strong { color: var(--team); }
.score-chart-scroll { overflow-x: auto; padding: 8px; border: 1px solid #4f4037; border-radius: 10px; background: #0d1113; }
.score-chart { min-width: 760px; height: auto; display: block; overflow: visible; }
.score-grid line { stroke: #405057; stroke-width: 1; stroke-dasharray: 5 5; }
.score-grid text { fill: #b8c9cf; font-size: 11px; text-anchor: end; }
.score-axis-labels line { stroke: #74858b; stroke-width: 1; }
.score-axis-labels text { fill: #c9d6da; font-size: 10px; }
.score-team-line polyline { fill: none; stroke-width: 4; stroke-linejoin: round; stroke-linecap: round; filter: drop-shadow(0 0 3px rgba(255,255,255,.2)); }
.score-team-line circle { stroke: #101315; stroke-width: 2; }
.score-chart-note { margin: 9px 0 0; color: #b8c9cf; font-size: .76rem; }
.winner-banner { position: fixed; inset: 0; z-index: 30; display: grid; place-content: center; justify-items: center; gap: 12px; background: rgba(10,6,2,.92); }
.winner-banner span { color: #ffd54f; letter-spacing: .3em; }
.winner-banner strong { font-size: clamp(2rem, 10vw, 5rem); }
.winner-banner p { font-size: 1.5rem; }
.winner-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.log summary { cursor: pointer; color: #ffd54f; }
.log ol { max-height: 220px; overflow: auto; color: #bcaaa4; font-size: .8rem; }
.file-button input { display: none; }
.error { color: #ff8a80; }
@keyframes winner { to { border-color: #fff; transform: translateY(-3px); } }
@keyframes reel-roll { 0% { transform: translateY(-3px); opacity: .7; } 50% { transform: translateY(3px); opacity: 1; } 100% { transform: translateY(-3px); opacity: .7; } }
@keyframes lamp { to { opacity: .25; transform: scale(.7); } }
@keyframes ability-transform { from { transform: scale(1); filter: brightness(1); } to { transform: scale(1.08) rotate(-1deg); filter: brightness(1.25); box-shadow: 0 0 22px var(--transform-color, #fff); } }
@keyframes credit-in { from { opacity: 0; transform: translateY(-12px) rotate(-120deg) scale(.25); } to { opacity: 1; transform: none; } }
@keyframes confiscated-in { from { opacity: 0; transform: translateY(-34px) rotate(-180deg) scale(.3); } 65% { transform: translateY(3px) rotate(14deg) scale(1.12); } to { opacity: 1; transform: none; } }
@keyframes question-reel-roll { 0% { transform: translateY(-3px); opacity: .72; } 50% { transform: translateY(3px); opacity: 1; } 100% { transform: translateY(-3px); opacity: .72; } }
@media (prefers-reduced-motion: reduce) {
  .rolling-cell, .rolling-lamp, .team-card.winner, .transforming-cell, .credit-coin-enter-active, .confiscated-coin-enter-active, .question-slot-reels.spinning .question-slot-reel strong { animation: none; }
  .reel-slip-strip { transition: none; }
  .credit-coin-leave-active { transition: none; }
  .mini-card::after, .hand-card::after { transition: none; }
}
@media (hover: none), (pointer: coarse) {
  .card-description { display: block; }
  .mini-card::after, .hand-card::after { display: none; }
}
@media (max-width: 980px) {
  .game-toolbar { grid-template-columns: 1fr; }
  .next-action { text-align: center; }
  .teams--focus { max-width: 640px; grid-template-columns: 1fr; }
  .teams--focus > .team-card.active { grid-column: 1; grid-row: 1; }
  .focus-side { display: none; }
  .teams--focus .team-card.active .line-status { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .slot-game { padding: 10px; }
  .slot-header { grid-template-columns: 68px 1fr; }
  .header-actions { grid-column: 1 / -1; justify-content: center; }
  .slot-header .ghost-button { padding: 8px 4px; font-size: .7rem; }
  .teams, .card-sets { grid-template-columns: 1fr; }
  .status { gap: 10px; }
  .quiz-buttons { grid-template-columns: 1fr 1fr; }
  .credit-bank { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 6px; gap: 5px; }
  .credit-team { padding: 6px; }
  .credit-team__heading { display: grid; gap: 2px; }
  .credit-team__heading strong { font-size: .68rem; }
  .credit-coin { width: 18px; height: 18px; flex-basis: 18px; border-width: 1px; font-size: .52rem; }
  .pass-vault { grid-template-columns: 1fr; gap: 5px; }
  .pass-vault__heading { min-width: 0; display: flex; justify-content: space-between; }
  .question-reel-configs, .question-slot-reels, .question-theme-summary { grid-template-columns: 1fr; }
  .question-slot-reel strong { min-height: 2.1em; }
  .card-config__group { grid-template-columns: 1fr; }
  .team-card { padding: 13px; }
  .reels span { aspect-ratio: 1.6; }
  .line-status, .line-upgrade-grid { grid-template-columns: repeat(2, 1fr); }
  .teams--focus .team-card.active .line-status { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .remove-grid { grid-template-columns: repeat(5, 1fr); }
  .teams--focus .team-card:not(.active) { display: none; }
  .line-heading { align-items: flex-start; flex-direction: column; }
}
</style>
