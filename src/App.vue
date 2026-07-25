<template>
  <div class="app">

    <!-- チュートリアル -->
    <TutorialView v-if="showTutorial" @finish="showTutorial = false" />

    <!-- ホーム -->
    <HomeView
      v-else-if="currentView === 'home'"
      @selectCorner="onSelectCorner"
      @openAnnouncement="openAnnouncementWindow"
      @openSpotifyIntro="openSpotifyIntroWindow"
    />

    <!-- 告知スライド -->
    <AnnouncementView
      v-else-if="currentView === 'announcement'"
      @back="closePopupWindow"
    />

    <!-- Spotify イントロクイズ（QM操作画面） -->
    <SpotifyIntroView
      v-else-if="currentView === 'spotify-intro'"
      @back="closePopupWindow"
    />

    <!-- Spotify イントロクイズ（会場表示） -->
    <SpotifyAudienceView
      v-else-if="currentView === 'spotify-audience'"
    />

    <!-- コーナールール表示 -->
    <CornerRulesView
      v-else-if="currentView === 'corner'"
      :corner="selectedCorner"
      @back="currentView = 'home'"
    />

    <!-- Flip 7 セットアップ -->
    <div v-else-if="currentView === 'game' && gameState.phase === 'setup'" class="setup-screen">
      <div class="setup-card">
        <button class="setup-back-btn" @click="currentView = 'home'">← ホームに戻る</button>
        <h1 class="setup-title">🃏 Flip 7</h1>
        <p class="setup-sub">クイズ正解者がカードを引く！7種類で Flip 7 達成！</p>

        <div class="setup-section">
          <label>プレイヤー数</label>
          <div class="count-btns">
            <button
              v-for="n in [2,3,4,5,6,7,8,9,10]"
              :key="n"
              class="count-btn"
              :class="{ active: playerCount === n }"
              @click="playerCount = n"
            >{{ n }}人</button>
          </div>
        </div>

        <div class="setup-section">
          <label>目標スコア</label>
          <div class="count-btns">
            <button
              v-for="s in [100, 200, 300]"
              :key="s"
              class="count-btn"
              :class="{ active: winScore === s }"
              @click="winScore = s"
            >{{ s }}点</button>
          </div>
        </div>

        <div class="setup-players">
          <div v-for="(cfg, i) in playerConfigs.slice(0, playerCount)" :key="i" class="setup-player-row">
            <span class="setup-player-num">P{{ i + 1 }}</span>
            <input
              v-model="cfg.name"
              class="setup-name-input"
              :placeholder="`プレイヤー ${i + 1}`"
              maxlength="12"
            />
          </div>
        </div>

        <div class="setup-actions">
          <button class="btn-start" @click="startGame">ゲーム開始 →</button>
          <button class="btn-tutorial" @click="showTutorial = true">📖 チュートリアル</button>
        </div>

        <div class="setup-rules">
          <details>
            <summary>ルール概要を見る</summary>
            <ul>
              <li>クイズに正解したプレイヤーを選択 → そのプレイヤーが1枚引く</li>
              <li>引いた後、<strong>パスする</strong>か<strong>続ける</strong>かを選択</li>
              <li>重複する数字を引いたら<strong>バスト</strong>（そのラウンド0点）</li>
              <li>7種類の数字を集めると<strong>Flip 7達成！</strong> ラウンド即終了＋15点</li>
              <li>❄️ フリーズ：対象プレイヤーを強制パス</li>
              <li>🃏 フリップ3：対象プレイヤーが3枚強制ドロー</li>
              <li>🛡️ セカンドチャンス：バスト1回を回避</li>
              <li>×2カード：数字合計を2倍（加算ボーナスの前）</li>
              <li>先に目標スコア以上を取ったプレイヤーが勝利</li>
            </ul>
          </details>
        </div>
      </div>
    </div>

    <!-- ゲーム中 -->
    <template v-else-if="currentView === 'game'">
      <GameBoard
        :state="gameState"
        :validTargets="validTargets"
        :canUndo="canUndo"
        @selectDrawer="selectDrawer"
        @confirmPass="confirmPassChoice"
        @selectTarget="playerSelectTarget"
        @endRound="endRoundNow"
        @undo="undo"
      />

      <RoundSummary
        v-if="gameState.phase === 'roundEnd' || gameState.phase === 'gameEnd'"
        :players="gameState.players"
        :roundNumber="gameState.roundNumber"
        :winScore="gameState.winScore"
        @next="handleNext"
      />
    </template>

    <div v-if="!isPopupWindow" class="display-scale" aria-label="表示倍率">
      <button
        class="display-scale__button"
        :disabled="displayScale <= DISPLAY_SCALE_MIN"
        aria-label="表示を縮小"
        title="表示を縮小"
        @click="changeDisplayScale(-DISPLAY_SCALE_STEP)"
      >−</button>
      <button
        class="display-scale__value"
        aria-label="表示倍率を100%に戻す"
        title="100%に戻す"
        @click="setDisplayScale(100)"
      >{{ displayScale }}%</button>
      <button
        class="display-scale__button"
        :disabled="displayScale >= DISPLAY_SCALE_MAX"
        aria-label="表示を拡大"
        title="表示を拡大"
        @click="changeDisplayScale(DISPLAY_SCALE_STEP)"
      >＋</button>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useGame } from './game/useGame.js'
