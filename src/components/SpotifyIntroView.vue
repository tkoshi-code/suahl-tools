<template>
  <div class="intro-tool">
    <header class="intro-tool__header">
      <button class="icon-button" type="button" aria-label="ウインドウを閉じる" title="閉じる" @click="emit('back')">
        ←
      </button>
      <div class="intro-tool__heading">
        <span class="intro-tool__kicker">QM TOOL</span>
        <h1>Spotify イントロクイズ</h1>
      </div>
      <button class="audience-button" type="button" @click="openAudienceWindow">
        会場表示を開く ↗
      </button>
    </header>

    <main class="intro-tool__main">
      <section class="control-panel" aria-labelledby="control-title">
        <div class="section-heading">
          <h2 id="control-title">出題コントロール</h2>
          <span class="status-label" :class="`status-label--${playerStatus.type}`">
            {{ playerStatus.text }}
          </span>
        </div>

        <div v-if="!activeTrack" class="empty-state">
          登録曲の「セット」を押してください
        </div>

        <template v-else>
          <div class="current-track">
            <span class="current-track__label">QM確認用</span>
            <strong>{{ activeTrack.answer }}</strong>
          </div>

          <div class="spotify-player">
            <div ref="embedHost" class="spotify-player__host"></div>
            <div v-if="playerLoading" class="spotify-player__loading">Spotifyを読み込み中...</div>
          </div>

          <p v-if="playerError" class="inline-error" role="alert">{{ playerError }}</p>

          <div class="timer-row">
            <div class="timer-value" :class="{ 'timer-value--running': isPlaying }">
              {{ remainingSeconds }}
            </div>
            <div class="timer-copy">
              <span>{{ isPlaying ? '再生中' : hasPlayed ? '停止しました' : '再生待ち' }}</span>
              <small>{{ S.introSeconds }}秒で自動停止</small>
            </div>
          </div>

          <div class="primary-controls">
            <button
              class="command-button command-button--play"
              type="button"
              :disabled="!playerReady || isPlaying"
              @click="startIntro"
            >
              ▶ {{ S.introSeconds }}秒再生
            </button>
            <button
              class="command-button"
              type="button"
              :disabled="!playerReady || !isPlaying"
              @click="pauseIntro"
            >
              ■ 停止
            </button>
            <button
              class="command-button command-button--answer"
              type="button"
              :disabled="!hasPlayed"
              @click="toggleAnswer"
            >
              {{ answerRevealed ? '答えを隠す' : '会場に答えを表示' }}
            </button>
          </div>

          <button class="next-button" type="button" :disabled="S.tracks.length === 0" @click="selectRandomTrack">
            次の曲をランダムにセット →
          </button>
        </template>
      </section>

      <section class="library-panel" aria-labelledby="library-title">
        <div class="section-heading">
          <h2 id="library-title">出題曲</h2>
          <span class="track-count">{{ S.tracks.length }}曲</span>
        </div>

        <form class="track-form" @submit.prevent="saveTrack">
          <label for="spotify-url">Spotifyの曲URL</label>
          <input
            id="spotify-url"
            v-model.trim="form.url"
            type="text"
            inputmode="url"
            autocomplete="off"
            placeholder="https://open.spotify.com/track/..."
            @input="formError = ''"
          />

          <label for="spotify-answer">表示する答え</label>
          <input
            id="spotify-answer"
            v-model.trim="form.answer"
            type="text"
            maxlength="100"
            autocomplete="off"
            placeholder="曲名 / アーティスト名"
            @input="formError = ''"
          />

          <p v-if="formError" class="inline-error" role="alert">{{ formError }}</p>

          <div class="form-actions">
            <button class="add-button" type="submit">
              {{ editingId ? '変更を保存' : '＋ 曲を追加' }}
            </button>
            <button v-if="editingId" class="text-button" type="button" @click="cancelEdit">
              キャンセル
            </button>
          </div>
        </form>

        <div class="duration-setting">
          <label for="intro-seconds">再生時間</label>
          <div class="duration-setting__input">
            <input
              id="intro-seconds"
              v-model.number="S.introSeconds"
              type="number"
              min="3"
              max="30"
              step="1"
              @change="normalizeDuration"
            />
            <span>秒</span>
          </div>
        </div>

        <div v-if="S.tracks.length === 0" class="empty-state empty-state--library">
          Spotifyの曲URLと答えを登録してください
        </div>

        <div v-else class="track-list">
          <div
            v-for="(track, index) in S.tracks"
            :key="track.id"
            class="track-row"
            :class="{ 'track-row--active': activeTrack?.id === track.id }"
          >
            <span class="track-row__number">{{ index + 1 }}</span>
            <div class="track-row__body">
              <strong>{{ track.answer }}</strong>
              <span>{{ playedTrackIds.includes(track.id) ? '出題済み' : '未出題' }}</span>
            </div>
            <button class="set-button" type="button" @click="setTrack(track)">セット</button>
            <button class="row-icon-button" type="button" aria-label="曲を編集" title="編集" @click="editTrack(track)">
              ✎
            </button>
            <button class="row-icon-button row-icon-button--danger" type="button" aria-label="曲を削除" title="削除" @click="deleteTrack(track)">
              ×
            </button>
          </div>
        </div>

        <div class="data-actions">
          <button class="text-button" type="button" @click="exportData">JSON出力</button>
          <label class="text-button text-button--file">
            JSON復元
            <input type="file" accept="application/json,.json" @change="restoreData" />
          </label>
          <button
            v-if="playedTrackIds.length"
            class="text-button"
            type="button"
            @click="playedTrackIds = []"
          >
            出題履歴をクリア
          </button>
        </div>

        <details class="usage-notes">
          <summary>利用時の注意</summary>
          <p>この画面はQM専用です。会場には「会場表示」を別ウインドウで開いて表示してください。</p>
          <p>ブラウザの自動再生制限で音が出ない場合は、Spotifyプレーヤー内の再生ボタンを一度押してください。</p>
          <p>プレイリストの自動取込には対応していません。曲の共有リンクを1曲ずつ登録します。</p>
          <p>店舗イベントでの利用に必要な楽曲の権利とSpotifyの利用条件は、運営側で確認してください。</p>
        </details>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { loadSpotifyIframeApi, parseSpotifyTrack } from '../utils/spotify.js'

