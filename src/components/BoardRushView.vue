<template>
  <main class="board-rush">
    <header class="rush-header">
      <button class="rush-button rush-button--ghost" @click="emit('back')">← ホーム</button>
      <div>
        <p>BUZZER × BOARD</p>
        <h1>📝 ボードラッシュ</h1>
      </div>
      <div class="rush-header__actions">
        <button class="rush-button" :class="{ selected: activePage === 'score' }" @click="activePage = 'score'">得点表</button>
        <button class="rush-button" :class="{ selected: activePage === 'rules' }" @click="activePage = 'rules'">ルール説明</button>
      </div>
    </header>

    <section v-if="activePage === 'rules'" class="rush-rules-page">
      <div class="rules-hero">
        <span>HOW TO PLAY</span>
        <h2>早押し × 全員ボード</h2>
        <p>ボタンを押した瞬間から、チーム全員のひらめきが勝負を決める！</p>
      </div>
      <div class="rules-flow">
        <article><strong>1</strong><div><h3>問題を聞いて早押し</h3><p>問題の途中で分かった人が早押しボタンを押します。</p></div></article>
        <article><strong>2</strong><div><h3>押されたところまで再読</h3><p>QMが問題の最初から、ボタンが押された箇所までをもう一度読みます。</p></div></article>
        <article><strong>3</strong><div><h3>5秒間で全員が回答</h3><p>再読後の5秒間で、両チーム全員がボードへ答えを書きます。</p></div></article>
        <article><strong>4</strong><div><h3>せーので一斉オープン</h3><p>正解者が多いチームに1pt。同数なら両チームとも無得点です。</p></div></article>
      </div>
      <div class="rules-notes">
        <article class="rules-win"><span>🏆 勝利条件</span><strong>Npt以上 ＋ 2pt差</strong><p>1pt差の間はデュースを続けます。</p></article>
        <article class="rules-invalid"><span>📖 読み切った場合</span><strong>その問題は無効</strong><p>誰も押さずに最後まで読んだ問題では得点しません。</p></article>
      </div>
      <button class="rush-button rush-button--primary rules-back" @click="activePage = 'score'">得点表へ</button>
    </section>

    <template v-else>
      <section v-if="state.phase === 'setup' || showSettings" class="rush-panel rush-settings">
        <p class="rush-kicker">SCOREBOARD SETUP</p>
        <h2>チーム名と勝利条件</h2>
        <div class="settings-grid">
          <label v-for="(team, index) in state.teams" :key="team.id" :style="{ '--team': team.color }">
            <span>TEAM {{ index + 1 }}</span>
            <input v-model.trim="team.name" maxlength="12" :placeholder="`チーム${index + 1}`" />
          </label>
          <label class="target-setting">
            <span>先取ポイント N</span>
            <input v-model.number="state.targetPoints" type="number" min="1" max="99" inputmode="numeric" />
            <small>{{ normalizedTarget }}pt以上・2pt差で勝利</small>
          </label>
        </div>
        <p v-if="errorMessage" class="rush-error">{{ errorMessage }}</p>
        <div class="settings-actions">
          <button v-if="showSettings && state.phase === 'play'" class="rush-button rush-button--ghost" @click="cancelSettings">キャンセル</button>
          <button class="rush-button rush-button--primary" @click="applySettings">{{ state.phase === 'setup' ? '得点表を開始' : '設定を反映' }}</button>
        </div>
      </section>

      <template v-if="state.phase === 'play' && !showSettings">
        <section class="rush-match-bar" :class="{ deuce: isDeuce }">
          <div><span>勝利条件</span><strong>{{ state.targetPoints }}pt以上・2pt差</strong></div>
          <b v-if="isDeuce">DEUCE</b>
          <button class="rush-button rush-button--secondary" @click="openSettings">チーム名・勝利条件</button>
        </section>
        <section class="scoreboard">
          <article v-for="(team, index) in state.teams" :key="team.id" :style="{ '--team': team.color }">
            <span>TEAM {{ index + 1 }}</span>
            <h2>{{ team.name }}</h2>
            <strong>{{ team.score }}<small>pt</small></strong>
            <div class="score-controls">
              <button type="button" :disabled="team.score <= 0" @click="changeScore(index, -1)">−1</button>
              <button type="button" @click="changeScore(index, 1)">＋1</button>
            </div>
          </article>
        </section>
        <section class="rush-panel score-actions">
          <button class="rush-button rush-button--secondary" :disabled="!undoStack.length" @click="undo">↶ 直前の得点を戻す</button>
          <button class="rush-button rush-button--danger" @click="resetScores">得点を0に戻す</button>
        </section>
        <details class="rush-panel rush-data">
          <summary>データ管理</summary>
          <div>
            <button class="rush-button rush-button--secondary" @click="downloadBackup">JSONバックアップ</button>
            <label class="rush-button rush-button--secondary file-button">JSONから復元<input type="file" accept="application/json" @change="restoreBackup" /></label>
          </div>
          <p v-if="dataError" class="rush-error">{{ dataError }}</p>
        </details>
      </template>

      <section v-if="state.phase === 'play' && winner && state.showWinnerOverlay" class="rush-winner" aria-live="assertive">
        <span>BOARD RUSH WINNER</span>
        <strong>{{ winner.name }}</strong>
        <p>{{ state.teams[0].score }} - {{ state.teams[1].score }}</p>
        <div>
          <button class="rush-button rush-button--secondary" @click="state.showWinnerOverlay = false">得点表を見る</button>
          <button class="rush-button rush-button--primary" @click="resetScores">次のゲーム</button>
        </div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { findBoardRushWinner, isBoardRushDeuce } from '../utils/boardRush.js'