import GameBoard from './components/GameBoard.vue'
import RoundSummary from './components/RoundSummary.vue'
import TutorialView from './components/TutorialView.vue'
import HomeView from './components/HomeView.vue'
import CornerRulesView from './components/CornerRulesView.vue'
import AnnouncementView from './components/AnnouncementView.vue'
import SpotifyIntroView from './components/SpotifyIntroView.vue'
import SpotifyAudienceView from './components/SpotifyAudienceView.vue'

const {
  state: gameState,
  canUndo,
  startGame: startGameFn,
  selectDrawer,
  confirmPassChoice,
  playerSelectTarget,
  nextRound,
  getValidTargets,
  endRoundNow,
  undo,
} = useGame()

const requestedView = new URLSearchParams(window.location.search).get('view')
const popupViews = ['announcement', 'spotify-intro', 'spotify-audience']
const isPopupWindow = popupViews.includes(requestedView)
const currentView = ref(isPopupWindow ? requestedView : 'home')

const DISPLAY_SCALE_KEY = 'piyopiyo_display_scale'
const DISPLAY_SCALE_MIN = 70
const DISPLAY_SCALE_MAX = 130
const DISPLAY_SCALE_STEP = 10

function loadDisplayScale() {
  const saved = Number(localStorage.getItem(DISPLAY_SCALE_KEY))
  return saved >= DISPLAY_SCALE_MIN && saved <= DISPLAY_SCALE_MAX ? saved : 100
}

const displayScale = ref(loadDisplayScale())

function setDisplayScale(value) {
  displayScale.value = Math.min(DISPLAY_SCALE_MAX, Math.max(DISPLAY_SCALE_MIN, value))
}

function changeDisplayScale(delta) {
  setDisplayScale(displayScale.value + delta)
}

watch(displayScale, value => {
  localStorage.setItem(DISPLAY_SCALE_KEY, String(value))
  document.body.style.zoom = isPopupWindow ? '1' : String(value / 100)
}, { immediate: true })

const selectedCorner = ref(null)
const showTutorial = ref(false)
const playerCount = ref(3)
const winScore = ref(200)
const playerConfigs = reactive([
  { name: 'プレイヤー1' },
  { name: 'プレイヤー2' },
  { name: 'プレイヤー3' },
  { name: 'プレイヤー4' },
  { name: 'プレイヤー5' },
  { name: 'プレイヤー6' },
  { name: 'プレイヤー7' },
  { name: 'プレイヤー8' },
  { name: 'プレイヤー9' },
  { name: 'プレイヤー10' },
])

const validTargets = computed(() => {
  if (gameState.phase !== 'targeting' || !gameState.pendingAction) return []
  return getValidTargets(gameState.pendingAction.sourceIndex, gameState.pendingAction.card)
})

function onSelectCorner(corner) {
  if (corner.isGame) {
    currentView.value = 'game'
    gameState.phase = 'setup'
  } else {
    selectedCorner.value = corner
    currentView.value = 'corner'
  }
}

