<template>
  <main class="wordle-game">
    <header class="wordle-header">
      <button class="wordle-button wordle-button--ghost" @click="emit('back')">← ホーム</button>
      <div>
        <p>QUIZ × WORD GAME</p>
        <h1>文字あて Wordle</h1>
      </div>
      <div class="wordle-header__actions">
        <button class="wordle-button wordle-button--display" @click="openDisplayWindow">会場表示を開く</button>
        <button class="wordle-button wordle-button--ghost" @click="showRules = !showRules">ルール</button>
        <button v-if="state.phase !== 'setup'" class="wordle-button wordle-button--ghost" @click="confirmNewGame">新しいゲーム</button>
      </div>
    </header>

    <section v-if="showRules" class="wordle-panel wordle-rules">
      <h2>ルール</h2>
      <ol>
        <li>各チームは、同じ文字を使わない5文字の秘密ワードを1つ用意します。</li>
        <li>クイズに正解したチームは、相手チームを1つ選んで5文字を1回予想できます。</li>
        <li><b class="legend-exact">赤</b>は文字も場所も一致、<b class="legend-present">黄</b>は文字だけ一致、灰色は使われていない文字です。</li>
        <li>濁音・半濁音・小さい文字・長音は、それぞれ別の1文字として判定します。</li>
        <li>秘密ワード内では同じ文字を2回使えません。予想する言葉では同じ文字を使えます。</li>
        <li>チーム同士の秘密ワードは同じでも構いません。</li>
        <li>秘密ワードを当てられたチームは撃破。最後まで秘密ワードが残ったチームが勝利です。</li>
        <li>秘密ワードの登録と文字入力は操作用画面だけで行い、会場表示へ未正解の秘密ワードは送りません。</li>
        <li>シンキングタイマーは30秒です。スタートボタンを押すまで減らず、0秒でも進行は自動で変わりません。</li>
      </ol>
    </section>

    <section v-if="state.phase === 'setup'" class="wordle-panel wordle-setup">
      <div class="wordle-setup__heading">
        <div>
          <p class="wordle-kicker">GAME SETUP</p>
          <h2>チームと秘密ワードを設定</h2>
        </div>
        <button v-if="hasSave" class="wordle-button wordle-button--secondary" @click="resumeGame">保存したゲームを再開</button>
      </div>

      <label class="wordle-field">
        <span>チーム数</span>
        <span class="wordle-choice-row">
          <button
            v-for="count in [2, 3]"
            :key="count"
            type="button"
            class="wordle-button"
            :class="{ selected: setup.teamCount === count }"
            @click="setup.teamCount = count"
          >{{ count }}チーム</button>
        </span>
      </label>

      <div class="wordle-setup__teams">
        <article
          v-for="(team, index) in setup.teams.slice(0, setup.teamCount)"
          :key="index"
          class="wordle-setup-team"
          :style="{ '--team': TEAM_COLORS[index] }"
        >
          <strong>TEAM {{ index + 1 }}</strong>
          <label>
            <span>チーム名</span>
            <input v-model.trim="team.name" maxlength="12" :placeholder="`チーム${index + 1}`" />
          </label>
          <label>
            <span>秘密の5文字</span>
            <span class="secret-input-row">
              <input
                v-model="team.secret"
                :type="visibleSecrets.has(index) ? 'text' : 'password'"
                maxlength="10"
                autocomplete="off"
                spellcheck="false"
                placeholder="例：つきあかり"
                @input="setupError = ''"
              />
              <button
                type="button"
                class="wordle-button wordle-button--ghost secret-toggle"
                :aria-label="visibleSecrets.has(index) ? '秘密ワードを隠す' : '秘密ワードを表示'"
                @click="toggleSecret(index)"
              >{{ visibleSecrets.has(index) ? '隠す' : '見る' }}</button>
            </span>
          </label>
        </article>
      </div>

      <p class="wordle-note">秘密ワード内の文字重複は不可ですが、別チームと同じ秘密ワードでも構いません。「か」と「が」、「は」と「ぱ」は別の文字です。</p>
      <p class="wordle-secret-note">🔒 この登録内容は操作用画面だけに保存され、会場表示用データには含まれません。</p>
      <p v-if="setupError" class="wordle-error">{{ setupError }}</p>
      <button class="wordle-button wordle-button--primary wordle-start" @click="startGame">ゲーム開始</button>
    </section>

    <template v-else>
      <section class="wordle-progress wordle-panel" aria-live="polite">
        <div>
          <span>いまやること</span>
          <strong>{{ phaseInstruction }}</strong>
        </div>
        <div class="wordle-legend" aria-label="文字判定の色">
          <span class="legend-chip exact">赤：文字と場所が一致</span>
          <span class="legend-chip present">黄：文字だけ一致</span>
          <span class="legend-chip absent">灰：使われていない</span>
        </div>
        <button class="wordle-button wordle-button--secondary" :disabled="!undoStack.length" @click="undo">↶ 直前の予想を取り消す</button>
      </section>

      <section
        class="wordle-boards"
        :style="{ '--team-count': state.teams.length }"
        aria-label="チーム別文字あてボード"
      >
        <article
          v-for="(team, teamIndex) in state.teams"
          :key="team.id"
          class="wordle-board"
          :class="{
            eliminated: Boolean(team.solvedBy),
            targeted: state.targetIndex === teamIndex,
            challenger: state.challengerIndex === teamIndex,
          }"
          :style="{ '--team': team.color }"
        >
          <header class="wordle-board__header">
            <div>
              <span>TEAM {{ teamIndex + 1 }}</span>
              <h2>{{ team.name }}</h2>
            </div>
            <div class="wordle-board__actions">
              <strong v-if="team.solvedBy" class="team-status team-status--out">撃破</strong>
              <strong v-else-if="state.phase === 'finished'" class="team-status team-status--winner">WINNER</strong>
              <strong v-else class="team-status">防衛中</strong>
              <button class="history-button" type="button" @click="openHistory(teamIndex)">全履歴 {{ team.guesses.length }}件</button>
              <button class="history-button" type="button" @click="openKana(teamIndex)">未使用の五十音</button>
              <button v-if="state.phase === 'finished' && !team.solvedBy && !team.answerRevealed" class="history-button reveal-button" type="button" @click="revealAnswer(teamIndex)">答えを公開</button>
            </div>
          </header>

          <div class="answer-row" :aria-label="team.solvedBy ? `正解は${team.secret}` : '秘密ワードは非表示'">
            <span
              v-for="(character, index) in displayAnswer(team)"
              :key="index"
              :class="{ revealed: Boolean(team.solvedBy) || team.answerRevealed }"
            >{{ character }}</span>
          </div>

          <div class="guess-history" :aria-label="`${team.name}への予想履歴`">
            <div v-for="guess in team.guesses" :key="guess.id" class="guess-entry">
              <small>{{ challengerName(guess.challengerId) }}</small>
              <div class="guess-row">
                <span
                  v-for="(character, index) in splitWordleWord(guess.word)"
                  :key="index"
                  :class="`letter-${guess.result[index]}`"
                >{{ character }}</span>
              </div>
            </div>
            <div v-for="emptyIndex in Math.max(0, 5 - team.guesses.length)" :key="`empty-${emptyIndex}`" class="guess-entry guess-entry--empty" aria-hidden="true">
              <small>CHALLENGE</small>
              <div class="guess-row"><span v-for="index in WORDLE_LENGTH" :key="index">・</span></div>
            </div>
          </div>
        </article>
      </section>

      <section v-if="state.phase !== 'finished'" class="wordle-panel challenge-console">
        <div class="thinking-timer" :class="{ urgent: state.thinkingSeconds <= 5, running: state.thinkingRunning }">
          <div>
            <span>THINKING TIMER</span>
            <strong>{{ formattedThinkingTime }}</strong>
          </div>
          <div class="thinking-timer__actions">
            <button class="wordle-button wordle-button--primary" type="button" @click="toggleThinkingTimer">
              {{ state.thinkingRunning ? '⏸ 一時停止' : state.thinkingSeconds < 30 && state.thinkingSeconds > 0 ? '▶ 再開' : '▶ スタート' }}
            </button>
            <button class="wordle-button wordle-button--ghost" type="button" @click="resetThinkingTimer">↻ 30秒</button>
          </div>
        </div>

        <div v-if="state.challengerIndex === null" class="challenge-step">
          <p class="wordle-kicker">QUIZ CORRECT</p>
          <h2>クイズに正解したチームを選択</h2>
          <div class="challenge-team-buttons">
            <button
              v-for="(team, index) in state.teams"
              :key="team.id"
              class="wordle-button challenge-team-button"
              :style="{ '--team': team.color }"
              :disabled="Boolean(team.solvedBy)"
              @click="selectChallenger(index)"
            >{{ team.name }}</button>
          </div>
        </div>

        <div v-else-if="state.targetIndex === null" class="challenge-step">
          <p class="wordle-kicker">TARGET SELECT</p>
          <h2>{{ challengerTeam.name }}が攻撃する相手を選択</h2>
          <div class="challenge-team-buttons">
            <button
              v-for="entry in targetCandidates"
              :key="entry.team.id"
              class="wordle-button challenge-team-button"
              :style="{ '--team': entry.team.color }"
              @click="selectTarget(entry.index)"
            >{{ entry.team.name }}</button>
          </div>
          <button class="wordle-button wordle-button--ghost" @click="cancelChallenge">正解チームを選び直す</button>
        </div>

        <form v-else class="challenge-step challenge-input" @submit.prevent="submitGuess">
          <p class="wordle-kicker">WORD CHALLENGE</p>
          <h2>{{ challengerTeam.name }} → {{ targetTeam.name }}</h2>
          <label for="wordle-guess">5文字を入力（同じ文字を使ってもOK）</label>
          <div class="challenge-input__row">
            <input
              id="wordle-guess"
              ref="guessInputElement"
              v-model="guessInput"
              maxlength="10"
              autocomplete="off"
              spellcheck="false"
              placeholder="5文字"
              @input="guessError = ''"
            />
            <button class="wordle-button wordle-button--primary" type="submit">判定する</button>
          </div>
          <p v-if="guessError" class="wordle-error">{{ guessError }}</p>
          <button class="wordle-button wordle-button--ghost" type="button" @click="cancelChallenge">キャンセル</button>
        </form>
      </section>

      <section v-if="state.phase === 'finished' && winner && state.showWinnerOverlay" class="wordle-winner" aria-live="assertive">
        <span>WORD SURVIVOR</span>
        <strong>{{ winner.name }}</strong>
        <p v-if="winner.answerRevealed">秘密ワード「{{ winner.secret }}」を守り切りました</p>
        <p v-else>秘密ワードはまだ非公開です</p>
        <div class="winner-actions">
          <button v-if="!winner.answerRevealed" class="wordle-button wordle-button--primary" @click="revealAnswer(state.teams.indexOf(winner))">答えを公開</button>
          <button class="wordle-button wordle-button--secondary" @click="state.showWinnerOverlay = false">盤面と履歴を見る</button>
          <button class="wordle-button wordle-button--primary" @click="confirmNewGame">新しいゲーム</button>
        </div>
      </section>

      <section v-if="historyTeam" class="history-overlay" role="dialog" aria-modal="true" :aria-label="`${historyTeam.name}の全履歴`" @click.self="closeHistory">
        <article class="history-overlay__panel" :style="{ '--team': historyTeam.color }">
          <header>
            <div>
              <span>FULL HISTORY</span>
              <h2>{{ historyTeam.name }}への予想 全{{ historyTeam.guesses.length }}件</h2>
            </div>
            <button class="wordle-button wordle-button--ghost" type="button" @click="closeHistory">✕ 閉じる</button>
          </header>
          <p v-if="historyTeam.guesses.length === 0" class="history-empty">まだ予想履歴はありません。</p>
          <div v-else class="history-overlay__list" :style="historyGridStyle(historyTeam)">
            <div v-for="(guess, guessIndex) in historyTeam.guesses" :key="guess.id" class="history-overlay__entry">
              <strong>#{{ guessIndex + 1 }}</strong>
              <small>{{ challengerName(guess.challengerId) }}</small>
              <div class="guess-row">
                <span
                  v-for="(character, index) in splitWordleWord(guess.word)"
                  :key="index"
                  :class="`letter-${guess.result[index]}`"
                >{{ character }}</span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section v-if="kanaTeam" class="kana-overlay" role="dialog" aria-modal="true" :aria-label="`${kanaTeam.name}の未使用五十音`" @click.self="closeKana">
        <article class="kana-overlay__panel" :style="{ '--team': kanaTeam.color }">
          <header>
            <div>
              <span>UNUSED KANA</span>
              <h2>{{ kanaTeam.name }}がまだ使っていない文字</h2>
            </div>
            <button class="wordle-button wordle-button--ghost" type="button" @click="closeKana">✕ 閉じる</button>
          </header>
          <p>このチームへの予想履歴に、まだ一度も登場していない文字です。</p>
          <div class="kana-groups">
            <section v-for="group in unusedKanaGroups" :key="group.label" class="kana-group">
              <h3>{{ group.label }} <small>{{ group.characters.length }}字</small></h3>
              <div class="kana-characters">
                <span v-for="character in group.characters" :key="character">{{ character }}</span>
                <em v-if="group.characters.length === 0">すべて使用済み</em>
              </div>
            </section>
          </div>
        </article>
      </section>

      <details class="wordle-panel wordle-data">
        <summary>データ管理</summary>
        <p>バックアップにはチーム名と秘密ワードが含まれます。共有時は内容を確認してください。</p>
        <div>
          <button class="wordle-button wordle-button--secondary" @click="downloadBackup">JSONバックアップ</button>
          <label class="wordle-button wordle-button--secondary file-button">JSONから復元<input type="file" accept="application/json" @change="restoreBackup" /></label>
        </div>
        <p v-if="dataError" class="wordle-error">{{ dataError }}</p>
      </details>
    </template>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import {
  WORDLE_DISPLAY_CHANNEL,
  WORDLE_DISPLAY_STORAGE_KEY,
  WORDLE_LENGTH,
  createWordlePublicState,
  evaluateWordleGuess,
  getUnusedWordleKana,
  isWordleSolved,
  normalizeWordleWord,
  splitWordleWord,
  validateWordleGuess,
  validateWordleWord,
} from '../utils/wordle.js'