const emit = defineEmits(['back'])
const STORAGE_KEY = 'piyopiyo_board_rush_v1'
const TEAM_COLORS = ['#42a5f5', '#ef5350']
const state = reactive(loadState())
const activePage = ref('score')
const showSettings = ref(false)
const settingsSnapshot = ref(null)
const errorMessage = ref('')
const dataError = ref('')
const undoStack = ref([])

const normalizedTarget = computed(() => clampInteger(state.targetPoints, 1, 99, 5))
const winningTeamIndex = computed(() => findBoardRushWinner(state.teams.map(team => team.score), normalizedTarget.value))
const winner = computed(() => winningTeamIndex.value === null ? null : state.teams[winningTeamIndex.value])
const isDeuce = computed(() => isBoardRushDeuce(state.teams.map(team => team.score), normalizedTarget.value))

watch(state, saveState, { deep: true })

function defaultState() {
  return {
    schemaVersion: 2,
    phase: 'setup',
    targetPoints: 5,
    teams: [
      { id: 'rush-team-1', name: 'ブルー', color: TEAM_COLORS[0], score: 0 },
      { id: 'rush-team-2', name: 'レッド', color: TEAM_COLORS[1], score: 0 },
    ],
    showWinnerOverlay: true,
  }
}

function migrateState(value) {
  const fallback = defaultState()
  value.schemaVersion = 2
  value.phase = value.phase === 'setup' ? 'setup' : 'play'
  value.targetPoints = clampInteger(value.targetPoints, 1, 99, fallback.targetPoints)
  value.teams = Array.isArray(value.teams) && value.teams.length >= 2
    ? value.teams.slice(0, 2).map((team, index) => ({
        id: team.id || `rush-team-${index + 1}`,
        name: String(team.name || `チーム${index + 1}`).slice(0, 12),
        color: team.color || TEAM_COLORS[index],
        score: clampInteger(team.score, 0, 999, 0),
      }))
    : fallback.teams
  value.showWinnerOverlay = value.showWinnerOverlay !== false
  delete value.memberCount
  delete value.questionNumber
  delete value.timerSeconds
  delete value.timerRunning
  delete value.correctCounts
  delete value.lastAwardedTeamIndex
  delete value.history
  return value
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value)
  return Number.isInteger(number) ? Math.min(max, Math.max(min, number)) : fallback
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? migrateState(JSON.parse(raw)) : defaultState()
  } catch {
    return defaultState()
  }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }
  catch { dataError.value = '得点表を保存できませんでした。ブラウザの保存容量を確認してください。' }
}

function validateSettings() {
  errorMessage.value = ''
  const names = state.teams.map(team => team.name.trim())
  if (names.some(name => !name)) {
    errorMessage.value = '両チームの名前を入力してください。'
    return false
  }
  if (names[0] === names[1]) {
    errorMessage.value = 'チーム名は別々の名前にしてください。'
    return false
  }
  state.targetPoints = normalizedTarget.value
  state.teams.forEach((team, index) => { team.name = names[index] })
  return true
}

function applySettings() {
  if (!validateSettings()) return
  if (state.phase === 'setup') {
    state.teams.forEach(team => { team.score = 0 })
    state.phase = 'play'
  }
  showSettings.value = false
  settingsSnapshot.value = null
  state.showWinnerOverlay = winner.value !== null
}

function openSettings() {
  settingsSnapshot.value = JSON.stringify({ targetPoints: state.targetPoints, names: state.teams.map(team => team.name) })
  showSettings.value = true
}

