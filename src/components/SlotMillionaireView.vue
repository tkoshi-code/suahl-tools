<template>
  <main class="slot-game">
    <header class="slot-header">
      <button class="ghost-button" :disabled="state.phase === 'rolling'" @click="emit('back')">← ホーム</button>
      <div>
        <p class="eyebrow">QUIZ × SLOT</p>
        <h1>🎰 カスタムスロットミリオネア</h1>
      </div>
      <button class="ghost-button" @click="showGuide = !showGuide">ルール</button>
    </header>

    <section v-if="showGuide" class="guide panel">
      <h2>使い方ガイド</h2>
      <ol>
        <li>開始時に全チームが1回ずつスロットを回します。</li>
        <li>1ラウンド10問。正解したチームへスロット権を記録します。</li>
        <li>10問終了後、獲得した権利の回数だけチームごとにスピンします。</li>
        <li>全チームのスピン後、低VP順に3枚組のカードセットを選びます。</li>
        <li>制限時間内にカードを使って改造し、次の10問へ進みます。</li>
      </ol>
      <p>有効ラインで同じ数字が3個揃うと「数字×ライン倍率」のVPを獲得します。1/2カードはラインごとに1または2として扱えます。</p>
    </section>

    <section v-if="state.phase === 'setup'" class="setup panel">
      <h2>対戦設定</h2>
      <label>チーム数</label>
      <div class="choice-row">
        <button v-for="number in [2, 3]" :key="number" :class="{ selected: setup.teamCount === number }" @click="setup.teamCount = number">{{ number }}チーム</button>
      </div>
      <label>勝利VP</label>
      <div class="choice-row">
        <button v-for="number in [50, 75, 100]" :key="number" :class="{ selected: setup.targetVp === number }" @click="setup.targetVp = number">{{ number }}VP</button>
      </div>
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
      <section class="status panel">
        <div><span>フェイズ</span><strong>{{ phaseLabel }}</strong></div>
        <div><span>ラウンド</span><strong>{{ state.roundNumber || '初回' }}</strong></div>
        <div v-if="state.phase === 'quiz'"><span>問題</span><strong>{{ state.questionInRound + 1 }} / 10</strong></div>
        <div><span>目標</span><strong>{{ state.targetVp }} VP</strong></div>
        <button class="ghost-button" :disabled="!history.length || state.phase === 'rolling'" @click="undo">↶ 取り消し</button>
        <button class="ghost-button" :disabled="state.phase === 'rolling'" @click="confirmReset">新しいゲーム</button>
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

      <section class="teams">
        <article
          v-for="(team, index) in state.teams"
          :key="team.id"
          class="team-card"
          :class="{ active: state.activeTeamIndex === index, winner: state.phase === 'finished' && team.vp === winner?.vp }"
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
            <span>○ {{ team.roundCorrect }}問</span>
            <span>🎟 {{ team.spinRightsRemaining }}/{{ team.spinRights }}</span>
            <span>🃏 {{ team.hand.length }}枚</span>
          </div>

          <div class="reel-stage">
            <div
              class="reels"
              :class="{ rolling: state.phase === 'rolling' && rollingTeamIndex === index }"
              aria-label="3行3列のスロット結果"
              aria-live="polite"
            >
              <span
                v-for="(card, reelIndex) in team.reels"
                :key="reelIndex"
                :class="{ hit: team.hitCells.includes(reelIndex), 'rolling-cell': isCellRolling(index, reelIndex) }"
              >{{ card ? numberCardLabel(card) : '–' }}</span>
            </div>
            <i
              v-for="(_, lineIndex) in LINES"
              :key="lineIndex"
              class="payline"
              :class="[`payline--${lineIndex}`, { enabled: team.lineMultipliers[lineIndex] > 0 }]"
              :style="{ '--line': team.color }"
            ></i>
          </div>

          <div class="line-status" aria-label="有効ラインと倍率">
            <span
              v-for="(lineName, lineIndex) in LINE_NAMES"
              :key="lineName"
              :class="{ enabled: team.lineMultipliers[lineIndex] > 0 }"
            >
              {{ lineName }}
              <strong>{{ team.lineMultipliers[lineIndex] ? `×${team.lineMultipliers[lineIndex]}` : 'OFF' }}</strong>
            </span>
          </div>

          <p class="deck-status">数字構成：{{ deckSummary(team) }}</p>
          <p class="ability-status">{{ abilitySummary(team) }}</p>
          <p class="result" :class="{ 'result--confirmed': state.phase === 'spin-result' && state.activeTeamIndex === index }">{{ team.lastResult || '初回スピンを待っています' }}</p>

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
              :disabled="customizeRemaining === 0"
              @click="useCard(index, card.uid)"
            >
              <strong>{{ card.title }}</strong>
              <small>{{ card.description }}</small>
            </button>
          </div>
        </article>
      </section>

      <section v-if="state.phase === 'draft'" class="draft panel">
        <p class="quiz-kicker">CARD DRAFT</p>
        <h2>{{ draftTeam?.name }}がカードセットを選択</h2>
        <p>低VPのチームから順番に、3枚組を1セット獲得します。</p>
        <div class="draft-order">
          <span v-for="(teamIndex, orderIndex) in state.draftOrder" :key="teamIndex" :class="{ current: orderIndex === state.draftCursor }">{{ orderIndex + 1 }}. {{ state.teams[teamIndex].name }}</span>
        </div>
        <div class="card-sets">
          <button v-for="set in state.marketSets" :key="set.id" class="card-set" @click="chooseCardSet(set.id)">
            <span class="set-label">SET {{ set.label }}</span>
            <span v-for="card in set.cards" :key="card.uid" class="mini-card" :class="`card--${card.kind}`">
              <strong>{{ card.title }}</strong>
              <small>{{ card.description }}</small>
            </span>
          </button>
        </div>
      </section>

      <section v-if="state.phase === 'customize'" class="customize panel">
        <p class="quiz-kicker">CUSTOMIZE PHASE</p>
        <h2>カードを使ってスロットを改造</h2>
        <div class="timer" :class="{ expired: customizeRemaining === 0 }">
          {{ formatTime(customizeRemaining) }}
        </div>
        <p v-if="customizeRemaining > 0">各チームで相談し、上の所持カードから使用するカードを選んでください。未使用カードは次ラウンドへ持ち越せます。</p>
        <p v-else class="error">時間終了です。カード使用を終了し、次の10問へ進んでください。</p>
        <button class="primary" @click="finishCustomize">改造を終了して次の10問へ</button>
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

      <section v-if="pendingUse?.mode === 'target'" class="choice-modal panel">
        <h2>スロット権を無効にするチーム</h2>
        <div class="choice-row">
          <button v-for="(team, index) in state.teams" :key="team.id" :disabled="index === pendingUse.teamIndex" @click="applyBlock(index)">{{ team.name }}</button>
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
const customizeRemaining = ref(90)
const pendingUse = ref(null)
let spinRunId = 0
let customizeTimer = null

