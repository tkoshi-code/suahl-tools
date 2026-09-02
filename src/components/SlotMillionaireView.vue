<template>
  <main class="slot-game">
    <header class="slot-header">
      <button class="ghost-button" :disabled="state.phase === 'rolling'" @click="emit('back')">← ホーム</button>
      <div>
        <p class="eyebrow">QUIZ × SLOT</p>
        <h1>🎰 カスタムスロットミリオネア</h1>
      </div>
      <div class="header-actions">
        <button class="bgm-button" :class="{ playing: bgmPlaying }" :aria-pressed="bgmPlaying" @click="toggleBgm">
          {{ bgmPlaying ? '♫ BGM ON' : '♪ BGM OFF' }}
        </button>
        <button class="sfx-button" :class="{ playing: sfxEnabled }" :aria-pressed="sfxEnabled" @click="toggleSfx">
          {{ sfxEnabled ? '🔊 SE ON' : '🔇 SE OFF' }}
        </button>
        <button class="ghost-button" @click="showGuide = !showGuide">ルール</button>
      </div>
    </header>

    <section v-if="showGuide" class="guide panel">
      <h2>使い方ガイド</h2>
      <ol>
        <li>開始時に全チームが1回ずつスロットを回します。</li>
        <li>1ラウンド10問。正解したチームのクレジットコインが1枚増えます。</li>
        <li>10問終了後、獲得したクレジットの回数だけチームごとにスピンします。スピン開始時にコインを1枚消費します。</li>
        <li>全チームのスピン後、低VP順に3枚組の育成カードセットを選びます。</li>
        <li>相談時間の目安を見ながらナンバー・強化・倍率カードでスロットを育て、準備ができたら手動で次の10問へ進みます。</li>
      </ol>
      <p>妨害カードはありません。有効ラインで同じ数字が3個揃うと「数字×ライン倍率」のVPを獲得します。1/2カードはラインごとに1または2として扱えます。</p>
      <p>PCではスピン中のチームを中央、他チームを左右の小型盤面で表示します。狭い画面では操作中のチームだけを表示します。</p>
      <p>強化カードは効果とレベルを色分けバッジで表示します。リスクリターンは使用せず、リムーブは共有山札に7枚入ります。3（+1VP）は水色、3（+2VP）は紫色に光り、ライン成立とは別の出現VPだと分かります。</p>
      <p>各チームの「現在の数字セット」には、数字カードの種類・枚数・合計枚数を表示します。</p>
      <p>勝利VPはプリセットのほか、10〜9999VPの整数を直接入力できます。</p>
      <p>ラッキー・ビッグ・スモールで数字が変わる場合は、元の数字で停止した後に専用SEと発光演出が入り、対象リールだけが滑って揃います。「変化前→変化後」は結果確認まで表示します。</p>
      <p>BGMと回転・停止・当たりSEは画面上部から個別にON/OFFできます。最初の再生はボタン操作後に始まります。</p>
    </section>

    <section v-if="state.phase === 'setup'" class="setup panel">
      <h2>対戦設定</h2>
      <label>チーム数</label>
      <div class="choice-row">
        <button v-for="number in [2, 3]" :key="number" :class="{ selected: setup.teamCount === number }" @click="setup.teamCount = number">{{ number }}チーム</button>
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
      </section>

      <section v-if="state.phase === 'quiz'" class="quiz-console panel">
        <p class="quiz-kicker">ROUND {{ state.roundNumber }} · QUESTION {{ state.questionInRound + 1 }}</p>
        <h2>正解したチームを記録</h2>
        <div class="quiz-buttons">
          <button
            v-for="(team, index) in state.teams"
            :key="team.id"
            :style="{ '--team': team.color }"
            @click="recordQuestion(index)"
          >✓ {{ team.name }}</button>
          <button class="secondary" @click="recordQuestion(null)">正解チームなし</button>
        </div>
        <div class="round-corrects">
          <span v-for="team in state.teams" :key="team.id">{{ team.name }} <strong>{{ team.roundCorrect }}問</strong></span>
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
            <span v-for="card in set.cards" :key="card.uid" class="mini-card" :class="`card--${card.kind}`">
              <span class="card-kind">{{ cardKindLabel(card) }}</span>
              <strong>{{ card.title }}</strong>
              <small>{{ card.description }}</small>
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
        <button class="primary next-round-button" @click="finishCustomize">育成を終了して次の10問へ</button>
      </section>

      <section class="teams" :class="{ 'teams--focus': state.activeTeamIndex !== null }">
        <article
          v-for="(team, index) in state.teams"
          :key="team.id"
          class="team-card"
          :class="{
            active: state.activeTeamIndex === index,
            'team-card--left': focusedTeamPosition(index) === 'left',
            'team-card--right': focusedTeamPosition(index) === 'right',
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
            @click="spinOnce(index)"
          >🎰 スピンする（残り{{ team.spinRightsRemaining }}回）</button>

          <div v-else-if="state.phase === 'rolling' && state.activeTeamIndex === index" class="rolling-message">
            <span class="rolling-lamp"></span>
            SPINNING…
          </div>

          <button
            v-else-if="state.phase === 'spin-result' && state.activeTeamIndex === index"
            class="continue-button"
            @click="continueSpin"
          >{{ team.spinRightsRemaining > 0 ? `次のスピンへ（残り${team.spinRightsRemaining}回）` : '次のチームへ' }} →</button>

          <div v-if="state.phase === 'customize'" class="hand">
            <h3>所持カード</h3>
            <p v-if="!team.hand.length" class="empty">使用できるカードはありません</p>
            <button
              v-for="card in team.hand"
              :key="card.uid"
              class="hand-card"
              :class="`card--${card.kind}`"
              @click="useCard(index, card.uid)"
            >
              <span class="card-kind">{{ cardKindLabel(card) }}</span>
              <strong>{{ card.title }}</strong>
              <small>{{ card.description }}</small>
            </button>
          </div>
        </article>
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
        <p>山札は10枚未満にできません。</p>
        <div class="remove-grid">
          <button v-for="card in pendingTeam.numberDeck" :key="card.uid" @click="applyRemove(card.uid)">{{ numberCardLabel(card) }}</button>
        </div>
        <button class="secondary" @click="pendingUse = null">キャンセル</button>
      </section>

      <section v-if="state.phase === 'finished' && winner" class="winner-banner">
        <span>🏆 WINNER</span>
        <strong>{{ winner.name }}</strong>
        <p>{{ winner.vp }} VP</p>
        <button @click="confirmReset">もう一度遊ぶ</button>
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
import { computed, onUnmounted, reactive, ref, watch } from 'vue'