function cancelSettings() {
  if (settingsSnapshot.value) {
    const snapshot = JSON.parse(settingsSnapshot.value)
    state.targetPoints = snapshot.targetPoints
    state.teams.forEach((team, index) => { team.name = snapshot.names[index] })
  }
  errorMessage.value = ''
  showSettings.value = false
  settingsSnapshot.value = null
}

function changeScore(index, delta) {
  undoStack.value.push(JSON.stringify({ scores: state.teams.map(team => team.score), showWinnerOverlay: state.showWinnerOverlay }))
  if (undoStack.value.length > 30) undoStack.value.shift()
  state.teams[index].score = Math.max(0, state.teams[index].score + delta)
  state.showWinnerOverlay = winningTeamIndex.value !== null
}

function undo() {
  const snapshot = undoStack.value.pop()
  if (!snapshot) return
  const previous = JSON.parse(snapshot)
  state.teams.forEach((team, index) => { team.score = previous.scores[index] })
  state.showWinnerOverlay = previous.showWinnerOverlay
}

function resetScores() {
  if (!window.confirm('両チームの得点を0に戻しますか？')) return
  state.teams.forEach(team => { team.score = 0 })
  state.showWinnerOverlay = true
  undoStack.value = []
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify({ app: 'quiz-board-rush', version: 2, state }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `board-rush-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function restoreBackup(event) {
  dataError.value = ''
  try {
    const json = JSON.parse(await event.target.files?.[0]?.text())
    if (json?.app !== 'quiz-board-rush' || !json?.state) throw new Error()
    Object.assign(state, migrateState(json.state))
    undoStack.value = []
    showSettings.value = false
  } catch {
    dataError.value = 'このファイルは復元できません。正しいボードラッシュのバックアップを選んでください。'
  } finally { event.target.value = '' }
}
</script>

<style scoped>
.board-rush { min-height: 100vh; box-sizing: border-box; padding: 14px 18px 54px; background: radial-gradient(circle at top, #3b174d, #0d0712 62%); color: #f7fafc; }
.rush-header { max-width: 1260px; margin: 0 auto 12px; display: grid; grid-template-columns: 120px 1fr auto; align-items: center; gap: 12px; text-align: center; }
.rush-header p, .rush-kicker { margin: 0; color: #ce93d8; font-size: .7rem; font-weight: 900; letter-spacing: .16em; }
.rush-header h1 { margin: 2px 0; font-size: clamp(1.45rem, 3vw, 2.2rem); }
.rush-header__actions { display: flex; gap: 7px; }
.rush-panel { max-width: 920px; margin: 13px auto; padding: 18px; border: 1px solid rgba(255,255,255,.17); border-radius: 16px; background: rgba(17,9,22,.95); box-shadow: 0 8px 28px rgba(0,0,0,.35); }
.rush-button, .file-button { min-height: 43px; box-sizing: border-box; padding: 9px 15px; border: 1px solid rgba(255,255,255,.28); border-radius: 9px; background: #38243f; color: #fff; font: inherit; font-weight: 900; cursor: pointer; }
.rush-button:hover:not(:disabled), .file-button:hover { border-color: #ffd54f; filter: brightness(1.08); }
.rush-button:disabled { opacity: .35; cursor: not-allowed; }
.rush-button.selected { border-color: #ffd54f; background: #6a1b9a; }
.rush-button--ghost { background: transparent; }
.rush-button--secondary { background: #493650; }
.rush-button--primary { border-color: #ffb300; background: #e65100; }
.rush-button--danger { border-color: #ef5350; background: #5d1414; }
.rush-rules-page { max-width: 1080px; margin: 10px auto; }
.rules-hero { padding: 25px; text-align: center; }
.rules-hero span { color: #ce93d8; font-weight: 900; letter-spacing: .2em; }
.rules-hero h2 { margin: 7px 0; font-size: clamp(2rem, 6vw, 4rem); }
.rules-hero p { color: #d1c4e9; font-size: 1.05rem; }
.rules-flow { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.rules-flow article { display: grid; grid-template-columns: 56px 1fr; align-items: center; gap: 13px; padding: 18px; border: 1px solid #6a1b9a; border-radius: 15px; background: rgba(17,9,22,.95); }
.rules-flow article > strong { display: grid; place-items: center; aspect-ratio: 1; border-radius: 50%; background: #7b1fa2; font-size: 1.5rem; }
.rules-flow h3 { margin: 0 0 5px; }
.rules-flow p { margin: 0; color: #cfc4d2; line-height: 1.6; }
.rules-notes { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.rules-notes article { padding: 18px; border-radius: 15px; text-align: center; }
.rules-notes span { display: block; color: #cfc4d2; font-weight: 900; }
.rules-notes strong { display: block; margin: 7px 0; font-size: 1.5rem; }
.rules-notes p { margin: 0; }
.rules-win { border: 2px solid #ffd54f; background: #352900; }
.rules-invalid { border: 2px solid #78909c; background: #172229; }
.rules-back { display: block; min-width: 220px; margin: 18px auto; }
.rush-settings h2 { margin-top: 4px; }
.settings-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 16px 0; }
.settings-grid label { display: grid; gap: 6px; padding: 13px; border: 2px solid var(--team, #7b1fa2); border-radius: 11px; background: #0b0710; color: #e1bee7; font-weight: 900; }
.settings-grid input { width: 100%; box-sizing: border-box; padding: 11px; border: 2px solid #5d3b66; border-radius: 8px; outline: none; background: #050307; color: #fff; font: inherit; font-size: 1.05rem; }
.settings-grid input:focus { border-color: #ffd54f; }
.settings-grid small { color: #9e8da5; font-size: .72rem; }
.target-setting { --team: #ffd54f; }
.settings-actions { display: flex; justify-content: flex-end; gap: 8px; }
.rush-error { color: #ff8a80; font-weight: 900; }
.rush-match-bar { max-width: 1080px; margin: 12px auto; padding: 10px 15px; display: flex; align-items: center; justify-content: center; gap: 18px; border: 1px solid #6a1b9a; border-radius: 13px; background: rgba(17,9,22,.95); }
.rush-match-bar > div { display: grid; }
.rush-match-bar span { color: #ce93d8; font-size: .68rem; font-weight: 900; }
.rush-match-bar b { color: #ffd54f; font-size: 1.35rem; letter-spacing: .17em; animation: deuce-pulse .75s ease-in-out infinite alternate; }
.rush-match-bar.deuce { border-color: #ffd54f; box-shadow: 0 0 20px rgba(255,213,79,.18); }
@keyframes deuce-pulse { to { text-shadow: 0 0 16px #ffd54f; } }
.scoreboard { max-width: 1160px; margin: 15px auto; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.scoreboard article { min-width: 0; padding: 22px; display: grid; justify-items: center; border: 5px solid var(--team); border-radius: 24px; background: rgba(5,3,7,.96); box-shadow: inset 0 0 35px color-mix(in srgb, var(--team) 10%, transparent); }
.scoreboard article > span { color: var(--team); font-size: .75rem; font-weight: 900; letter-spacing: .15em; }
.scoreboard h2 { max-width: 100%; margin: 4px 0; overflow: hidden; font-size: clamp(1.8rem, 4vw, 3rem); text-overflow: ellipsis; white-space: nowrap; }
.scoreboard article > strong { color: var(--team); font-size: clamp(7rem, 21vw, 15rem); line-height: .95; font-variant-numeric: tabular-nums; }
.scoreboard article > strong small { font-size: .13em; }
.score-controls { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 16px; }
.score-controls button { min-height: 58px; border: 2px solid var(--team); border-radius: 12px; background: color-mix(in srgb, var(--team) 22%, #100914); color: #fff; font: inherit; font-size: 1.3rem; font-weight: 900; cursor: pointer; }
.score-controls button:disabled { opacity: .3; cursor: not-allowed; }
.score-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 11px; }
.rush-winner { position: fixed; inset: 0; z-index: 50; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 24px; background: rgba(7,2,10,.96); text-align: center; }
.rush-winner span { color: #ffd54f; font-weight: 900; letter-spacing: .22em; }
.rush-winner > strong { font-size: clamp(4rem, 13vw, 9rem); }
.rush-winner p { margin: 0; color: #d1c4e9; font-size: 2rem; font-weight: 900; }
.rush-winner > div { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.rush-data summary { cursor: pointer; font-weight: 900; }
.rush-data > div { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.file-button { display: inline-grid; place-items: center; }
.file-button input { display: none; }
@media (max-width: 760px) {
  .board-rush { padding: 9px 9px 50px; }
  .rush-header { grid-template-columns: 75px 1fr; }
  .rush-header__actions { grid-column: 1 / -1; justify-content: center; }
  .rules-flow, .rules-notes, .settings-grid, .scoreboard { grid-template-columns: 1fr; }
  .rush-match-bar { align-items: stretch; flex-direction: column; text-align: center; }
  .scoreboard article > strong { font-size: clamp(7rem, 46vw, 12rem); }
  .rush-panel { padding: 13px; }
}
</style>
