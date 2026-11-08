<template>
  <main class="wordle-display">
    <header class="display-header">
      <div>
        <p>QUIZ × WORD GAME</p>
        <h1>文字あて Wordle</h1>
      </div>
      <div v-if="state.phase === 'play'" class="display-timer" :class="{ urgent: state.thinkingSeconds <= 5, running: state.thinkingRunning }">
        <span>THINKING TIME</span>
        <strong>{{ formattedThinkingTime }}</strong>
      </div>
      <div class="display-legend">
        <span class="exact">赤：場所も一致</span>
        <span class="present">黄：文字あり</span>
        <span class="absent">灰：文字なし</span>
      </div>
    </header>

    <section v-if="state.phase === 'setup'" class="display-standby">
      <span>PRIVATE SETUP</span>
      <h2>ただいま準備中</h2>
      <p>チーム名と秘密の5文字は、操作用画面で登録しています。</p>
      <strong>この画面に秘密ワードは送信されません</strong>
    </section>

    <template v-else>
      <section class="display-now" aria-live="polite">
        <span>いまやること</span>
        <strong>{{ phaseInstruction }}</strong>
      </section>

      <section class="display-boards" :style="{ '--team-count': state.teams.length }">
        <article
          v-for="(team, teamIndex) in state.teams"
          :key="team.id"
          class="display-board"
          :class="{
            eliminated: Boolean(team.solvedBy),
            challenger: state.challengerIndex === teamIndex,
            targeted: state.targetIndex === teamIndex,
          }"
          :style="{ '--team': team.color }"
        >
          <header>
            <div>
              <span>TEAM {{ teamIndex + 1 }}</span>
              <h2>{{ team.name }}</h2>
            </div>
            <div class="display-board__actions">
              <strong v-if="team.solvedBy" class="status out">撃破</strong>
              <strong v-else-if="state.phase === 'finished'" class="status winner">WINNER</strong>
              <strong v-else class="status">防衛中</strong>
              <button type="button" @click="requestHistory(teamIndex)">全履歴 {{ team.guesses.length }}件</button>
              <button type="button" @click="requestKana(teamIndex)">未使用の五十音</button>
            </div>
          </header>

          <div class="display-answer">
            <span
              v-for="(character, index) in displayAnswer(team)"
              :key="index"
              :class="{ revealed: Boolean(team.revealedAnswer) }"
            >{{ character }}</span>
          </div>

          <div class="display-guesses">
            <div v-for="guess in recentGuesses(team)" :key="guess.id" class="display-guess-entry">
              <small>{{ challengerName(guess.challengerId) }}</small>
              <div class="display-guess-row">
                <span
                  v-for="(character, index) in splitWordleWord(guess.word)"
                  :key="index"
                  :class="`letter-${guess.result[index]}`"
                >{{ character }}</span>
              </div>
            </div>
            <div v-for="emptyIndex in Math.max(0, 5 - recentGuesses(team).length)" :key="`empty-${emptyIndex}`" class="display-guess-entry empty" aria-hidden="true">
              <small>CHALLENGE</small>
              <div class="display-guess-row"><span v-for="index in WORDLE_LENGTH" :key="index">・</span></div>
            </div>
          </div>
          <p v-if="team.guesses.length > 5" class="older-count">ほか {{ team.guesses.length - 5 }}件</p>
        </article>
      </section>

      <section v-if="historyTeam" class="display-history-overlay" aria-live="polite">
        <article class="display-history-panel" :style="{ '--team': historyTeam.color }">
          <header>
            <div>
              <span>FULL HISTORY</span>
              <h2>{{ historyTeam.name }}への予想 全{{ historyTeam.guesses.length }}件</h2>
            </div>
            <button type="button" class="display-history-close" @click="requestHistory(null)">✕ 閉じる</button>
          </header>
          <p v-if="historyTeam.guesses.length === 0" class="display-history-empty">まだ予想履歴はありません。</p>
          <div v-else class="display-history-list" :style="historyGridStyle(historyTeam)">
            <div v-for="(guess, guessIndex) in historyTeam.guesses" :key="guess.id" class="display-history-entry">
              <strong>#{{ guessIndex + 1 }}</strong>
              <small>{{ challengerName(guess.challengerId) }}</small>
              <div class="display-guess-row">
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

      <section v-if="kanaTeam" class="display-kana-overlay" aria-live="polite">
        <article class="display-kana-panel" :style="{ '--team': kanaTeam.color }">
          <header>
            <div>
              <span>UNUSED KANA</span>
              <h2>{{ kanaTeam.name }}がまだ使っていない文字</h2>
            </div>
            <button type="button" class="display-history-close" @click="requestKana(null)">✕ 閉じる</button>
          </header>
          <p>このチームへの予想履歴に、まだ一度も登場していない文字です。</p>
          <div class="display-kana-groups">
            <section v-for="group in unusedKanaGroups" :key="group.label" class="display-kana-group">
              <h3>{{ group.label }} <small>{{ group.characters.length }}字</small></h3>
              <div class="display-kana-characters">
                <span v-for="character in group.characters" :key="character">{{ character }}</span>
                <em v-if="group.characters.length === 0">すべて使用済み</em>
              </div>
            </section>
          </div>
        </article>
      </section>

      <section v-if="state.phase === 'finished' && winner && state.showWinnerOverlay" class="display-winner">
        <span>WORD SURVIVOR</span>
        <strong>{{ winner.name }}</strong>
        <p v-if="winner.revealedAnswer">秘密ワード「{{ winner.revealedAnswer }}」を守り切りました</p>
        <p v-else>秘密ワードはまだ非公開です</p>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive } from 'vue'