const emit = defineEmits(['back'])
const STORAGE_KEY = 'piyopiyo_wordle_v1'
const TEAM_COLORS = ['#42a5f5', '#ef5350', '#66bb6a']

const setup = reactive({
  teamCount: 3,
  teams: [
    { name: 'ブルー', secret: '' },
    { name: 'レッド', secret: '' },
    { name: 'グリーン', secret: '' },
  ],
})
const savedState = loadSaved()
const state = reactive(savedState || emptyState())
const showRules = ref(false)
const visibleSecrets = ref(new Set())
const setupError = ref('')
const guessError = ref('')
const dataError = ref('')
const guessInput = ref('')
const guessInputElement = ref(null)
const undoStack = ref([])
const hasSave = ref(Boolean(savedState))
const displayChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(WORDLE_DISPLAY_CHANNEL) : null
let thinkingTimerHandle = null

const challengerTeam = computed(() => state.teams[state.challengerIndex] || null)
const targetTeam = computed(() => state.teams[state.targetIndex] || null)
const targetCandidates = computed(() => state.teams
  .map((team, index) => ({ team, index }))
  .filter(entry => entry.index !== state.challengerIndex && !entry.team.solvedBy))
const winner = computed(() => state.phase === 'finished' ? state.teams.find(team => !team.solvedBy) || null : null)
const historyTeam = computed(() => state.teams[state.displayHistoryTeamIndex] || null)
const kanaTeam = computed(() => state.teams[state.displayKanaTeamIndex] || null)
const unusedKanaGroups = computed(() => getUnusedWordleKana(kanaTeam.value?.guesses || []))
const formattedThinkingTime = computed(() => `00:${String(state.thinkingSeconds).padStart(2, '0')}`)
const phaseInstruction = computed(() => {
  if (state.phase === 'finished') return `${winner.value?.name || '勝者'}の勝利`
  if (state.challengerIndex === null) return 'クイズ正解チームを選ぶ'
  if (state.targetIndex === null) return `${challengerTeam.value?.name || '正解チーム'}が攻撃先を選ぶ`
  return `${challengerTeam.value?.name || '正解チーム'}が${targetTeam.value?.name || '相手'}の5文字を予想する`
})