const emit = defineEmits(['back'])

const STORAGE_KEY = 'piyopiyo_spotify_intro_v1'
const CHANNEL_NAME = 'piyopiyo_spotify_intro_channel_v1'
const MIN_SECONDS = 3
const MAX_SECONDS = 30

function createTrackId() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeStoredTrack(track) {
  const parsed = parseSpotifyTrack(track?.url || track?.uri)
  const answer = String(track?.answer || '').trim()
  if (!parsed || !answer) return null

  return {
    id: String(track.id || createTrackId()),
    spotifyId: parsed.id,
    url: parsed.url,
    answer: answer.slice(0, 100),
  }
}

function loadState() {
  const fallback = { introSeconds: 10, tracks: [] }

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    if (!saved || typeof saved !== 'object') return fallback

    const seconds = Number(saved.introSeconds)
    return {
      introSeconds: Number.isFinite(seconds)
        ? Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(seconds)))
        : fallback.introSeconds,
      tracks: Array.isArray(saved.tracks)
        ? saved.tracks.map(normalizeStoredTrack).filter(Boolean)
        : [],
    }
  } catch {
    return fallback
  }
}

const S = reactive(loadState())
const form = reactive({ url: '', answer: '' })
const formError = ref('')
const editingId = ref('')
const activeTrack = ref(null)
const playedTrackIds = ref([])
const embedHost = ref(null)
const playerLoading = ref(false)
const playerReady = ref(false)
const playerError = ref('')
const isPlaying = ref(false)
const hasPlayed = ref(false)
const answerRevealed = ref(false)
const remainingSeconds = ref(S.introSeconds)