import {
  WORDLE_DISPLAY_CHANNEL,
  WORDLE_DISPLAY_STORAGE_KEY,
  WORDLE_LENGTH,
  getUnusedWordleKana,
  splitWordleWord,
} from '../utils/wordle.js'

const state = reactive(loadDisplayState())
const displayChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(WORDLE_DISPLAY_CHANNEL) : null

const winner = computed(() => state.phase === 'finished' ? state.teams.find(team => !team.solvedBy) || null : null)
const historyTeam = computed(() => state.teams[state.displayHistoryTeamIndex] || null)
const kanaTeam = computed(() => state.teams[state.displayKanaTeamIndex] || null)
const unusedKanaGroups = computed(() => getUnusedWordleKana(kanaTeam.value?.guesses || []))
const formattedThinkingTime = computed(() => `00:${String(state.thinkingSeconds).padStart(2, '0')}`)
const phaseInstruction = computed(() => {
  if (state.phase === 'finished') return `${winner.value?.name || '勝者'}の勝利`
  if (state.challengerIndex === null) return '次のクイズ正解を待っています'
  if (state.targetIndex === null) return `${state.teams[state.challengerIndex]?.name || '正解チーム'}が攻撃先を選択中`
  return `${state.teams[state.challengerIndex]?.name || '正解チーム'}が${state.teams[state.targetIndex]?.name || '相手'}の5文字にチャレンジ`
})

onMounted(() => {
  window.addEventListener('storage', handleStorage)
  if (displayChannel) {
    displayChannel.onmessage = event => {
      if (['history-request', 'kana-request'].includes(event.data?.type)) return
      applyDisplayState(event.data)
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('storage', handleStorage)
  displayChannel?.close()
})

function emptyDisplayState() {
  return {
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

function loadDisplayState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WORDLE_DISPLAY_STORAGE_KEY))
    return sanitizeDisplayState(parsed)
  } catch {
    return emptyDisplayState()
  }
}