const emit = defineEmits(['back'])
const STORAGE_KEY = 'piyopiyo_custom_slot_v1'
const COLORS = ['#ffb300', '#42a5f5', '#ef5350']
const QUESTIONS_PER_ROUND = 10
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
  names: ['オレンジ', 'ブルー', 'レッド'],
})
const showGuide = ref(false)
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
const sfxEnabled = ref(true)
let spinRunId = 0
let customizeTimer = null
let audioContext = null
let bgmTimer = null
let bgmStep = 0
let reelSoundTimer = null
let reelSoundStep = 0

const saved = loadSaved()
const hasSave = ref(Boolean(saved))
const state = reactive(saved || emptyState())

const phaseLabel = computed(() => activeTransformation.value ? '強化発動' : (PHASE_LABELS[state.phase] || state.phase))
const phaseInstruction = computed(() => {
  const activeTeam = state.teams[state.activeTeamIndex]
  if (activeTransformation.value) {
    const change = activeTransformation.value
    return `${change.icon} ${change.label}：${change.beforeLabel} → ${change.afterLabel}`
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

function displayedCredits(team, teamIndex) {
  if (state.phase === 'quiz') return Math.max(0, Number(team.roundCorrect) || 0)
  const credits = Math.max(0, Number(team.spinRightsRemaining) || 0)
  return state.phase === 'rolling' && state.activeTeamIndex === teamIndex
    ? Math.max(0, credits - 1)
    : credits
}

watch(state, saveState, { deep: true })
watch(() => state.phase, phase => {
  if (phase === 'customize') startCustomizeTimer()
  else stopCustomizeTimer()
}, { immediate: true })

function emptyState() {
  return {
    schemaVersion: 3,
    phase: 'setup',
    targetVp: 100,
    customizeSeconds: 90,
    roundNumber: 0,
    questionInRound: 0,
    questionCount: 0,
    activeTeamIndex: null,
    teams: [],
    cardPool: [],
    discardPile: [],
    marketSets: [],
    draftOrder: [],
    draftCursor: 0,
    spinOrder: [],
    spinCursor: 0,
    spinContext: null,
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

function buildCardPool() {
  const cards = []
  const addCopies = (count, factory) => {
    for (let index = 0; index < count; index++) cards.push(factory(index))
  }

  addCopies(8, () => makeCard('number', 'wild12', '1/2', 'ラインごとに1または2として扱う', { numberCard: { key: 'wild12', value: null, bonus: 0, label: '1/2' } }))
  addCopies(8, () => makeCard('number', '3p1', '3（+1VP）', '出現するだけで+1VP。ライン上は3', { numberCard: { key: '3p1', value: 3, bonus: 1, label: '3⁺¹' } }))
  addCopies(8, () => makeCard('number', '3p2', '3（+2VP）', '出現するだけで+2VP。ライン上は3', { numberCard: { key: '3p2', value: 3, bonus: 2, label: '3⁺²' } }))
  addCopies(8, () => makeCard('number', '7', '7', '高配当の7を山札へ追加', { numberCard: { key: '7', value: 7, bonus: 0, label: '7' } }))

  addCopies(7, () => makeCard('upgrade', 'remove', 'リムーブ', '数字カードを1枚除外（最低10枚）'))
  addCopies(3, () => makeCard('upgrade', 'oneTwoBeat', 'ワンツービート', '1・2・1/2の出現枚数を毎スピンVP加算'))
  addCopies(3, () => makeCard('upgrade', 'luckyNumber', 'ラッキーナンバー', '得点が最大になる1マスを自動で7に変更'))
  addCopies(3, () => makeCard('upgrade', 'bigNumber', 'ビッグナンバー', '得点が最大になる1マスを自動で+1'))
  addCopies(3, () => makeCard('upgrade', 'smallNumber', 'スモールナンバー', '得点が最大になる1マスを自動で-1/-2'))

  addCopies(4, () => makeCard('multiplier', 'horizontal1', '横倍率 ×1', '横の任意ラインを開放・強化', { orientation: 'horizontal', amount: 1 }))
  addCopies(4, () => makeCard('multiplier', 'vertical1', '縦倍率 ×1', '縦の任意ラインを開放・強化', { orientation: 'vertical', amount: 1 }))
  addCopies(3, () => makeCard('multiplier', 'vertical2', '縦倍率 ×2', '縦の任意ラインを×2強化', { orientation: 'vertical', amount: 2 }))
  addCopies(4, () => makeCard('multiplier', 'diagonal1', '斜め倍率 ×1', '斜めの任意ラインを開放・強化', { orientation: 'diagonal', amount: 1 }))
  addCopies(3, () => makeCard('multiplier', 'diagonal2', '斜め倍率 ×2', '斜めの任意ラインを×2強化', { orientation: 'diagonal', amount: 2 }))

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
  value.schemaVersion = 3
  value.targetVp ||= 100
  value.customizeSeconds ||= 90
  value.roundNumber ??= previousSchemaVersion < 2 ? 1 : 0
  value.questionInRound ||= 0
  value.questionCount ||= 0
  value.cardPool ||= buildCardPool()
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
  if (value.phase === 'rolling' || oldPhases.includes(value.phase)) value.phase = 'quiz'

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
}

function isGrowthCard(card) {
  return card?.key !== 'riskReturn'
    && (card?.kind === 'number' || card?.kind === 'upgrade' || card?.kind === 'multiplier')
}

function normalizeGrowthCards(cards) {
  return (cards || [])
    .map(card => card?.key === 'riskReturn'
      ? {
          ...card,
          kind: 'upgrade',
          key: 'remove',
          title: 'リムーブ',
          description: '数字カードを1枚除外（最低10枚）',
        }
      : card)
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
  Object.assign(state, JSON.parse(previous))
  pendingUse.value = null
}

function startGame() {
  setupError.value = ''
  const names = setup.names.slice(0, setup.teamCount).map(name => name.trim())
  const targetVp = Number(setup.targetVp)
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

  clearTransformationDisplay()
  Object.assign(state, {
    ...emptyState(),
    phase: 'initial-spin',
    targetVp,
    customizeSeconds: setup.customizeSeconds,
    teams: names.map(makeTeam),
    cardPool: buildCardPool(),
    spinOrder: names.map((_, index) => index),
    spinContext: 'initial',
    log: ['ゲームを開始しました。全チームが初回スピンを行います。'],
  })
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
    Object.assign(state, value)
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
    addLog(`Q${state.questionInRound + 1}：正解チームなし。`)
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
  team.lastResult = result.message
  addLog(`${team.name}がスピンし、${result.points}VPを獲得。`)
  if (result.points > 0) playWinSfx(result.points, result.hitCount)
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
    return
  }
  if (state.spinContext === 'initial') {
    beginQuizRound()
    return
  }
  beginDraft()
}

function beginQuizRound() {
  state.roundNumber++
  state.questionInRound = 0
  state.activeTeamIndex = null
  state.spinContext = null
  state.teams.forEach(team => {
    team.roundCorrect = 0
    team.spinRights = 0
    team.spinRightsRemaining = 0
  })
  state.phase = 'quiz'
  addLog(`ラウンド${state.roundNumber}のクイズ10問を開始。`)
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
  if (!window.confirm('改造フェイズを終了して次の10問へ進みますか？')) return
  snapshot()
  pendingUse.value = null
  beginQuizRound()
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

  if (card.key === 'remove') {
    if (team.numberDeck.length <= 10) {
      dataError.value = '数字山札は10枚未満にできません。'
      return
    }
    pendingUse.value = { mode: 'remove', teamIndex, cardUid, card }
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
  snapshot()
  const cardIndex = team.numberDeck.findIndex(card => card.uid === numberUid)
  if (cardIndex >= 0) team.numberDeck.splice(cardIndex, 1)
  consumeHandCard(team, use.cardUid)
  team.lastResult = '数字カードを1枚リムーブ'
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
  const oneTwoBonus = oneTwoCount * (team.abilities.oneTwoBeat || 0)
  const points = lineResult.points + originalBonus + oneTwoBonus

  if (originalBonus) notes.push(`出現+${originalBonus}`)
  if (oneTwoBonus) notes.push(`ワンツー+${oneTwoBonus}`)
  const lineText = lineResult.hitCount ? `${lineResult.hitCount}ライン` : 'ラインなし'
  const noteText = notes.length ? `（${notes.join('、')}）` : ''
  return {
    points,
    hitCount: lineResult.hitCount,
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
  LINES.forEach((line, lineIndex) => {
    const multiplier = team.lineMultipliers[lineIndex]
    if (!multiplier) return
    const cards = line.map(cellIndex => reels[cellIndex])
    const value = matchingValue(cards)
    if (value !== null) {
      points += value * multiplier
      hitCount++
      hitCells.push(...line)
    }
  })
  return { points, hitCount, hitCells: [...new Set(hitCells)] }
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
      effect: `1枚ごと+${abilities.oneTwoBeat || 0}VP`,
      title: '1・2・1/2が出るたび、レベルと同じVPを獲得',
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

function focusedTeamPosition(teamIndex) {
  if (state.activeTeamIndex === null || teamIndex === state.activeTeamIndex) return 'center'
  const sideTeams = state.teams.map((_, index) => index).filter(index => index !== state.activeTeamIndex)
  return sideTeams.indexOf(teamIndex) === 0 ? 'left' : 'right'
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

function playTone(frequency, duration = 0.12, type = 'sine', volume = 0.025, delay = 0) {
  const context = ensureAudioContext()
  if (!context) return
  if (context.state === 'suspended') context.resume().catch(() => {})
  const startAt = context.currentTime + delay
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, startAt)
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), startAt + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(startAt)
  oscillator.stop(startAt + duration + 0.02)
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
    bgmTimer = window.setInterval(playBgmStep, 230)
  } catch {
    dataError.value = 'BGMを開始できませんでした。もう一度BGMボタンを押してください。'
  }
}

function stopBgm() {
  if (bgmTimer) window.clearInterval(bgmTimer)
  bgmTimer = null
  bgmPlaying.value = false
}

function playBgmStep() {
  if (!bgmPlaying.value) return
  const melody = [659, 784, 880, 784, 659, 784, 988, 880, 698, 831, 988, 831, 698, 831, 1047, 988]
  const bass = [131, 131, 165, 165, 175, 175, 196, 196]
  const note = melody[bgmStep % melody.length]
  playTone(note, 0.18, 'square', 0.016)
  if (bgmStep % 2 === 0) playTone(bass[Math.floor(bgmStep / 2) % bass.length], 0.32, 'triangle', 0.022)
  if (bgmStep % 4 === 3) playTone(note * 2, 0.05, 'sine', 0.009)
  bgmStep++
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
  gain.gain.exponentialRampToValueAtTime(0.035, now + 0.03)
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

function playWinSfx(points, hitCount) {
  if (!sfxEnabled.value) return
  const notes = hitCount >= 2 || points >= 10
    ? [523, 659, 784, 1047, 1319]
    : [523, 659, 784, 1047]
  notes.forEach((note, index) => playTone(note, index === notes.length - 1 ? 0.36 : 0.14, 'square', 0.035, index * 0.09))
  if (hitCount > 0) playTone(262, 0.5, 'triangle', 0.028, 0.02)
}

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds))
}

function addLog(message) {
  state.log.unshift(`R${state.roundNumber} ${message}`)
  state.log = state.log.slice(0, 100)
}

function confirmReset() {
  if (!window.confirm('現在のゲームを終了して、新しい対戦設定へ戻りますか？')) return
  clearTransformationDisplay()
  localStorage.removeItem(STORAGE_KEY)
  history.splice(0)
  pendingUse.value = null
  Object.assign(state, emptyState())
  hasSave.value = false
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify({ app: 'custom-slot-millionaire', version: 3, state }, null, 2)], { type: 'application/json' })
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
    Object.assign(state, json.state)
  } catch {
    dataError.value = 'このファイルは復元できません。正しいバックアップJSONを選んでください。'
  } finally {
    event.target.value = ''
  }
}