let embedController = null
let countdownTimer = null
let countdownEndsAt = 0
let channel = null

const playerStatus = computed(() => {
  if (playerError.value) return { type: 'error', text: '読込エラー' }
  if (playerLoading.value) return { type: 'loading', text: '読込中' }
  if (isPlaying.value) return { type: 'playing', text: '再生中' }
  if (activeTrack.value) return { type: 'ready', text: 'セット済み' }
  return { type: 'idle', text: '未選択' }
})

watch(S, () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    introSeconds: S.introSeconds,
    tracks: S.tracks,
  }))
}, { deep: true })

watch(
  [activeTrack, isPlaying, hasPlayed, answerRevealed, remainingSeconds],
  publishAudienceState,
)

function normalizeDuration() {
  const value = Number(S.introSeconds)
  S.introSeconds = Number.isFinite(value)
    ? Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(value)))
    : 10
  if (!isPlaying.value) remainingSeconds.value = S.introSeconds
}

function saveTrack() {
  const parsed = parseSpotifyTrack(form.url)
  const answer = form.answer.trim()

  if (!parsed) {
    formError.value = 'open.spotify.com の曲共有URLを入力してください'
    return
  }
  if (!answer) {
    formError.value = '会場に表示する答えを入力してください'
    return
  }

  const duplicate = S.tracks.find(track => track.spotifyId === parsed.id && track.id !== editingId.value)
  if (duplicate) {
    formError.value = 'この曲はすでに登録されています'
    return
  }

  if (editingId.value) {
    const index = S.tracks.findIndex(track => track.id === editingId.value)
    if (index >= 0) {
      const updated = {
        id: editingId.value,
        spotifyId: parsed.id,
        url: parsed.url,
        answer: answer.slice(0, 100),
      }
      S.tracks[index] = updated
      if (activeTrack.value?.id === editingId.value) setTrack(updated)
    }
  } else {
    const track = {
      id: createTrackId(),
      spotifyId: parsed.id,
      url: parsed.url,
      answer: answer.slice(0, 100),
    }
    S.tracks.push(track)
    if (!activeTrack.value) setTrack(track)
  }

  cancelEdit()
}

function editTrack(track) {
  editingId.value = track.id
  form.url = track.url
  form.answer = track.answer
  formError.value = ''
}

function cancelEdit() {
  editingId.value = ''
  form.url = ''
  form.answer = ''
  formError.value = ''
}

function deleteTrack(track) {
  if (!window.confirm(`「${track.answer}」を削除しますか？`)) return

  const index = S.tracks.findIndex(item => item.id === track.id)
  if (index >= 0) S.tracks.splice(index, 1)
  playedTrackIds.value = playedTrackIds.value.filter(id => id !== track.id)

  if (activeTrack.value?.id === track.id) {
    pauseIntro()
    activeTrack.value = null
    playerReady.value = false
    embedController?.destroy()
    embedController = null
  }

  if (editingId.value === track.id) cancelEdit()
}

async function setTrack(track) {
  stopCountdown()
  activeTrack.value = track
  remainingSeconds.value = S.introSeconds
  hasPlayed.value = false
  answerRevealed.value = false
  playerError.value = ''

  if (embedController) {
    embedController.pause()
    embedController.loadEntity(track.url, false, 0)
    playerReady.value = true
    return
  }

  await nextTick()
  await createPlayer(track)
}