watch(state, saveState, { deep: true, immediate: true })

onMounted(() => {
  if (displayChannel) {
    displayChannel.onmessage = event => {
      const teamIndex = event.data.teamIndex
      const validIndex = Number.isInteger(teamIndex) && state.teams[teamIndex] ? teamIndex : null
      if (event.data?.type === 'history-request') {
        state.displayHistoryTeamIndex = validIndex
        state.displayKanaTeamIndex = null
      } else if (event.data?.type === 'kana-request') {
        state.displayKanaTeamIndex = validIndex
        state.displayHistoryTeamIndex = null
      }
    }
  }
})

onUnmounted(() => {
  clearInterval(thinkingTimerHandle)
  displayChannel?.close()
})

function emptyState() {
  return {
    schemaVersion: 1,
    phase: 'setup',
    teams: [],
    challengerIndex: null,
    targetIndex: null,
    displayHistoryTeamIndex: null,
    displayKanaTeamIndex: null,
    thinkingSeconds: 30,
    thinkingRunning: false,
    showWinnerOverlay: true,
  }
}

function makeTeam(team, index) {
  return {
    id: `wordle-team-${Date.now()}-${index}`,
    name: team.name,
    color: TEAM_COLORS[index],
    secret: normalizeWordleWord(team.secret),
    guesses: [],
    solvedBy: null,
    answerRevealed: false,
  }
}