function sanitizeDisplayState(value) {
  if (!value || !Array.isArray(value.teams)) return emptyDisplayState()
  return {
    phase: ['play', 'finished'].includes(value.phase) ? value.phase : 'setup',
    teams: value.teams.slice(0, 3).map((team, index) => ({
      id: String(team.id || `display-team-${index}`),
      name: String(team.name || `チーム${index + 1}`).slice(0, 12),
      color: String(team.color || '#90a4ae'),
      guesses: Array.isArray(team.guesses) ? team.guesses : [],
      solvedBy: team.solvedBy || null,
      revealedAnswer: String(team.revealedAnswer || ''),
    })),
    challengerIndex: Number.isInteger(value.challengerIndex) ? value.challengerIndex : null,
    targetIndex: Number.isInteger(value.targetIndex) ? value.targetIndex : null,
    displayHistoryTeamIndex: Number.isInteger(value.displayHistoryTeamIndex) ? value.displayHistoryTeamIndex : null,
    displayKanaTeamIndex: Number.isInteger(value.displayKanaTeamIndex) ? value.displayKanaTeamIndex : null,
    thinkingSeconds: Number.isInteger(value.thinkingSeconds) ? Math.max(0, Math.min(30, value.thinkingSeconds)) : 30,
    thinkingRunning: Boolean(value.thinkingRunning),
    showWinnerOverlay: value.showWinnerOverlay !== false,
  }
}

function applyDisplayState(value) {
  Object.assign(state, sanitizeDisplayState(value))
}

function handleStorage(event) {
  if (event.key !== WORDLE_DISPLAY_STORAGE_KEY || !event.newValue) return
  try {
    applyDisplayState(JSON.parse(event.newValue))
  } catch {
    // 壊れた同期データは現在の安全な表示を保つ。
  }
}

function recentGuesses(team) {
  return team.guesses.slice(-5)
}

function displayAnswer(team) {
  return team.revealedAnswer ? splitWordleWord(team.revealedAnswer) : Array(WORDLE_LENGTH).fill('？')
}

function challengerName(challengerId) {
  return state.teams.find(team => team.id === challengerId)?.name || '相手チーム'
}

function requestHistory(teamIndex) {
  state.displayHistoryTeamIndex = Number.isInteger(teamIndex) && state.teams[teamIndex] ? teamIndex : null
  state.displayKanaTeamIndex = null
  displayChannel?.postMessage({ type: 'history-request', teamIndex: state.displayHistoryTeamIndex })
}

function requestKana(teamIndex) {
  state.displayKanaTeamIndex = Number.isInteger(teamIndex) && state.teams[teamIndex] ? teamIndex : null
  state.displayHistoryTeamIndex = null
  displayChannel?.postMessage({ type: 'kana-request', teamIndex: state.displayKanaTeamIndex })
}

function historyGridStyle(team) {
  const count = Math.max(1, team?.guesses?.length || 0)
  const columns = count <= 8 ? 1 : count <= 18 ? 2 : count <= 30 ? 3 : count <= 45 ? 4 : 5
  return {
    '--history-columns': columns,
    '--history-rows': Math.ceil(count / columns),
  }
}
</script>