async function createPlayer(track) {
  if (!embedHost.value || embedController) return
  playerLoading.value = true
  playerReady.value = false

  try {
    const iframeApi = await loadSpotifyIframeApi()
    if (!embedHost.value) return

    iframeApi.createController(
      embedHost.value,
      {
        width: '100%',
        height: 152,
        url: activeTrack.value?.url || track.url,
      },
      (controller) => {
        embedController = controller
        playerLoading.value = false
        playerReady.value = true

        controller.addListener('ready', () => {
          playerReady.value = true
        })
        controller.addListener('playback_update', (event) => {
          if (event?.data?.isPaused && isPlaying.value && event.data.position > 0) {
            stopCountdown()
            hasPlayed.value = true
          }
        })

        if (activeTrack.value?.id !== track.id) {
          controller.loadEntity(activeTrack.value.url, false, 0)
        }
      },
    )
  } catch (error) {
    playerLoading.value = false
    playerReady.value = false
    playerError.value = error instanceof Error ? error.message : 'Spotifyを読み込めませんでした'
  }
}

function startIntro() {
  if (!embedController || !activeTrack.value) return

  stopCountdown()
  answerRevealed.value = false
  hasPlayed.value = false
  remainingSeconds.value = S.introSeconds
  playerError.value = ''

  embedController.restart()
  embedController.play()
  isPlaying.value = true
  countdownEndsAt = Date.now() + S.introSeconds * 1000

  if (!playedTrackIds.value.includes(activeTrack.value.id)) {
    playedTrackIds.value = [...playedTrackIds.value, activeTrack.value.id]
  }

  countdownTimer = window.setInterval(updateCountdown, 100)
}

function updateCountdown() {
  const millisecondsLeft = Math.max(0, countdownEndsAt - Date.now())
  remainingSeconds.value = Math.ceil(millisecondsLeft / 1000)

  if (millisecondsLeft > 0) return

  embedController?.pause()
  stopCountdown()
  hasPlayed.value = true
  remainingSeconds.value = 0
}

function pauseIntro() {
  embedController?.pause()
  stopCountdown()
  if (activeTrack.value) hasPlayed.value = true
}

function stopCountdown() {
  window.clearInterval(countdownTimer)
  countdownTimer = null
  isPlaying.value = false
}

function toggleAnswer() {
  if (!hasPlayed.value) return
  answerRevealed.value = !answerRevealed.value
}

async function selectRandomTrack() {
  if (!S.tracks.length) return

  let candidates = S.tracks.filter(track => (
    !playedTrackIds.value.includes(track.id) && track.id !== activeTrack.value?.id
  ))

  if (!candidates.length) {
    playedTrackIds.value = activeTrack.value ? [activeTrack.value.id] : []
    candidates = S.tracks.filter(track => track.id !== activeTrack.value?.id)
  }
  if (!candidates.length) candidates = [...S.tracks]

  const nextTrack = candidates[Math.floor(Math.random() * candidates.length)]
  await setTrack(nextTrack)
}

function getAudienceState() {
  let phase = 'idle'
  if (activeTrack.value) phase = hasPlayed.value ? 'waiting' : 'ready'
  if (isPlaying.value) phase = 'playing'
  if (answerRevealed.value) phase = 'answer'

  return {
    type: 'state',
    phase,
    remaining: remainingSeconds.value,
    answer: answerRevealed.value ? activeTrack.value?.answer || '' : '',
  }
}

function publishAudienceState() {
  channel?.postMessage(getAudienceState())
}

function openAudienceWindow() {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin)
  url.searchParams.set('view', 'spotify-audience')
  window.open(url, 'piyopiyo-spotify-audience', 'popup=yes,width=1280,height=720')
  window.setTimeout(publishAudienceState, 500)
}