function migrateState(value) {
  value.schemaVersion = 1
  value.phase = ['play', 'finished'].includes(value.phase) ? value.phase : 'setup'
  value.teams = Array.isArray(value.teams) ? value.teams.slice(0, 3).map((team, index) => ({
    id: team.id || `wordle-team-${Date.now()}-${index}`,
    name: String(team.name || `チーム${index + 1}`).slice(0, 12),
    color: team.color || TEAM_COLORS[index],
    secret: normalizeWordleWord(team.secret),
    guesses: Array.isArray(team.guesses) ? team.guesses.map((guess, guessIndex) => ({
      id: guess.id || `guess-${Date.now()}-${index}-${guessIndex}`,
      challengerId: guess.challengerId || null,
      word: normalizeWordleWord(guess.word),
      result: Array.isArray(guess.result) ? guess.result.slice(0, WORDLE_LENGTH) : [],
    })) : [],
    solvedBy: team.solvedBy || null,
    answerRevealed: Boolean(team.answerRevealed),
  })) : []
  value.challengerIndex = Number.isInteger(value.challengerIndex) ? value.challengerIndex : null
  value.targetIndex = Number.isInteger(value.targetIndex) ? value.targetIndex : null
  value.displayHistoryTeamIndex = Number.isInteger(value.displayHistoryTeamIndex) ? value.displayHistoryTeamIndex : null
  value.displayKanaTeamIndex = Number.isInteger(value.displayKanaTeamIndex) ? value.displayKanaTeamIndex : null
  value.thinkingSeconds = Number.isInteger(value.thinkingSeconds) ? Math.max(0, Math.min(30, value.thinkingSeconds)) : 30
  value.thinkingRunning = false
  value.showWinnerOverlay = value.showWinnerOverlay !== false
  return value
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value = JSON.parse(raw)
    if (!Array.isArray(value.teams)) return null
    return migrateState(value)
  } catch {
    return null
  }
}

function saveState() {
  syncDisplayState()
  if (state.phase === 'setup') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    hasSave.value = true
  } catch {
    dataError.value = 'ゲームを保存できませんでした。ブラウザの保存容量を確認してください。'
  }
}

function syncDisplayState() {
  try {
    const publicState = createWordlePublicState(state)
    localStorage.setItem(WORDLE_DISPLAY_STORAGE_KEY, JSON.stringify(publicState))
    displayChannel?.postMessage(publicState)
  } catch {
    dataError.value = '会場表示へ同期できませんでした。ブラウザの保存容量を確認してください。'
  }
}

function openDisplayWindow() {
  syncDisplayState()
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('view', 'wordle-display')
  window.open(url, 'piyopiyo-wordle-display', 'popup=yes,width=1440,height=900')
}

function toggleSecret(index) {
  const next = new Set(visibleSecrets.value)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  visibleSecrets.value = next
}