const saved = loadSaved()
const hasSave = ref(Boolean(saved))
const state = reactive(saved || emptyState())

const phaseLabel = computed(() => PHASE_LABELS[state.phase] || state.phase)
const winner = computed(() => state.phase === 'finished'
  ? [...state.teams].sort((left, right) => right.vp - left.vp)[0]
  : null)
const draftTeam = computed(() => state.teams[state.draftOrder?.[state.draftCursor]] || null)
const pendingTeam = computed(() => pendingUse.value ? state.teams[pendingUse.value.teamIndex] : null)

watch(state, saveState, { deep: true })
watch(() => state.phase, phase => {
  if (phase === 'customize') startCustomizeTimer()
  else stopCustomizeTimer()
}, { immediate: true })

function emptyState() {
  return {
    schemaVersion: 2,
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
      riskReturn: 0,
    },
    hand: [],
    nextRoundDouble: false,
    nextRoundBonus: 0,
    nextRoundBlocked: 0,
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

  addCopies(4, () => makeCard('upgrade', 'remove', 'リムーブ', '数字カードを1枚除外（最低10枚）'))
  addCopies(3, () => makeCard('upgrade', 'oneTwoBeat', 'ワンツービート', '1・2・1/2の出現枚数を毎スピンVP加算'))
  addCopies(3, () => makeCard('upgrade', 'luckyNumber', 'ラッキーナンバー', '得点が最大になる1マスを自動で7に変更'))
  addCopies(3, () => makeCard('upgrade', 'bigNumber', 'ビッグナンバー', '得点が最大になる1マスを自動で+1'))
  addCopies(3, () => makeCard('upgrade', 'smallNumber', 'スモールナンバー', '得点が最大になる1マスを自動で-1/-2'))
  addCopies(3, () => makeCard('upgrade', 'riskReturn', 'リスクリターン', '4種類以上の数字が出れば+5VP'))

  addCopies(4, () => makeCard('multiplier', 'horizontal1', '横倍率 ×1', '横の任意ラインを開放・強化', { orientation: 'horizontal', amount: 1 }))
  addCopies(4, () => makeCard('multiplier', 'vertical1', '縦倍率 ×1', '縦の任意ラインを開放・強化', { orientation: 'vertical', amount: 1 }))
  addCopies(3, () => makeCard('multiplier', 'vertical2', '縦倍率 ×2', '縦の任意ラインを×2強化', { orientation: 'vertical', amount: 2 }))
  addCopies(4, () => makeCard('multiplier', 'diagonal1', '斜め倍率 ×1', '斜めの任意ラインを開放・強化', { orientation: 'diagonal', amount: 1 }))
  addCopies(3, () => makeCard('multiplier', 'diagonal2', '斜め倍率 ×2', '斜めの任意ラインを×2強化', { orientation: 'diagonal', amount: 2 }))

  addCopies(3, () => makeCard('challenge', 'double', 'ダブルチャレンジ', '次ラウンドは正解1問につきスロット権2回'))
  addCopies(3, () => makeCard('challenge', 'bonus2', 'ボーナスチャレンジ', '次ラウンドのスロット権+2回'))
  addCopies(3, () => makeCard('challenge', 'block2', 'チャレンジブロック', '指定チームの次ラウンドの権利を2回無効化'))

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
  value.schemaVersion = 2
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
    team.abilities.riskReturn ||= 0
    team.hand ||= []
    team.nextRoundDouble ||= false
    team.nextRoundBonus ||= 0
    team.nextRoundBlocked ||= team.jammedSpins ? 2 : 0
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

function undo() {
  const previous = history.pop()
  if (!previous) return
  Object.assign(state, JSON.parse(previous))
  pendingUse.value = null
}

function startGame() {
  setupError.value = ''
  const names = setup.names.slice(0, setup.teamCount).map(name => name.trim())
  if (names.some(name => !name)) {
    setupError.value = 'すべてのチーム名を入力してください。'
    return
  }
  if (new Set(names).size !== names.length) {
    setupError.value = 'チーム名はそれぞれ異なる名前にしてください。'
    return
  }

  Object.assign(state, {
    ...emptyState(),
    phase: 'initial-spin',
    targetVp: setup.targetVp,
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
  if (value) Object.assign(state, value)
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
    const multiplier = team.nextRoundDouble ? 2 : 1
    team.spinRights = Math.max(0, team.roundCorrect * multiplier + team.nextRoundBonus - team.nextRoundBlocked)
    team.spinRightsRemaining = team.spinRights
    team.nextRoundDouble = false
    team.nextRoundBonus = 0
    team.nextRoundBlocked = 0
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
  const team = state.teams[index]
  const finalReels = drawReels(team)
  const runId = ++spinRunId
  state.phase = 'rolling'
  rollingTeamIndex.value = index
  stoppedColumns.value = []
  team.hitCells = []
  team.lastResult = 'リール回転中…'
  await animateReels(team, finalReels, runId)
  if (runId !== spinRunId) return

  const result = calculateSpin(team, finalReels)
  team.reels = result.reels
  team.hitCells = result.hitCells
  team.vp += result.points
  team.spinRightsRemaining--
  team.lastResult = result.message
  addLog(`${team.name}がスピンし、${result.points}VPを獲得。`)
  rollingTeamIndex.value = null
  stoppedColumns.value = []
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
        pendingUse.value = null
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
  if (state.phase !== 'customize' || customizeRemaining.value <= 0) return
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

  if (card.kind === 'challenge') {
    if (card.key === 'block2') {
      pendingUse.value = { mode: 'target', teamIndex, cardUid, card }
      return
    }
    snapshot()
    if (card.key === 'double') team.nextRoundDouble = true
    if (card.key === 'bonus2') team.nextRoundBonus += 2
    consumeHandCard(team, cardUid)
    team.lastResult = `${card.title}を次ラウンドへセット`
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
  if (!use || customizeRemaining.value <= 0) return
  snapshot()
  const team = state.teams[use.teamIndex]
  team.lineMultipliers[lineIndex] += use.card.amount
  consumeHandCard(team, use.cardUid)
  team.lastResult = `${LINE_NAMES[lineIndex]}を×${team.lineMultipliers[lineIndex]}へ強化`
  pendingUse.value = null
}

function applyRemove(numberUid) {
  const use = pendingUse.value
  if (!use || customizeRemaining.value <= 0) return
  const team = state.teams[use.teamIndex]
  if (team.numberDeck.length <= 10) return
  snapshot()
  const cardIndex = team.numberDeck.findIndex(card => card.uid === numberUid)
  if (cardIndex >= 0) team.numberDeck.splice(cardIndex, 1)
  consumeHandCard(team, use.cardUid)
  team.lastResult = '数字カードを1枚リムーブ'
  pendingUse.value = null
}

function applyBlock(targetIndex) {
  const use = pendingUse.value
  if (!use || customizeRemaining.value <= 0 || targetIndex === use.teamIndex) return
  snapshot()
  const team = state.teams[use.teamIndex]
  state.teams[targetIndex].nextRoundBlocked += 2
  consumeHandCard(team, use.cardUid)
  team.lastResult = `${state.teams[targetIndex].name}の次ラウンド権利を2回無効化`
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
  }
  window.clearInterval(interval)
  await wait(200)
}

function calculateSpin(team, originalReels) {
  const originalBonus = originalReels.reduce((sum, card) => sum + (card?.bonus || 0), 0)
  let reels = originalReels.map(card => ({ ...card }))
  const notes = []

  reels = applyBestConversions(team, reels, 'luckyNumber', [7], notes, 'ラッキー7')
  reels = applyBestConversions(team, reels, 'bigNumber', [1], notes, '+1')
  reels = applyBestConversions(team, reels, 'smallNumber', [-1, -2], notes, '-1/-2')

  const lineResult = scoreReels(team, reels)
  const oneTwoCount = originalReels.filter(card => card?.key === 'wild12' || card?.value === 1 || card?.value === 2).length
  const oneTwoBonus = oneTwoCount * (team.abilities.oneTwoBeat || 0)
  const distinct = new Set(originalReels.map(card => card?.key === 'wild12' ? '1/2' : card?.value)).size
  const riskBonus = distinct >= 4 ? 5 * (team.abilities.riskReturn || 0) : 0
  const points = lineResult.points + originalBonus + oneTwoBonus + riskBonus

  if (originalBonus) notes.push(`出現+${originalBonus}`)
  if (oneTwoBonus) notes.push(`ワンツー+${oneTwoBonus}`)
  if (riskBonus) notes.push(`リスクリターン+${riskBonus}`)
  const lineText = lineResult.hitCount ? `${lineResult.hitCount}ライン` : 'ラインなし'
  const noteText = notes.length ? `（${notes.join('、')}）` : ''
  return {
    points,
    reels,
    hitCells: lineResult.hitCells,
    message: `${lineText}・合計+${points}VP${noteText}`,
  }
}

function applyBestConversions(team, sourceReels, abilityKey, deltas, notes, label) {
  let reels = sourceReels.map(card => ({ ...card }))
  const count = team.abilities[abilityKey] || 0
  for (let useIndex = 0; useIndex < count; useIndex++) {
    const current = scoreReels(team, reels).points
    let best = { points: current, reels }
    reels.forEach((card, cardIndex) => {
      const baseValue = card.key === 'wild12' ? 2 : card.value
      deltas.forEach(deltaOrValue => {
        const value = abilityKey === 'luckyNumber' ? deltaOrValue : baseValue + deltaOrValue
        if (value < 1 || value > 7) return
        const candidate = reels.map((item, index) => index === cardIndex
          ? { ...item, key: String(value), value, label: String(value) }
          : { ...item })
        const points = scoreReels(team, candidate).points
        if (points > best.points) best = { points, reels: candidate }
      })
    })
    if (best.points > current) {
      reels = best.reels
      notes.push(label)
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

function deckSummary(team) {
  const counts = team.numberDeck.reduce((result, card) => {
    const label = numberCardLabel(card)
    result[label] = (result[label] || 0) + 1
    return result
  }, {})
  return Object.entries(counts).map(([label, count]) => `${label}×${count}`).join('、')
}

function abilitySummary(team) {
  const labels = []
  if (team.abilities.oneTwoBeat) labels.push(`ワンツー×${team.abilities.oneTwoBeat}`)
  if (team.abilities.luckyNumber) labels.push(`ラッキー×${team.abilities.luckyNumber}`)
  if (team.abilities.bigNumber) labels.push(`ビッグ×${team.abilities.bigNumber}`)
  if (team.abilities.smallNumber) labels.push(`スモール×${team.abilities.smallNumber}`)
  if (team.abilities.riskReturn) labels.push(`リスク×${team.abilities.riskReturn}`)
  if (team.nextRoundDouble) labels.push('次回ダブル')
  if (team.nextRoundBonus) labels.push(`次回+${team.nextRoundBonus}`)
  if (team.nextRoundBlocked) labels.push(`次回-${team.nextRoundBlocked}`)
  return labels.length ? `装備：${labels.join(' / ')}` : '装備：なし'
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

function wait(milliseconds) {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds))
}

function addLog(message) {
  state.log.unshift(`R${state.roundNumber} ${message}`)
  state.log = state.log.slice(0, 100)
}

function confirmReset() {
  if (!window.confirm('現在のゲームを終了して、新しい対戦設定へ戻りますか？')) return
  localStorage.removeItem(STORAGE_KEY)
  history.splice(0)
  pendingUse.value = null
  Object.assign(state, emptyState())
  hasSave.value = false
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify({ app: 'custom-slot-millionaire', version: 2, state }, null, 2)], { type: 'application/json' })
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
})
</script>

<style scoped>
.slot-game { min-height: 100vh; padding: 18px; background: radial-gradient(circle at top, #3a2304, #100d09 55%); color: #fff8e1; }
.slot-header { max-width: 1180px; margin: 0 auto 16px; display: grid; grid-template-columns: 100px 1fr 100px; align-items: center; text-align: center; }
.slot-header h1 { margin: 2px 0; font-size: clamp(1.35rem, 4vw, 2.3rem); color: #ffd54f; }
.eyebrow, .quiz-kicker { margin: 0; color: #bcaaa4; font-size: .68rem; letter-spacing: .2em; }
.panel { max-width: 900px; margin: 14px auto; padding: 18px; border: 1px solid rgba(255,193,7,.25); border-radius: 16px; background: rgba(20,16,10,.86); }
.guide { line-height: 1.8; }
.setup { max-width: 560px; display: grid; gap: 14px; }
.setup h2, .quiz-console h2, .draft h2, .customize h2 { margin: 0; color: #ffd54f; }
.choice-row, .setup-actions, .data-actions { display: flex; flex-wrap: wrap; gap: 8px; }
button, .file-button { border: 1px solid rgba(255,255,255,.16); border-radius: 9px; padding: 10px 14px; background: rgba(255,255,255,.07); color: #fff; cursor: pointer; font-family: inherit; }
button:hover:not(:disabled), .file-button:hover { border-color: #ffd54f; }
button:disabled { opacity: .35; cursor: not-allowed; }
button.selected, .primary { background: #e65100; border-color: #ffb300; font-weight: 800; }
.secondary, .ghost-button { background: transparent; }
.team-inputs { display: grid; gap: 10px; }
.team-inputs label { display: grid; gap: 5px; color: #bcaaa4; }
.team-inputs input { padding: 11px; border: 1px solid #5d4037; border-radius: 8px; background: #1d1712; color: #fff; font-size: 1rem; }
.status { max-width: 1180px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 20px; }
.status div { display: grid; text-align: center; }
.status span { color: #a1887f; font-size: .7rem; }
.quiz-console { text-align: center; }
.quiz-buttons { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
.quiz-buttons button:not(.secondary) { background: color-mix(in srgb, var(--team) 65%, #222); border-color: var(--team); font-weight: 900; }
.round-corrects, .draft-order { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; }
.round-corrects span, .draft-order span { padding: 5px 10px; border-radius: 99px; background: rgba(255,255,255,.06); color: #bcaaa4; font-size: .75rem; }
.draft-order span.current { color: #ffd54f; border: 1px solid #ffb300; }
.teams { max-width: 1180px; margin: 16px auto; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.team-card { --team: #ffb300; padding: 16px; border: 2px solid color-mix(in srgb, var(--team) 35%, transparent); border-radius: 18px; background: rgba(0,0,0,.45); box-shadow: inset 0 0 30px color-mix(in srgb, var(--team) 7%, transparent); }
.team-card.active { border-color: var(--team); box-shadow: 0 0 24px color-mix(in srgb, var(--team) 35%, transparent); }
.team-card.winner { animation: winner 1s infinite alternate; }
.team-heading { display: flex; justify-content: space-between; align-items: center; }
.team-number { color: var(--team); font-size: .65rem; font-weight: 800; }
.team-heading h2 { margin: 2px 0; font-size: 1.3rem; }
.score { display: flex; align-items: baseline; gap: 4px; }
.score strong { color: var(--team); font-size: 2.2rem; }
.score span { font-size: .7rem; }
.meter { height: 7px; margin: 8px 0; border-radius: 99px; background: #241d17; overflow: hidden; }
.meter i { display: block; height: 100%; background: var(--team); transition: width .3s; }
.resources { display: flex; justify-content: space-between; color: #bcaaa4; font-size: .75rem; }
.reel-stage { position: relative; margin: 14px 0 8px; }
.reels { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 14px 0; }
.reels span { position: relative; z-index: 2; aspect-ratio: 1.25; display: grid; place-items: center; border: 2px solid #4e342e; border-radius: 10px; background: linear-gradient(#fff8e1, #d7ccc8); color: #3e2723; font-size: clamp(1.1rem, 4vw, 2rem); font-weight: 900; }
.reels span.hit { border-color: #ffb300; color: #d84315; box-shadow: 0 0 13px #ffb300; transform: scale(1.03); }
.payline { --line: #ffb300; position: absolute; z-index: 3; height: 0; border-top: 2px dashed rgba(120,120,120,.35); pointer-events: none; opacity: .35; transform-origin: center; }
.payline.enabled { border-top: 3px solid var(--line); opacity: .78; filter: drop-shadow(0 0 3px #000); }
.payline--0, .payline--1, .payline--2 { left: 2%; width: 96%; }
.payline--0 { top: 16.5%; } .payline--1 { top: 50%; } .payline--2 { top: 83.5%; }
.payline--3, .payline--4, .payline--5 { top: 50%; width: 96%; transform: rotate(90deg); }
.payline--3 { left: -31.5%; } .payline--4 { left: 2%; } .payline--5 { left: 35.5%; }
.payline--6, .payline--7 { left: -8%; top: 50%; width: 116%; }
.payline--6 { transform: rotate(43deg); } .payline--7 { transform: rotate(-43deg); }
.line-status { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.line-status span { display: flex; justify-content: space-between; gap: 4px; padding: 4px 5px; border: 1px dashed rgba(255,255,255,.12); border-radius: 5px; color: #5d5048; font-size: .58rem; }
.line-status span.enabled { border-style: solid; border-color: color-mix(in srgb, var(--team) 40%, transparent); color: #d7ccc8; background: color-mix(in srgb, var(--team) 8%, transparent); }
.deck-status, .ability-status { min-height: 1.4em; margin: 7px 0; color: #8d7d74; font-size: .63rem; line-height: 1.4; }
.result { min-height: 2.4em; margin: 8px 0; color: #ffe082; text-align: center; font-size: .82rem; }
.result--confirmed { padding: 10px 6px; border: 1px solid #ffb300; border-radius: 9px; background: rgba(255,179,0,.12); font-size: 1rem; font-weight: 900; }
.spin-button, .continue-button { width: 100%; background: linear-gradient(135deg, #ef6c00, #d84315); border-color: #ffb300; font-weight: 900; }
.rolling-cell { color: #f4511e !important; filter: blur(1px); animation: reel-roll .14s linear infinite; }
.rolling-message { min-height: 42px; display: flex; align-items: center; justify-content: center; gap: 9px; color: #ffd54f; font-size: .78rem; font-weight: 900; letter-spacing: .18em; }
.rolling-lamp { width: 9px; height: 9px; border-radius: 50%; background: #ffb300; box-shadow: 0 0 12px #ffb300; animation: lamp .45s ease-in-out infinite alternate; }
.card-sets { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 16px; }
.card-set { display: grid; gap: 7px; padding: 10px; text-align: left; }
.set-label { color: #ffd54f; font-size: .65rem; letter-spacing: .15em; }
.mini-card, .hand-card { display: grid; gap: 3px; padding: 9px; border-left: 4px solid #795548; border-radius: 7px; background: rgba(255,255,255,.06); }
.mini-card small, .hand-card small { color: #a1887f; line-height: 1.35; }
.card--number { border-left-color: #42a5f5; }
.card--upgrade { border-left-color: #ab47bc; }
.card--multiplier { border-left-color: #ffa726; }
.card--challenge { border-left-color: #66bb6a; }
.hand { display: grid; gap: 6px; margin-top: 12px; }
.hand h3 { margin: 0; color: #ffd54f; font-size: .8rem; }
.hand-card { width: 100%; text-align: left; }
.empty { color: #6d5f58; font-size: .7rem; }
.customize { text-align: center; }
.timer { margin: 14px auto; color: #ffd54f; font-size: clamp(2.5rem, 8vw, 5rem); font-weight: 900; }
.timer.expired { color: #ef5350; }
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
@media (prefers-reduced-motion: reduce) {
  .rolling-cell, .rolling-lamp, .team-card.winner { animation: none; }
}
@media (max-width: 760px) {
  .slot-game { padding: 10px; }
  .slot-header { grid-template-columns: 70px 1fr 70px; }
  .slot-header .ghost-button { padding: 8px 4px; font-size: .7rem; }
  .teams, .card-sets { grid-template-columns: 1fr; }
  .status { gap: 10px; }
  .quiz-buttons { grid-template-columns: 1fr 1fr; }
  .team-card { padding: 13px; }
  .reels span { aspect-ratio: 1.6; }
  .line-status, .line-upgrade-grid { grid-template-columns: repeat(2, 1fr); }
  .remove-grid { grid-template-columns: repeat(5, 1fr); }
}
</style>