function exportData() {
  const data = JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    introSeconds: S.introSeconds,
    tracks: S.tracks,
  }, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `spotify-intro-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function restoreData(event) {
  const input = event.target
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  try {
    const parsed = JSON.parse(await file.text())
    const tracks = Array.isArray(parsed.tracks)
      ? parsed.tracks.map(normalizeStoredTrack).filter(Boolean)
      : null
    if (!tracks) throw new Error('tracksがありません')
    if (!window.confirm(`${tracks.length}曲のバックアップで現在の登録内容を置き換えますか？`)) return

    pauseIntro()
    embedController?.destroy()
    embedController = null
    activeTrack.value = null
    playerReady.value = false
    playedTrackIds.value = []
    S.tracks.splice(0, S.tracks.length, ...tracks)
    S.introSeconds = Number(parsed.introSeconds) || 10
    normalizeDuration()
  } catch {
    window.alert('JSONを復元できませんでした。ファイルの内容を確認してください。')
  }
}

onMounted(() => {
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (event) => {
      if (event.data?.type === 'request-state') publishAudienceState()
    }
  }
})

onUnmounted(() => {
  stopCountdown()
  embedController?.destroy()
  channel?.close()
})
</script>

<style scoped>
.intro-tool {
  min-height: 100vh;
  background: #111713;
  color: #edf3ef;
}

.intro-tool__header {
  min-height: 76px;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 12px 24px;
  background: #0b100d;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.intro-tool__heading {
  min-width: 0;
}

.intro-tool__heading h1 {
  margin: 2px 0 0;
  font-size: 1.35rem;
  line-height: 1.2;
}

.intro-tool__kicker {
  display: block;
  color: #1ed760;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.icon-button,
.row-icon-button {
  display: grid;
  place-items: center;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 6px;
  background: transparent;
  color: #a8b8ac;
  cursor: pointer;
}

.icon-button {
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
}

.icon-button:hover,
.row-icon-button:hover {
  border-color: rgba(255,255,255,0.32);
  color: #fff;
}

.audience-button {
  min-height: 40px;
  padding: 8px 14px;
  border: 1px solid #1ed760;
  border-radius: 6px;
  background: transparent;
  color: #1ed760;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
}

.audience-button:hover {
  background: rgba(30,215,96,0.1);
}

.intro-tool__main {
  width: min(1120px, calc(100% - 32px));
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.85fr);
  gap: 18px;
  margin: 0 auto;
  padding: 24px 0 48px;
}

.control-panel,
.library-panel {
  min-width: 0;
  align-self: start;
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  background: #151d18;
}

.section-heading {
  min-height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.section-heading h2 {
  margin: 0;
  font-size: 1rem;
}

.status-label,
.track-count {
  color: #829087;
  font-size: 0.7rem;
  font-weight: 700;
}

.status-label--playing {
  color: #1ed760;
}

.status-label--error {
  color: #ff6b6b;
}

.current-track {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.current-track__label {
  color: #728078;
  font-size: 0.65rem;
}

.current-track strong {
  overflow-wrap: anywhere;
  color: #ffd740;
  font-size: 1.2rem;
}

.spotify-player {
  position: relative;
  min-height: 152px;
  overflow: hidden;
  border-radius: 8px;
  background: #080a09;
}

.spotify-player__host {
  min-height: 152px;
}

.spotify-player__host :deep(iframe) {
  display: block;
  width: 100%;
  min-height: 152px;
  border: none;
}

.spotify-player__loading {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #829087;
  font-size: 0.8rem;
  background: #080a09;
}

.inline-error {
  margin: 8px 0 0;
  color: #ff6b6b;
  font-size: 0.75rem;
  line-height: 1.5;
}

.timer-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 18px 0;
}

.timer-value {
  width: 82px;
  height: 82px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 2px solid #4a5850;
  border-radius: 50%;
  color: #e9efeb;
  font-size: 2.3rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.timer-value--running {
  border-color: #1ed760;
  color: #1ed760;
}

.timer-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #d1dbd4;
  font-weight: 700;
}

.timer-copy small {
  color: #728078;
  font-size: 0.72rem;
  font-weight: 400;
}

.primary-controls {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.command-button,
.next-button,
.set-button,
.add-button,
.text-button {
  border-radius: 6px;
  font-family: inherit;
  cursor: pointer;
}

.command-button {
  min-height: 42px;
  padding: 8px 14px;
  border: 1px solid rgba(255,255,255,0.16);
  background: #222c26;
  color: #dce5df;
  font-weight: 700;
}

.command-button--play {
  background: #1ed760;
  border-color: #1ed760;
  color: #07140b;
}

.command-button--answer {
  grid-column: 1 / -1;
  border-color: #ffd740;
  background: rgba(255,215,64,0.08);
  color: #ffd740;
}

.command-button:hover:not(:disabled),
.set-button:hover,
.add-button:hover {
  filter: brightness(1.12);
}

.command-button:disabled,
.next-button:disabled {
  opacity: 0.38;
  cursor: default;
}

.next-button {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  border: none;
  background: transparent;
  color: #9aaba0;
}

.next-button:hover:not(:disabled) {
  color: #fff;
  background: rgba(255,255,255,0.04);
}

.track-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.track-form label,
.duration-setting label {
  margin-top: 5px;
  color: #829087;
  font-size: 0.7rem;
}

.track-form input,
.duration-setting input {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 6px;
  outline: none;
  background: #0c120e;
  color: #edf3ef;
}

.track-form input:focus,
.duration-setting input:focus {
  border-color: #1ed760;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.add-button {
  min-height: 36px;
  padding: 7px 14px;
  border: none;
  background: #24783f;
  color: #fff;
  font-weight: 700;
}

.duration-setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0;
}

.duration-setting__input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.duration-setting input {
  width: 72px;
  text-align: right;
}

.duration-setting__input span {
  color: #9aaba0;
  font-size: 0.8rem;
}

.empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  padding: 24px;
  border: 1px dashed rgba(255,255,255,0.13);
  border-radius: 8px;
  color: #6f7f75;
  font-size: 0.82rem;
  text-align: center;
}

.empty-state--library {
  min-height: 90px;
}

.track-list {
  display: flex;
  max-height: 360px;
  flex-direction: column;
  overflow-y: auto;
  border-top: 1px solid rgba(255,255,255,0.08);
}

.track-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto 32px 32px;
  align-items: center;
  gap: 7px;
  min-height: 58px;
  padding: 8px 2px;
  border-bottom: 1px solid rgba(255,255,255,0.07);
}

.track-row--active {
  background: rgba(30,215,96,0.05);
}

.track-row__number {
  color: #5f7065;
  font-size: 0.7rem;
  text-align: center;
}

.track-row__body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.track-row__body strong {
  overflow: hidden;
  color: #dce5df;
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-row__body span {
  color: #617066;
  font-size: 0.65rem;
}

.set-button {
  padding: 5px 9px;
  border: 1px solid #24783f;
  background: transparent;
  color: #65d98a;
  font-size: 0.7rem;
  font-weight: 700;
}

.row-icon-button {
  width: 28px;
  height: 28px;
}

.row-icon-button--danger:hover {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.data-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}

.text-button {
  padding: 5px 9px;
  border: 1px solid rgba(255,255,255,0.12);
  background: transparent;
  color: #829087;
  font-size: 0.68rem;
}

.text-button:hover {
  border-color: rgba(255,255,255,0.28);
  color: #d7e0da;
}

.text-button--file input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
}

.usage-notes {
  margin-top: 16px;
  color: #718077;
  font-size: 0.7rem;
  line-height: 1.6;
}

.usage-notes summary {
  cursor: pointer;
}

.usage-notes p {
  margin: 8px 0 0;
}

@media (max-width: 820px) {
  .intro-tool__main {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .intro-tool__header {
    grid-template-columns: 40px minmax(0, 1fr);
    padding: 10px 14px;
  }

  .intro-tool__heading h1 {
    font-size: 1rem;
  }

  .audience-button {
    grid-column: 1 / -1;
    width: 100%;
  }

  .intro-tool__main {
    width: min(100% - 20px, 1120px);
    padding-top: 12px;
  }

  .control-panel,
  .library-panel {
    padding: 14px;
  }

  .track-row {
    grid-template-columns: 24px minmax(0, 1fr) auto 30px 30px;
    gap: 4px;
  }
}
</style>