function startGame() {
  setupError.value = ''
  const teams = setup.teams.slice(0, setup.teamCount)
  const names = teams.map(team => String(team.name || '').trim())
  if (names.some(name => !name)) {
    setupError.value = 'すべてのチーム名を入力してください。'
    return
  }
  if (new Set(names).size !== names.length) {
    setupError.value = 'チーム名はそれぞれ異なる名前にしてください。'
    return
  }
  const validations = teams.map(team => validateWordleWord(team.secret))
  const invalidIndex = validations.findIndex(result => !result.valid)
  if (invalidIndex >= 0) {
    setupError.value = `${names[invalidIndex]}：${validations[invalidIndex].error}`
    return
  }
  Object.assign(state, {
    schemaVersion: 1,
    phase: 'play',
    teams: teams.map((team, index) => makeTeam({ ...team, name: names[index], secret: validations[index].word }, index)),
    challengerIndex: null,
    targetIndex: null,
    displayHistoryTeamIndex: null,
    displayKanaTeamIndex: null,
    thinkingSeconds: 30,
    thinkingRunning: false,
    showWinnerOverlay: true,
  })
  visibleSecrets.value = new Set()
  undoStack.value = []
  guessInput.value = ''
}

function resumeGame() {
  const saved = loadSaved()
  if (!saved) {
    setupError.value = '保存したゲームを読み込めませんでした。'
    return
  }
  Object.assign(state, saved)
  stopThinkingTimer()
  guessInput.value = ''
  undoStack.value = []
}

function selectChallenger(index) {
  if (state.teams[index]?.solvedBy) return
  resetThinkingTimer()
  state.challengerIndex = index
  const candidates = state.teams
    .map((team, targetIndex) => ({ team, targetIndex }))
    .filter(entry => entry.targetIndex !== index && !entry.team.solvedBy)
  state.targetIndex = candidates.length === 1 ? candidates[0].targetIndex : null
  focusGuessInput()
}

function selectTarget(index) {
  if (!targetCandidates.value.some(entry => entry.index === index)) return
  state.targetIndex = index
  focusGuessInput()
}

function cancelChallenge() {
  resetThinkingTimer()
  state.challengerIndex = null
  state.targetIndex = null
  guessInput.value = ''
  guessError.value = ''
}

async function focusGuessInput() {
  await nextTick()
  guessInputElement.value?.focus()
}

function submitGuess() {
  if (!challengerTeam.value || !targetTeam.value) return
  const validation = validateWordleGuess(guessInput.value)
  if (!validation.valid) {
    guessError.value = validation.error
    return
  }
  undoStack.value.push(JSON.stringify(state))
  if (undoStack.value.length > 20) undoStack.value.shift()
  const result = evaluateWordleGuess(validation.word, targetTeam.value.secret)
  targetTeam.value.guesses.push({
    id: `guess-${Date.now()}`,
    challengerId: challengerTeam.value.id,
    word: validation.word,
    result,
  })
  if (isWordleSolved(result)) {
    targetTeam.value.solvedBy = challengerTeam.value.id
    const survivors = state.teams.filter(team => !team.solvedBy)
    if (survivors.length === 1) {
      state.phase = 'finished'
      state.showWinnerOverlay = true
    }
  }
  cancelChallenge()
}

function toggleThinkingTimer() {
  if (state.thinkingRunning) {
    stopThinkingTimer()
    return
  }
  if (state.thinkingSeconds <= 0) state.thinkingSeconds = 30
  state.thinkingRunning = true
  clearInterval(thinkingTimerHandle)
  thinkingTimerHandle = setInterval(() => {
    if (!state.thinkingRunning) return
    state.thinkingSeconds = Math.max(0, state.thinkingSeconds - 1)
    if (state.thinkingSeconds === 0) stopThinkingTimer()
  }, 1000)
}

function stopThinkingTimer() {
  clearInterval(thinkingTimerHandle)
  thinkingTimerHandle = null
  state.thinkingRunning = false
}

function resetThinkingTimer() {
  stopThinkingTimer()
  state.thinkingSeconds = 30
}

function openHistory(teamIndex) {
  if (!state.teams[teamIndex]) return
  state.displayHistoryTeamIndex = teamIndex
  state.displayKanaTeamIndex = null
}

function closeHistory() {
  state.displayHistoryTeamIndex = null
}

function openKana(teamIndex) {
  if (!state.teams[teamIndex]) return
  state.displayKanaTeamIndex = teamIndex
  state.displayHistoryTeamIndex = null
}

function closeKana() {
  state.displayKanaTeamIndex = null
}

function revealAnswer(teamIndex) {
  const team = state.teams[teamIndex]
  if (state.phase !== 'finished' || !team || team.solvedBy) return
  team.answerRevealed = true
}

function historyGridStyle(team) {
  const count = Math.max(1, team?.guesses?.length || 0)
  const columns = count <= 8 ? 1 : count <= 18 ? 2 : count <= 30 ? 3 : count <= 45 ? 4 : 5
  return {
    '--history-columns': columns,
    '--history-rows': Math.ceil(count / columns),
  }
}

function undo() {
  const snapshot = undoStack.value.pop()
  if (!snapshot) return
  Object.assign(state, migrateState(JSON.parse(snapshot)))
  guessInput.value = ''
  guessError.value = ''
}

function displayAnswer(team) {
  if (team.solvedBy || team.answerRevealed) return splitWordleWord(team.secret)
  return Array(WORDLE_LENGTH).fill('？')
}

function challengerName(challengerId) {
  return state.teams.find(team => team.id === challengerId)?.name || '相手チーム'
}