<style scoped>
.wordle-display { min-height: 100vh; box-sizing: border-box; padding: 18px 22px 34px; overflow: hidden; background: radial-gradient(circle at top, #263943, #05090b 60%); color: #f7fafc; }
.display-header { max-width: 1560px; margin: 0 auto 12px; display: grid; grid-template-columns: minmax(260px, 1fr) auto minmax(330px, 1fr); align-items: center; gap: 18px; }
.display-header p { margin: 0; color: #90a4ae; font-size: .72rem; font-weight: 900; letter-spacing: .16em; }
.display-header h1 { margin: 2px 0 0; font-size: clamp(1.6rem, 3vw, 2.5rem); }
.display-legend { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 6px; }
.display-legend span { padding: 6px 10px; border-radius: 99px; font-size: .76rem; font-weight: 900; }
.display-legend .exact { background: #c62828; }
.display-legend .present { background: #9b7700; }
.display-legend .absent { background: #455a64; }
.display-timer { min-width: 190px; padding: 7px 18px; display: grid; justify-items: center; border: 2px solid #546e7a; border-radius: 13px; background: #080d10; }
.display-timer span { color: #90a4ae; font-size: .65rem; font-weight: 900; letter-spacing: .15em; }
.display-timer strong { font-size: clamp(2.2rem, 5vw, 4rem); line-height: 1; font-variant-numeric: tabular-nums; }
.display-timer.running { border-color: #26c6da; }
.display-timer.urgent { border-color: #ff5252; background: #310b0b; animation: display-pulse .7s ease-in-out infinite alternate; }
@keyframes display-pulse { to { box-shadow: 0 0 28px rgba(255,82,82,.55); } }
.display-standby { min-height: calc(100vh - 140px); display: grid; place-content: center; justify-items: center; text-align: center; }
.display-standby span { color: #26c6da; font-weight: 900; letter-spacing: .22em; }
.display-standby h2 { margin: 12px 0; font-size: clamp(3rem, 9vw, 7rem); }
.display-standby p { color: #cfd8dc; font-size: clamp(1rem, 2.5vw, 1.6rem); }
.display-standby strong { margin-top: 20px; padding: 10px 16px; border: 1px solid #26c6da; border-radius: 99px; color: #b2ebf2; }
.display-now { max-width: 1560px; margin: 0 auto 12px; padding: 8px 15px; display: flex; justify-content: center; gap: 14px; border: 1px solid #455a64; border-radius: 10px; background: rgba(10,15,18,.92); }
.display-now span { color: #90a4ae; font-weight: 900; }
.display-boards { max-width: 1560px; margin: 0 auto; display: grid; grid-template-columns: repeat(var(--team-count), minmax(0, 1fr)); gap: 14px; }
.display-board { min-width: 0; padding: 14px; border: 4px solid color-mix(in srgb, var(--team) 65%, #37474f); border-radius: 18px; background: rgba(4,8,10,.97); transition: opacity .2s, transform .2s; }
.display-board.challenger { outline: 4px solid #ffd54f; outline-offset: 2px; }
.display-board.targeted { transform: translateY(-4px); box-shadow: 0 0 28px color-mix(in srgb, var(--team) 42%, transparent); }
.display-board.eliminated { opacity: .55; filter: grayscale(.35); }
.display-board > header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.display-board > header span { color: var(--team); font-size: .72rem; font-weight: 900; letter-spacing: .1em; }
.display-board h2 { margin: 2px 0; font-size: clamp(1.3rem, 2.5vw, 2rem); }
.display-board__actions { display: grid; justify-items: end; gap: 5px; }
.display-board__actions button, .display-history-close { min-height: 30px; padding: 4px 9px; border: 1px solid #78909c; border-radius: 7px; background: #182126; color: #fff; font: inherit; font-size: .68rem; font-weight: 900; cursor: pointer; }
.display-board__actions button:hover, .display-history-close:hover { border-color: #ffd54f; }
.status { padding: 5px 9px; border: 1px solid #607d8b; border-radius: 99px; color: #b0bec5; font-size: .7rem; }
.status.out { border-color: #ef5350; color: #ff8a80; }
.status.winner { border-color: #ffd54f; background: #5d4500; color: #fff7c2; }
.display-answer, .display-guess-row { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.display-answer { margin: 11px 0; padding: 8px; border-radius: 11px; background: #000; }
.display-answer span, .display-guess-row span { aspect-ratio: 1.2; display: grid; place-items: center; border: 2px solid #546e7a; border-radius: 7px; background: #1b2429; color: #fff; font-size: clamp(1.2rem, 3vw, 2rem); font-weight: 1000; }
.display-answer span.revealed { border-color: #ef5350; background: #7f1d1d; }
.display-guesses { display: grid; gap: 7px; }
.display-guess-entry { display: grid; grid-template-columns: 80px minmax(0, 1fr); align-items: center; gap: 7px; }
.display-guess-entry > small { overflow: hidden; color: #90a4ae; font-size: .65rem; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.display-guess-row span.letter-exact { border-color: #ff5252; background: #c62828; }
.display-guess-row span.letter-present { border-color: #ffd740; background: #9b7700; color: #fffde7; }
.display-guess-row span.letter-absent { border-color: #455a64; background: #263238; color: #b0bec5; }
.display-guess-entry.empty { opacity: .24; }
.older-count { margin: 8px 0 0; color: #90a4ae; text-align: right; font-size: .72rem; font-weight: 800; }
.display-history-overlay, .display-kana-overlay, .display-winner { position: fixed; inset: 0; z-index: 20; display: grid; place-items: center; padding: 16px; background: rgba(0,0,0,.92); }
.display-history-panel, .display-kana-panel { width: 96vw; height: 94vh; box-sizing: border-box; display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 14px; padding: 20px; border: 4px solid var(--team); border-radius: 20px; background: #080d10; }
.display-history-panel > header { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.display-history-panel > header span { color: var(--team); font-size: .75rem; font-weight: 900; letter-spacing: .15em; }
.display-history-panel h2 { margin: 2px 0; font-size: 2rem; }
.display-history-list { min-height: 0; display: grid; grid-template-columns: repeat(var(--history-columns), minmax(0, 1fr)); grid-template-rows: repeat(var(--history-rows), minmax(0, 1fr)); grid-auto-flow: column; gap: 7px 13px; overflow: hidden; }
.display-history-entry { min-height: 0; display: grid; grid-template-columns: 38px minmax(70px, .7fr) minmax(140px, 1.5fr); align-items: center; gap: 7px; padding: 3px 7px; border-radius: 8px; background: rgba(255,255,255,.035); }
.display-history-entry > strong { color: #ffd54f; text-align: right; }
.display-history-entry > small { overflow: hidden; color: #b0bec5; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.display-history-entry .display-guess-row span { min-height: 0; height: clamp(26px, 4.2vh, 50px); aspect-ratio: auto; font-size: clamp(.78rem, 2.2vh, 1.4rem); }
.display-history-empty { padding: 50px; color: #90a4ae; text-align: center; }
.display-kana-panel { grid-template-rows: auto auto minmax(0, 1fr); }
.display-kana-panel > header { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
.display-kana-panel > header span { color: var(--team); font-size: .75rem; font-weight: 900; letter-spacing: .15em; }
.display-kana-panel h2, .display-kana-panel p { margin: 2px 0; }
.display-kana-panel > p { color: #b0bec5; }
.display-kana-groups { min-height: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; overflow: hidden; }
.display-kana-group { min-height: 0; padding: 12px; border: 1px solid #455a64; border-radius: 12px; background: #11191d; }
.display-kana-group h3 { margin: 0 0 8px; color: #ffd54f; }
.display-kana-group h3 small { color: #90a4ae; }
.display-kana-characters { display: grid; grid-template-columns: repeat(auto-fit, minmax(42px, 1fr)); gap: 6px; }
.display-kana-characters span { display: grid; min-height: 40px; place-items: center; border: 1px solid #607d8b; border-radius: 7px; background: #263238; font-size: clamp(1.1rem, 2.6vw, 1.65rem); font-weight: 900; }
.display-kana-characters em { color: #78909c; font-style: normal; }
.display-winner { z-index: 30; align-content: center; justify-items: center; text-align: center; }
.display-winner span { color: #ffd54f; font-weight: 900; letter-spacing: .25em; }
.display-winner > strong { font-size: clamp(4rem, 12vw, 9rem); }
.display-winner p { color: #cfd8dc; font-size: clamp(1.2rem, 3vw, 2rem); }
@media (max-width: 950px) {
  .wordle-display { overflow: auto; }
  .display-header { grid-template-columns: 1fr auto; }
  .display-legend { grid-column: 1 / -1; justify-content: center; }
  .display-boards { grid-template-columns: 1fr; max-width: 650px; }
  .display-history-overlay, .display-kana-overlay { padding: 5px; }
  .display-history-panel, .display-kana-panel { width: 100%; height: 98vh; padding: 10px; }
  .display-history-entry { grid-template-columns: 27px minmax(0, 1fr); gap: 3px; padding: 2px; }
  .display-history-entry > small { display: none; }
  .display-history-entry .display-guess-row span { height: clamp(20px, 3.7vh, 37px); font-size: clamp(.65rem, 1.8vh, 1rem); }
  .display-kana-groups { grid-template-columns: 1fr; gap: 6px; }
  .display-kana-group { padding: 7px; }
  .display-kana-characters { grid-template-columns: repeat(auto-fit, minmax(29px, 1fr)); gap: 3px; }
  .display-kana-characters span { min-height: 27px; font-size: .92rem; }
}
</style>