function openAnnouncementWindow() {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  url.searchParams.set('view', 'announcement')
  window.open(url, 'piyopiyo-announcement', 'popup=yes,width=1280,height=720')
}

function openSpotifyIntroWindow() {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  url.searchParams.set('view', 'spotify-intro')
  window.open(url, 'piyopiyo-spotify-intro', 'popup=yes,width=1180,height=820')
}

function closePopupWindow() {
  if (window.opener) {
    window.close()
    return
  }
  currentView.value = 'home'
}

function startGame() {
  gameState.winScore = winScore.value
  startGameFn(
    playerConfigs.slice(0, playerCount.value).map(c => ({
      name: c.name || '???',
    }))
  )
}

function handleNext() {
  if (gameState.players.some(p => p.totalScore >= gameState.winScore)) {
    currentView.value = 'home'
    gameState.phase = 'setup'
  } else {
    nextRound()
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
}

.display-scale {
  position: fixed;
  left: 16px;
  bottom: 16px;
  z-index: 900;
  display: flex;
  align-items: center;
  padding: 4px;
  background: rgba(8, 20, 10, 0.92);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.35);
}

.display-scale__button,
.display-scale__value {
  height: 36px;
  border: none;
  background: transparent;
  color: #b0bec5;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
}

.display-scale__button {
  width: 36px;
  font-size: 1.15rem;
}

.display-scale__value {
  width: 54px;
  font-size: 0.78rem;
  color: #ffd740;
}

.display-scale__button:hover:not(:disabled),
.display-scale__value:hover {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.display-scale__button:disabled {
  opacity: 0.3;
  cursor: default;
}

.setup-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
}

.setup-card {
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 36px 40px;
  max-width: 480px;
  width: 100%;
  backdrop-filter: blur(8px);
}

.setup-back-btn {
  display: block;
  margin-bottom: 16px;
  padding: 5px 12px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #546e7a;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.setup-back-btn:hover {
  border-color: rgba(255,255,255,0.3);
  color: #90a4ae;
}

.setup-title {
  text-align: center;
  font-size: 2.6rem;
  font-weight: 900;
  color: #ffd740;
  margin: 0 0 8px;
  text-shadow: 0 2px 16px rgba(255,200,0,0.5);
  letter-spacing: 0.04em;
}

.setup-sub {
  text-align: center;
  color: #78909c;
  margin: 0 0 28px;
  font-size: 0.88rem;
}

.setup-section {
  margin-bottom: 20px;
}

.setup-section label {
  display: block;
  color: #90a4ae;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin-bottom: 8px;
}

.count-btns {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.count-btn {
  flex: 1;
  min-width: 44px;
  padding: 8px;
  border: 2px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  background: rgba(255,255,255,0.04);
  color: #78909c;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
  font-family: inherit;
}

.count-btn.active {
  border-color: #ffd740;
  color: #ffd740;
  background: rgba(255,215,0,0.1);
}

.count-btn:hover:not(.active) {
  border-color: rgba(255,255,255,0.25);
  color: #cfd8dc;
}

.setup-players {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}

.setup-player-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setup-player-num {
  color: #546e7a;
  font-size: 0.8rem;
  width: 28px;
  flex-shrink: 0;
}

.setup-name-input {
  flex: 1;
  padding: 8px 12px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 6px;
  color: #eceff1;
  font-size: 0.95rem;
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}

.setup-name-input:focus { border-color: #42a5f5; }
.setup-name-input::placeholder { color: #37474f; }

.setup-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.btn-start {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #43a047, #2e7d32);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(67,160,71,0.5);
  filter: brightness(1.08);
}

.btn-tutorial {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: #78909c;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.btn-tutorial:hover {
  border-color: #ffd740;
  color: #ffd740;
}

.setup-rules {
  font-size: 0.8rem;
}

.setup-rules summary {
  cursor: pointer;
  color: #546e7a;
  user-select: none;
  margin-bottom: 8px;
}

.setup-rules ul {
  padding-left: 1.3em;
  line-height: 2;
  margin: 8px 0 0;
  color: #607d8b;
}

.setup-rules strong { color: #90a4ae; }
</style>