function confirmNewGame() {
  if (!window.confirm('現在の文字あてゲームを終了して、新しい設定へ戻りますか？')) return
  setup.teamCount = Math.max(2, Math.min(3, state.teams.length || setup.teamCount))
  state.teams.forEach((team, index) => {
    if (setup.teams[index]) setup.teams[index].name = team.name
  })
  setup.teams.forEach(team => { team.secret = '' })
  localStorage.removeItem(STORAGE_KEY)
  Object.assign(state, emptyState())
  resetThinkingTimer()
  visibleSecrets.value = new Set()
  undoStack.value = []
  hasSave.value = false
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify({ app: 'quiz-wordle', version: 1, state }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `quiz-wordle-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function restoreBackup(event) {
  dataError.value = ''
  try {
    const json = JSON.parse(await event.target.files?.[0]?.text())
    if (json?.app !== 'quiz-wordle' || !Array.isArray(json?.state?.teams)) throw new Error()
    const restored = migrateState(json.state)
    const secrets = restored.teams.map(team => validateWordleWord(team.secret))
    if (
      restored.teams.length < 2
      || restored.teams.length > 3
      || secrets.some(result => !result.valid)
    ) throw new Error()
    Object.assign(state, restored)
    stopThinkingTimer()
    guessInput.value = ''
    undoStack.value = []
  } catch {
    dataError.value = 'このファイルは復元できません。正しいWordleバックアップを選んでください。'
  } finally {
    event.target.value = ''
  }
}
</script>

<style scoped>
.wordle-game { --panel: rgba(16,22,27,.95); min-height: 100vh; box-sizing: border-box; padding: 14px 18px 54px; background: radial-gradient(circle at top, #263943, #0a0f13 58%); color: #f7fafc; }
.wordle-header { max-width: 1440px; margin: 0 auto 10px; display: grid; grid-template-columns: 120px 1fr auto; align-items: center; gap: 12px; text-align: center; }
.wordle-header p, .wordle-kicker { margin: 0; color: #90a4ae; font-size: .7rem; font-weight: 900; letter-spacing: .16em; }
.wordle-header h1 { margin: 1px 0 0; color: #eceff1; font-size: clamp(1.35rem, 3vw, 2rem); }
.wordle-header__actions { display: flex; justify-content: flex-end; gap: 7px; }
.wordle-panel { max-width: 1120px; margin: 12px auto; padding: 18px; border: 1px solid rgba(255,255,255,.16); border-radius: 15px; background: var(--panel); box-shadow: 0 7px 24px rgba(0,0,0,.28); }
.wordle-button, .file-button { min-height: 42px; box-sizing: border-box; padding: 9px 14px; border: 1px solid rgba(255,255,255,.28); border-radius: 9px; background: #263238; color: #fff; font: inherit; font-weight: 800; cursor: pointer; }
.wordle-button:hover:not(:disabled), .file-button:hover { border-color: #ffd54f; }
.wordle-button:disabled { opacity: .35; cursor: not-allowed; }
.wordle-button.selected, .wordle-button--primary { border-color: #ff8f00; background: #e65100; }
.wordle-button--secondary { background: #37474f; }
.wordle-button--ghost { background: transparent; }
.wordle-button--display { border-color: #26c6da; background: #006064; }
.wordle-rules { line-height: 1.7; }
.wordle-rules h2 { margin-top: 0; }
.wordle-rules li { margin: 5px 0; }
.legend-exact { color: #ff5252; }
.legend-present { color: #ffd740; }
.wordle-setup__heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.wordle-setup h2 { margin: 3px 0; }
.wordle-field { display: grid; gap: 7px; margin: 16px 0; color: #cfd8dc; font-weight: 800; }
.wordle-choice-row { display: flex; gap: 7px; }
.wordle-setup__teams { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.wordle-setup-team { min-width: 0; display: grid; gap: 10px; padding: 13px; border: 2px solid color-mix(in srgb, var(--team) 65%, #455a64); border-radius: 12px; background: #11181c; }
.wordle-setup-team > strong { color: var(--team); }
.wordle-setup-team label { min-width: 0; display: grid; gap: 4px; color: #b0bec5; font-size: .78rem; font-weight: 800; }
.wordle-setup input, .challenge-input input { width: 100%; min-width: 0; box-sizing: border-box; padding: 11px 12px; border: 2px solid #455a64; border-radius: 8px; outline: none; background: #05090b; color: #fff; font: inherit; font-size: 1.05rem; }
.wordle-setup input:focus, .challenge-input input:focus { border-color: #ffd54f; box-shadow: 0 0 0 3px rgba(255,213,79,.14); }
.secret-input-row { display: flex; gap: 5px; }
.secret-toggle { flex: none; min-height: 0; padding: 7px 9px; font-size: .7rem; }
.wordle-note { color: #90a4ae; font-size: .78rem; }
.wordle-secret-note { padding: 9px 11px; border: 1px solid #26c6da; border-radius: 9px; background: rgba(0,96,100,.2); color: #b2ebf2; font-size: .8rem; font-weight: 800; }
.wordle-error { color: #ff8a80; font-weight: 800; }
.wordle-start { width: 100%; min-height: 50px; font-size: 1rem; }
.wordle-progress { max-width: 1440px; display: grid; grid-template-columns: minmax(230px, .8fr) minmax(420px, 1.6fr) auto; align-items: center; gap: 10px; padding: 10px 14px; }
.wordle-progress > div:first-child { display: grid; }
.wordle-progress > div:first-child span { color: #90a4ae; font-size: .68rem; font-weight: 900; letter-spacing: .12em; }
.wordle-progress > div:first-child strong { color: #fff; }
.wordle-legend { display: flex; justify-content: center; flex-wrap: wrap; gap: 5px; }
.legend-chip { padding: 4px 8px; border-radius: 99px; color: #fff; font-size: .68rem; font-weight: 900; }
.legend-chip.exact { background: #c62828; }
.legend-chip.present { background: #b28704; color: #fffde7; }
.legend-chip.absent { background: #455a64; }
.wordle-boards { max-width: 1500px; margin: 10px auto; display: grid; grid-template-columns: repeat(var(--team-count), minmax(250px, 1fr)); gap: 11px; }
.wordle-board { --team: #42a5f5; min-width: 0; padding: 13px; border: 3px solid color-mix(in srgb, var(--team) 58%, #37474f); border-radius: 17px; background: rgba(5,8,10,.95); box-shadow: inset 0 0 25px color-mix(in srgb, var(--team) 8%, transparent); transition: opacity .2s, transform .2s, box-shadow .2s; }
.wordle-board.targeted { transform: translateY(-3px); box-shadow: 0 0 22px color-mix(in srgb, var(--team) 42%, transparent); }
.wordle-board.challenger { outline: 3px solid #ffd54f; outline-offset: 2px; }
.wordle-board.eliminated { opacity: .56; filter: grayscale(.35); }
.wordle-board__header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.wordle-board__header span { color: var(--team); font-size: .68rem; font-weight: 900; letter-spacing: .08em; }
.wordle-board__header h2 { margin: 1px 0; overflow: hidden; font-size: 1.22rem; text-overflow: ellipsis; white-space: nowrap; }
.wordle-board__actions { display: grid; justify-items: end; gap: 5px; }
.history-button { min-height: 27px; padding: 4px 8px; border: 1px solid #607d8b; border-radius: 7px; background: #182126; color: #eceff1; font: inherit; font-size: .64rem; font-weight: 900; cursor: pointer; }
.history-button:hover { border-color: #ffd54f; }
.team-status { flex: none; padding: 4px 8px; border: 1px solid #607d8b; border-radius: 99px; color: #b0bec5; font-size: .65rem; }
.team-status--out { border-color: #ef5350; color: #ff8a80; }
.team-status--winner { border-color: #ffd54f; background: #5d4500; color: #fff7c2; }
.answer-row, .guess-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 5px; }
.answer-row { margin: 10px 0; padding: 7px; border-radius: 10px; background: #000; }
.answer-row span, .guess-row span { aspect-ratio: 1.18; display: grid; place-items: center; border: 2px solid #546e7a; border-radius: 7px; background: #1b2429; color: #fff; font-size: clamp(1.15rem, 3vw, 1.75rem); font-weight: 1000; }
.answer-row span.revealed { border-color: #ef5350; background: #7f1d1d; }
.guess-history { max-height: 380px; display: grid; gap: 7px; overflow-y: auto; scrollbar-width: thin; }
.guess-entry { display: grid; grid-template-columns: 74px minmax(0, 1fr); align-items: center; gap: 6px; }
.guess-entry small { overflow: hidden; color: #90a4ae; font-size: .62rem; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.guess-row span.letter-exact { border-color: #ff5252; background: #c62828; color: #fff; box-shadow: 0 0 8px rgba(255,82,82,.3); }
.guess-row span.letter-present { border-color: #ffd740; background: #9b7700; color: #fffde7; box-shadow: 0 0 8px rgba(255,215,64,.25); }
.guess-row span.letter-absent { border-color: #455a64; background: #263238; color: #b0bec5; }
.guess-entry--empty { opacity: .28; }
.guess-entry--empty .guess-row span { font-size: .85rem; }
.challenge-console { max-width: 920px; text-align: center; }
.thinking-timer { margin: -3px auto 16px; padding: 10px 12px; display: flex; justify-content: center; align-items: center; gap: 18px; border: 2px solid #546e7a; border-radius: 12px; background: #080d10; }
.thinking-timer > div:first-child { display: grid; }
.thinking-timer span { color: #90a4ae; font-size: .64rem; font-weight: 900; letter-spacing: .15em; }
.thinking-timer strong { color: #fff; font-variant-numeric: tabular-nums; font-size: clamp(2rem, 5vw, 3.2rem); line-height: 1; }
.thinking-timer.running { border-color: #26c6da; box-shadow: 0 0 16px rgba(38,198,218,.18); }
.thinking-timer.urgent { border-color: #ff5252; background: #2a0909; animation: timer-pulse .7s ease-in-out infinite alternate; }
.thinking-timer__actions { display: flex; gap: 7px; }
@keyframes timer-pulse { to { box-shadow: 0 0 22px rgba(255,82,82,.4); } }
.challenge-step h2 { margin: 4px 0 14px; }
.challenge-team-buttons { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin: 11px 0; }
.challenge-team-button { min-width: 150px; border: 2px solid var(--team); background: color-mix(in srgb, var(--team) 28%, #151b1e); }
.challenge-input { max-width: 620px; margin: 0 auto; }
.challenge-input label { display: block; margin: 8px 0; color: #cfd8dc; font-weight: 800; }
.challenge-input__row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 7px; }
.challenge-input input { text-align: center; font-size: 1.35rem; font-weight: 900; letter-spacing: .12em; }
.wordle-winner { position: fixed; inset: 0; z-index: 50; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 20px; background: rgba(4,8,10,.94); text-align: center; }
.wordle-winner span { color: #ffd54f; font-weight: 900; letter-spacing: .22em; }
.wordle-winner strong { color: #fff; font-size: clamp(2.5rem, 9vw, 6rem); }
.wordle-winner p { color: #cfd8dc; font-size: 1.15rem; }
.winner-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; }
.history-overlay, .kana-overlay { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,.9); }
.history-overlay__panel, .kana-overlay__panel { width: 96vw; height: 94vh; box-sizing: border-box; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 12px; padding: 18px; border: 3px solid var(--team); border-radius: 18px; background: #080d10; box-shadow: 0 0 35px color-mix(in srgb, var(--team) 34%, transparent); }
.history-overlay__panel > header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.history-overlay__panel > header span { color: var(--team); font-size: .68rem; font-weight: 900; letter-spacing: .15em; }
.history-overlay__panel h2 { margin: 2px 0 0; }
.history-overlay__list { min-height: 0; display: grid; grid-template-columns: repeat(var(--history-columns), minmax(0, 1fr)); grid-template-rows: repeat(var(--history-rows), minmax(0, 1fr)); grid-auto-flow: column; gap: 7px 12px; overflow: hidden; }
.history-overlay__entry { min-height: 0; display: grid; grid-template-columns: 34px minmax(60px, .7fr) minmax(120px, 1.5fr); align-items: center; gap: 6px; padding: 3px 6px; border-radius: 7px; background: rgba(255,255,255,.035); }
.history-overlay__entry > strong { color: #ffd54f; text-align: right; }
.history-overlay__entry > small { overflow: hidden; color: #b0bec5; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.history-overlay__entry .guess-row span { min-height: 0; height: clamp(25px, 4.1vh, 48px); aspect-ratio: auto; font-size: clamp(.75rem, 2.2vh, 1.35rem); }
.kana-overlay__panel { grid-template-rows: auto auto minmax(0, 1fr); }
.kana-overlay__panel > header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.kana-overlay__panel > header span { color: var(--team); font-size: .72rem; font-weight: 900; letter-spacing: .16em; }
.kana-overlay__panel h2, .kana-overlay__panel p { margin: 2px 0; }
.kana-overlay__panel > p { color: #b0bec5; }
.kana-groups { min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; overflow: hidden; }
.kana-group { min-height: 0; padding: 11px; border: 1px solid #455a64; border-radius: 12px; background: #11191d; }
.kana-group h3 { margin: 0 0 8px; color: #ffd54f; }
.kana-group h3 small { color: #90a4ae; }
.kana-characters { display: grid; grid-template-columns: repeat(auto-fit, minmax(38px, 1fr)); gap: 6px; }
.kana-characters span { display: grid; min-height: 38px; place-items: center; border: 1px solid #607d8b; border-radius: 7px; background: #263238; font-size: clamp(1rem, 2.5vw, 1.5rem); font-weight: 900; }
.kana-characters em { color: #78909c; font-style: normal; }
.history-empty { padding: 35px; color: #90a4ae; text-align: center; }
.wordle-data { color: #b0bec5; }
.wordle-data summary { color: #eceff1; cursor: pointer; font-weight: 900; }
.wordle-data > div { display: flex; flex-wrap: wrap; gap: 7px; }
.file-button { display: inline-grid; place-items: center; }
.file-button input { display: none; }
@media (max-width: 900px) {
  .wordle-header { grid-template-columns: 90px 1fr; }
  .wordle-header__actions { grid-column: 1 / -1; justify-content: center; }
  .wordle-progress { grid-template-columns: 1fr; text-align: center; }
  .wordle-boards { grid-template-columns: 1fr; max-width: 620px; }
  .wordle-setup__teams { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .wordle-game { padding: 9px 9px 50px; }
  .wordle-header { grid-template-columns: 66px 1fr; }
  .wordle-header .wordle-button { padding: 7px 5px; font-size: .7rem; }
  .wordle-panel { padding: 13px; }
  .wordle-setup__heading { align-items: flex-start; flex-direction: column; }
  .guess-entry { grid-template-columns: 55px minmax(0, 1fr); }
  .answer-row span, .guess-row span { font-size: 1.25rem; }
  .challenge-input__row { grid-template-columns: 1fr; }
  .thinking-timer { align-items: stretch; flex-direction: column; gap: 8px; }
  .thinking-timer__actions { justify-content: center; }
  .history-overlay, .kana-overlay { padding: 5px; }
  .history-overlay__panel, .kana-overlay__panel { width: 100%; height: 98vh; padding: 10px; }
  .history-overlay__panel > header { align-items: flex-start; }
  .history-overlay__entry { grid-template-columns: 25px minmax(0, 1fr); gap: 3px; padding: 2px; }
  .history-overlay__entry > small { display: none; }
  .history-overlay__entry .guess-row span { height: clamp(20px, 3.7vh, 36px); font-size: clamp(.64rem, 1.8vh, 1rem); }
  .kana-groups { grid-template-columns: 1fr; gap: 6px; }
  .kana-group { padding: 7px; }
  .kana-characters { grid-template-columns: repeat(auto-fit, minmax(28px, 1fr)); gap: 3px; }
  .kana-characters span { min-height: 27px; font-size: .9rem; }
}
</style>