onUnmounted(() => {
  spinRunId++
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
.header-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 6px; }
.bgm-button, .sfx-button { min-width: 92px; background: #2b2119; font-weight: 800; }
.bgm-button.playing, .sfx-button.playing { border-color: #ffd54f; background: #5d3a00; color: #fff3b0; box-shadow: 0 0 12px rgba(255,193,7,.22); }
.eyebrow, .quiz-kicker { margin: 0; color: #e0d0c5; font-size: .7rem; font-weight: 800; letter-spacing: .16em; }
.panel { max-width: 960px; margin: 14px auto; padding: 20px; border: 2px solid rgba(255,193,7,.35); border-radius: 16px; background: rgba(20,16,10,.94); }
.game-toolbar { max-width: 1320px; margin: 0 auto 10px; display: grid; grid-template-columns: minmax(260px, .75fr) minmax(620px, 1.8fr); gap: 10px; align-items: stretch; }
.next-action { display: grid; align-content: center; margin: 0; padding: 9px 14px; border: 2px solid #ffd54f; border-radius: 12px; background: linear-gradient(135deg, #7a3e00, #3b2100); text-align: left; box-shadow: 0 4px 16px rgba(0,0,0,.28); }
.next-action span { display: block; color: #ffe0a3; font-size: .68rem; font-weight: 900; letter-spacing: .14em; }
.next-action strong { display: block; margin-top: 2px; color: #fff; font-size: clamp(1rem, 2vw, 1.25rem); line-height: 1.25; }
.guide { line-height: 1.8; }
.setup { max-width: 560px; display: grid; gap: 14px; }
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
.quiz-console { text-align: center; }
.quiz-buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
.quiz-buttons button { min-height: 58px; font-size: 1rem; }
.quiz-buttons button:not(.secondary) { background: color-mix(in srgb, var(--team) 72%, #181818); border: 2px solid var(--team); font-weight: 900; }
.round-corrects, .draft-order { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; }
.round-corrects span, .draft-order span { padding: 8px 13px; border-radius: 99px; background: rgba(255,255,255,.1); color: #f1e4dc; font-size: .88rem; }
.draft-order span.current { color: #ffd54f; border: 1px solid #ffb300; }
.action-panel { max-width: 1100px; border-color: #ffb300; box-shadow: 0 8px 30px rgba(0,0,0,.35); }
.teams { max-width: 1180px; margin: 10px auto; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.team-card { --team: #ffb300; padding: 18px; border: 3px solid color-mix(in srgb, var(--team) 48%, transparent); border-radius: 18px; background: rgba(8,7,6,.92); box-shadow: inset 0 0 30px color-mix(in srgb, var(--team) 8%, transparent); }
.team-card.active { border-color: var(--team); box-shadow: 0 0 28px color-mix(in srgb, var(--team) 45%, transparent); }
.teams--focus { max-width: 1320px; grid-template-columns: minmax(190px, 1fr) minmax(500px, 640px) minmax(190px, 1fr); align-items: start; }
.teams--focus .team-card.active { grid-column: 2; grid-row: 1; width: 100%; padding: 14px; justify-self: center; }
.teams--focus .team-card--left { grid-column: 1; grid-row: 1; }
.teams--focus .team-card--right { grid-column: 3; grid-row: 1; }
.teams--focus .team-card:not(.active) { padding: 10px; opacity: .78; border-width: 2px; }
.teams--focus .team-card:not(.active) .team-heading h2 { font-size: 1.05rem; }
.teams--focus .team-card:not(.active) .score strong { font-size: 1.8rem; }
.teams--focus .team-card:not(.active) .resources small { font-size: .6rem; }
.teams--focus .team-card:not(.active) .resources strong { font-size: .82rem; }
.teams--focus .team-card:not(.active) .reels span { aspect-ratio: 1.45; border-width: 2px; border-radius: 7px; font-size: 1.35rem; }
.teams--focus .team-card:not(.active) .line-heading span,
.teams--focus .team-card:not(.active) .line-status,
.teams--focus .team-card:not(.active) .deck-status,
.teams--focus .team-card:not(.active) .ability-status,
.teams--focus .team-card:not(.active) .result { display: none; }
.teams--focus .team-card:not(.active) .line-heading { margin-bottom: 0; }
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
.rolling-cell { color: #f4511e !important; filter: blur(1px); animation: reel-roll .14s linear infinite; }
.rolling-message { min-height: 42px; display: flex; align-items: center; justify-content: center; gap: 9px; color: #ffd54f; font-size: .78rem; font-weight: 900; letter-spacing: .18em; }
.rolling-lamp { width: 9px; height: 9px; border-radius: 50%; background: #ffb300; box-shadow: 0 0 12px #ffb300; animation: lamp .45s ease-in-out infinite alternate; }
.card-sets { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 16px; }
.card-set { display: grid; gap: 9px; padding: 13px; border: 2px solid #5d514a; text-align: left; }
.set-label { color: #ffd54f; font-size: .82rem; font-weight: 900; letter-spacing: .15em; }
.mini-card, .hand-card { display: grid; gap: 5px; padding: 11px; border-left: 6px solid #795548; border-radius: 8px; background: #2b2420; }
.mini-card strong, .hand-card strong { color: #fff; font-size: 1rem; }
.mini-card small, .hand-card small { color: #e2d5cd; font-size: .78rem; line-height: 1.45; }
.card-kind { width: fit-content; padding: 2px 7px; border-radius: 99px; background: rgba(255,255,255,.12); color: #fff; font-size: .66rem; font-weight: 900; letter-spacing: .05em; }
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
.winner-banner { position: fixed; inset: 0; z-index: 30; display: grid; place-content: center; justify-items: center; gap: 12px; background: rgba(10,6,2,.92); }
.winner-banner span { color: #ffd54f; letter-spacing: .3em; }
.winner-banner strong { font-size: clamp(2rem, 10vw, 5rem); }
.winner-banner p { font-size: 1.5rem; }
.log summary { cursor: pointer; color: #ffd54f; }
.log ol { max-height: 220px; overflow: auto; color: #bcaaa4; font-size: .8rem; }
.file-button input { display: none; }
.error { color: #ff8a80; }
@keyframes winner { to { border-color: #fff; transform: translateY(-3px); } }
@keyframes reel-roll { 0% { transform: translateY(-3px); opacity: .7; } 50% { transform: translateY(3px); opacity: 1; } 100% { transform: translateY(-3px); opacity: .7; } }
@keyframes lamp { to { opacity: .25; transform: scale(.7); } }
@keyframes ability-transform { from { transform: scale(1); filter: brightness(1); } to { transform: scale(1.08) rotate(-1deg); filter: brightness(1.25); box-shadow: 0 0 22px var(--transform-color, #fff); } }
@keyframes credit-in { from { opacity: 0; transform: translateY(-12px) rotate(-120deg) scale(.25); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .rolling-cell, .rolling-lamp, .team-card.winner, .transforming-cell, .credit-coin-enter-active { animation: none; }
  .reel-slip-strip { transition: none; }
  .credit-coin-leave-active { transition: none; }
}
@media (max-width: 980px) {
  .game-toolbar { grid-template-columns: 1fr; }
  .next-action { text-align: center; }
  .teams--focus { max-width: 640px; grid-template-columns: 1fr; }
  .teams--focus .team-card.active { grid-column: 1; grid-row: 1; }
  .teams--focus .team-card:not(.active) { display: none; }
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
  .credit-bank { padding: 6px; gap: 5px; }
  .credit-team { padding: 6px; }
  .credit-team__heading { display: grid; gap: 2px; }
  .credit-team__heading strong { font-size: .68rem; }
  .credit-coin { width: 18px; height: 18px; flex-basis: 18px; border-width: 1px; font-size: .52rem; }
  .team-card { padding: 13px; }
  .reels span { aspect-ratio: 1.6; }
  .line-status, .line-upgrade-grid { grid-template-columns: repeat(2, 1fr); }
  .teams--focus .team-card.active .line-status { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .remove-grid { grid-template-columns: repeat(5, 1fr); }
  .teams--focus .team-card:not(.active) { display: none; }
  .line-heading { align-items: flex-start; flex-direction: column; }
}
</style>
