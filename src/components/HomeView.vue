<template>
  <div class="home">

    <!-- ヘッダー（イベント情報） -->
    <div class="home__header">
      <template v-if="!editMode">
        <div class="header-view">
          <div class="header-view__event-label">TODAY'S EVENT</div>
          <h1 class="header-view__event-name">{{ info.eventName || 'イベント名未設定' }}</h1>
          <div class="header-view__meta">
            <span>📍 {{ info.location || '場所未設定' }}</span>
            <span>📅 {{ displayDate }}</span>
            <span v-if="info.timeOfDay">{{ timeLabel }}</span>
          </div>
          <div class="header-view__staff" v-if="info.qm || info.hall">
            <span v-if="info.qm">QM: {{ info.qm }}</span>
            <span v-if="info.hall">ホール: {{ info.hall }}</span>
          </div>
          <div class="header-view__actions">
            <button class="break-btn" @click="openBreak">☕ 休憩</button>
            <button class="profile-btn" @click="showProfile = true">👤 QMプロフィール</button>
            <button class="edit-btn" @click="startEdit">✏️ 編集</button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="header-edit">
          <div class="edit-title">イベント情報を編集</div>

          <div class="edit-row">
            <label>TODAY'S EVENT</label>
            <input v-model="draft.eventName" placeholder="ぴよぴよデー" />
          </div>
          <div class="edit-row">
            <label>場所</label>
            <input v-model="draft.location" placeholder="スアールXX店" />
          </div>
          <div class="edit-row">
            <label>日付</label>
            <input type="date" v-model="draft.date" />
          </div>
          <div class="edit-row">
            <label>時間帯</label>
            <div class="radio-group">
              <label v-for="t in ['朝', '昼', '夜']" :key="t" class="radio-label">
                <input type="radio" v-model="draft.timeOfDay" :value="t" />
                {{ t }}
              </label>
            </div>
          </div>
          <div class="edit-row">
            <label>QM</label>
            <input v-model="draft.qm" placeholder="名前" />
          </div>
          <div class="edit-row">
            <label>ホール</label>
            <input v-model="draft.hall" placeholder="名前" />
          </div>

          <div class="edit-actions">
            <button class="save-btn" @click="saveEdit">保存</button>
            <button class="cancel-btn" @click="editMode = false">キャンセル</button>
          </div>
        </div>
      </template>
    </div>

    <!-- コーナー一覧 -->
    <div class="home__section-title">コーナー一覧 <span class="drag-hint">（ドラッグで並び替え）</span></div>
    <div class="home__corners">
      <div
        v-for="(corner, idx) in orderedCorners"
        :key="corner.id"
        class="corner-card"
        :class="{
          'corner-card--game': corner.isGame,
          'corner-card--dragging': draggingIdx === idx,
          'corner-card--over': dragOverIdx === idx && draggingIdx !== idx,
        }"
        draggable="true"
        @dragstart="onDragStart($event, idx)"
        @dragover.prevent="onDragOver($event, idx)"
        @dragleave="onDragLeave"
        @drop="onDrop($event, idx)"
        @dragend="onDragEnd"
        @click="onCardClick(corner)"
      >
        <span class="corner-card__handle" @click.stop>⠿</span>
        <span class="corner-card__icon">{{ corner.icon }}</span>
        <div class="corner-card__text">
          <div class="corner-card__title-row">
            <span class="corner-card__title" :style="{ color: corner.titleColor }">{{ corner.title }}</span>
            <div v-if="corner.tags && corner.tags.length" class="corner-card__tags">
              <span
                v-for="tag in corner.tags"
                :key="tag"
                class="tag-chip"
                :style="{ color: TAG_CONFIG[tag]?.color, background: TAG_CONFIG[tag]?.bg }"
              >{{ tag }}</span>
            </div>
          </div>
          <span class="corner-card__sub">{{ corner.bullets[0] }}</span>
        </div>
        <span class="corner-card__arrow">→</span>
      </div>
    </div>

    <!-- 休憩 入力モーダル -->
    <Teleport to="body">
      <div v-if="showBreakInput" class="profile-overlay" @click.self="showBreakInput = false">
        <div class="break-input-modal">
          <div class="break-input-title">☕ 休憩アナウンス</div>
          <div class="break-input-label">再開時刻を入力</div>
          <input
            ref="breakTimeInput"
            v-model="breakTime"
            class="break-time-field"
            type="time"
            @keyup.enter="startBreak"
          />
          <div class="break-preview" v-if="breakTime">
            {{ breakTime }} 分から再開します
          </div>
          <div class="break-bgm">
            <label class="break-bgm__toggle">
              <input v-model="breakBgmEnabled" type="checkbox" />
              <span>YouTube BGMを再生</span>
            </label>
            <div v-if="breakBgmEnabled" class="break-bgm__fields">
              <label for="break-bgm-url">動画・再生リストURL</label>
              <input
                id="break-bgm-url"
                v-model.trim="breakBgmUrl"
                class="break-bgm__url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                @input="breakBgmError = ''"
              />
              <span class="break-bgm__hint">設定はこの端末に保存されます</span>
              <span v-if="breakBgmError" class="break-bgm__error">{{ breakBgmError }}</span>
            </div>
          </div>
          <div class="break-modal-actions">
            <button class="break-start-btn" :disabled="!breakTime" @click="startBreak">表示する</button>
            <button class="cancel-btn" @click="showBreakInput = false">キャンセル</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 休憩 全画面表示 -->
    <Teleport to="body">
      <div v-if="showBreakScreen" class="break-screen">
        <div class="break-screen__content">
          <div class="break-screen__icon">☕</div>
          <div class="break-screen__message">
            <span class="break-screen__time">{{ breakTime }}</span>
            <span class="break-screen__text"> 分から再開します</span>
          </div>
        </div>
        <div v-if="activeBreakBgmUrl" class="break-screen__player">
          <iframe
            :src="activeBreakBgmUrl"
            title="休憩中のYouTube BGM"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
          />
        </div>
        <button class="break-screen__close" @click="closeBreak">✕ 休憩終了</button>
      </div>
    </Teleport>

    <!-- QMプロフィール モーダル -->
    <Teleport to="body">
      <div v-if="showProfile" class="profile-overlay" @click.self="closeProfile">
        <div class="profile-modal">
          <button class="profile-close" @click="closeProfile">✕</button>

          <!-- 表示モード -->
          <template v-if="!profileEdit">
            <div class="profile-header">
              <div class="profile-name-ja">{{ profile.nameJa }}</div>
              <div class="profile-name-real" v-if="profile.nameReal">{{ profile.nameReal }}</div>
            </div>
            <div class="profile-body">
              <div class="profile-section" v-if="profile.intro.length">
                <div class="profile-item" v-for="(item, i) in profile.intro" :key="i">{{ item }}</div>
              </div>
              <div class="profile-creed" v-if="profile.creed">{{ profile.creed }}</div>
              <div class="profile-section" v-for="(sec, si) in profile.sections" :key="si">
                <div class="profile-label" v-if="sec.label">{{ sec.label }}</div>
                <div class="profile-item" v-for="(item, i) in sec.items" :key="i">{{ item }}</div>
              </div>
            </div>
            <div class="profile-edit-actions">
              <button class="profile-edit-btn" @click="startProfileEdit">✏️ 編集</button>
            </div>
          </template>

          <!-- 編集モード -->
          <template v-else>
            <div class="profile-edit">
              <div class="edit-title">QMプロフィールを編集</div>

              <div class="edit-row">
                <label>表示名</label>
                <input v-model="profileDraft.nameJa" placeholder="タケやす" />
              </div>
              <div class="edit-row">
                <label>本名など</label>
                <input v-model="profileDraft.nameReal" placeholder="本名　輿 友浩" />
              </div>

              <div class="pe-block">
                <div class="pe-block-head">
                  <span class="pe-block-title">経歴・冒頭</span>
                  <button class="pe-add" @click="addIntroItem">＋ 行を追加</button>
                </div>
                <div class="pe-item" v-for="(item, i) in profileDraft.intro" :key="i">
                  <input v-model="profileDraft.intro[i]" placeholder="例：📅 2023年4月　…" />
                  <button class="pe-remove" @click="removeIntroItem(i)" title="この行を削除">✕</button>
                </div>
              </div>

              <div class="pe-block">
                <div class="pe-block-head">
                  <span class="pe-block-title">信条・メッセージ</span>
                </div>
                <textarea
                  v-model="profileDraft.creed"
                  class="pe-textarea"
                  rows="3"
                  placeholder="毎回、お客様に合わせて…（改行できます）"
                ></textarea>
              </div>

              <div class="pe-block" v-for="(sec, si) in profileDraft.sections" :key="si">
                <div class="pe-block-head">
                  <input v-model="sec.label" class="pe-section-label" placeholder="セクション名（例：担当イベント）" />
                  <button class="pe-add" @click="addSectionItem(si)">＋ 行</button>
                  <button class="pe-remove-section" @click="removeSection(si)">削除</button>
                </div>
                <div class="pe-item" v-for="(item, i) in sec.items" :key="i">
                  <input v-model="sec.items[i]" placeholder="内容" />
                  <button class="pe-remove" @click="removeSectionItem(si, i)" title="この行を削除">✕</button>
                </div>
              </div>

              <button class="pe-add-section" @click="addSection">＋ セクションを追加</button>

              <div class="edit-actions">
                <button class="save-btn" @click="saveProfile">保存</button>
                <button class="cancel-btn" @click="cancelProfileEdit">キャンセル</button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- ツール（折りたたみ） -->
    <details class="home__tools-details">
      <summary class="home__tools-summary">🔧 ツール</summary>
      <div class="home__tools">
        <button class="tool-card tool-card--internal" @click="emit('openAnnouncement')">
          <span class="tool-card__icon">📢</span>
          <div class="tool-card__text">
            <span class="tool-card__title">告知スライド</span>
            <span class="tool-card__sub">お客さん向け・新しいウィンドウで表示</span>
          </div>
          <span class="tool-card__ext">↗</span>
        </button>
        <button class="tool-card tool-card--internal" @click="emit('openSpotifyIntro')">
          <span class="tool-card__icon">♫</span>
          <div class="tool-card__text">
            <span class="tool-card__title">Spotify イントロクイズ</span>
            <span class="tool-card__sub">QM専用・新しいウィンドウで操作</span>
          </div>
          <span class="tool-card__ext">↗</span>
        </button>
        <a
          v-for="tool in TOOLS"
          :key="tool.id"
          :href="tool.url"
          target="_blank"
          rel="noopener"
          class="tool-card"
        >
          <span class="tool-card__icon">{{ tool.icon }}</span>
          <div class="tool-card__text">
            <span class="tool-card__title">{{ tool.title }}</span>
            <span class="tool-card__sub">{{ tool.sub }}</span>
          </div>
          <span class="tool-card__ext">↗</span>
        </a>
      </div>
    </details>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import { PIYOPIYO_CORNERS, TAG_CONFIG } from '../data/corners.js'
import { toYouTubeEmbedUrl } from '../utils/youtube.js'

const emit = defineEmits(['selectCorner', 'openAnnouncement', 'openSpotifyIntro'])

const TOOLS = [
  {
    id: 'quiz-db',
    title: '問題データベース',
    sub: 'QM専用・別ウィンドウで開く',
    icon: '🗄️',
    url: 'https://suahl-quiz-database-03cb3537e4da.herokuapp.com/login',
  },
  {
    id: 'score',
    title: '得点表示アプリ',
    sub: 'kissq・別ウィンドウで開く',
    icon: '🏆',
    url: 'https://kissge.github.io/kissq/',
  },
  {
    id: 'suahl-hp',
    title: 'スアール公式HP',
    sub: 'suahl.com',
    icon: '🏠',
    url: 'https://suahl.com/',
  },
]

// --- イベント情報 ---
const STORAGE_INFO_KEY = 'piyopiyo_event_info'
const STORAGE_ORDER_KEY = 'piyopiyo_corner_order'

function loadInfo() {
  try {
    const saved = localStorage.getItem(STORAGE_INFO_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return {
    eventName: 'ぴよぴよデー',
    location: 'スアール',
    date: new Date().toISOString().slice(0, 10),
    timeOfDay: '昼',
    qm: '',
    hall: '',
  }
}

const info = reactive(loadInfo())
const editMode = ref(false)
const draft = reactive({})

// --- QMプロフィール ---
const STORAGE_PROFILE_KEY = 'piyopiyo_qm_profile'

const DEFAULT_PROFILE = {
  nameJa: 'タケやす',
  nameReal: '本名　輿 友浩',
  intro: [
    '📅 2023年4月　スアール秋葉原 クイズマスターとして勤務開始',
    '🏪 2024年11月　スアール秋葉原店 店長就任',
    '🗺️ 2025年12月　東京エリアマネージャ就任（スアール蒲田店オープン）',
  ],
  creed: '毎回、お客様に合わせてクイズを行います。\nお客様に「楽しかった」と思ってもらえることが一番！！',
  sections: [
    {
      label: '担当イベント',
      items: [
        '🎤 秋葉原（特に金曜日）メイン',
        '🍑 松嶋桃デー 担当',
        '1/n店長回 担当　／　SXCバディカップ 担当',
      ],
    },
    {
      label: 'その他の活動',
      items: [
        '📺 YouTube まる芸TV!! 黄色担当',
        '🀄 最高位戦日本プロ麻雀協会所属（D3リーグ）',
        '🏆 AQL副会長・AQL神奈川代表',
        '⚾ ベイスターズファン（2020年3月 アタック25 プロ野球ファン大会出場）',
        '🎙️ ゆる言語学ラジオ 元編集',
      ],
    },
  ],
}

const clone = (o) => JSON.parse(JSON.stringify(o))

function loadProfile() {
  try {
    const saved = localStorage.getItem(STORAGE_PROFILE_KEY)
    if (saved) {
      const p = JSON.parse(saved)
      // 保存データに欠けたフィールドはデフォルトで補完
      return {
        nameJa: p.nameJa ?? DEFAULT_PROFILE.nameJa,
        nameReal: p.nameReal ?? DEFAULT_PROFILE.nameReal,
        intro: Array.isArray(p.intro) ? p.intro : clone(DEFAULT_PROFILE.intro),
        creed: p.creed ?? DEFAULT_PROFILE.creed,
        sections: Array.isArray(p.sections) ? p.sections : clone(DEFAULT_PROFILE.sections),
      }
    }
  } catch {}
  return clone(DEFAULT_PROFILE)
}

const showProfile = ref(false)
const profile = reactive(loadProfile())
const profileEdit = ref(false)
const profileDraft = reactive({})

function startProfileEdit() {
  Object.assign(profileDraft, clone(profile))
  profileEdit.value = true
}

function saveProfile() {
  // 空行・空セクションを取り除いてから保存
  const cleaned = clone(profileDraft)
  cleaned.intro = (cleaned.intro || []).filter(s => s.trim())
  cleaned.sections = (cleaned.sections || [])
    .map(sec => ({ label: sec.label, items: (sec.items || []).filter(s => s.trim()) }))
    .filter(sec => sec.label.trim() || sec.items.length)
  Object.assign(profile, cleaned)
  localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(clone(profile)))
  profileEdit.value = false
}

function cancelProfileEdit() {
  profileEdit.value = false
}

function closeProfile() {
  showProfile.value = false
  profileEdit.value = false
}

function addIntroItem() { profileDraft.intro.push('') }
function removeIntroItem(i) { profileDraft.intro.splice(i, 1) }
function addSection() { profileDraft.sections.push({ label: '', items: [''] }) }
function removeSection(si) { profileDraft.sections.splice(si, 1) }
function addSectionItem(si) { profileDraft.sections[si].items.push('') }
function removeSectionItem(si, i) { profileDraft.sections[si].items.splice(i, 1) }

// --- 休憩アナウンス ---
const showBreakInput = ref(false)
const showBreakScreen = ref(false)
const breakTime = ref('')
const STORAGE_BREAK_BGM_URL_KEY = 'piyopiyo_break_bgm_url'
const STORAGE_BREAK_BGM_ENABLED_KEY = 'piyopiyo_break_bgm_enabled'
const breakBgmUrl = ref(localStorage.getItem(STORAGE_BREAK_BGM_URL_KEY) || '')
const savedBreakBgmEnabled = localStorage.getItem(STORAGE_BREAK_BGM_ENABLED_KEY)
const breakBgmEnabled = ref(
  savedBreakBgmEnabled === null ? Boolean(breakBgmUrl.value) : savedBreakBgmEnabled === 'true'
)
const breakBgmError = ref('')
const activeBreakBgmUrl = ref('')

function openBreak() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  breakTime.value = `${h}:${m}`
  breakBgmError.value = ''
  showBreakInput.value = true
}

function startBreak() {
  if (!breakTime.value) return

  const enteredUrl = breakBgmUrl.value.trim()
  const embedUrl = enteredUrl ? toYouTubeEmbedUrl(enteredUrl) : ''

  if (breakBgmEnabled.value && !embedUrl) {
    breakBgmError.value = 'YouTubeの動画または再生リストURLを入力してください'
    return
  }

  if (embedUrl) {
    localStorage.setItem(STORAGE_BREAK_BGM_URL_KEY, enteredUrl)
  } else {
    localStorage.removeItem(STORAGE_BREAK_BGM_URL_KEY)
  }
  localStorage.setItem(STORAGE_BREAK_BGM_ENABLED_KEY, String(breakBgmEnabled.value))
  activeBreakBgmUrl.value = breakBgmEnabled.value ? embedUrl : ''
  showBreakInput.value = false
  showBreakScreen.value = true
}

function closeBreak() {
  showBreakScreen.value = false
  activeBreakBgmUrl.value = ''
}

watch(showBreakScreen, isOpen => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

function startEdit() {
  Object.assign(draft, { ...info })
  editMode.value = true
}

function saveEdit() {
  Object.assign(info, { ...draft })
  localStorage.setItem(STORAGE_INFO_KEY, JSON.stringify({ ...info }))
  editMode.value = false
}

const displayDate = computed(() => {
  if (!info.date) return '日付未設定'
  const d = new Date(info.date + 'T00:00:00')
  const days = ['日', '月', '火', '水', '木', '金', '土']
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const dow = days[d.getDay()]
  return `${y}${m}${day}（${dow}）`
})

const timeLabel = computed(() => {
  const map = { '朝': '🌅 朝', '昼': '☀️ 昼', '夜': '🌙 夜' }
  return map[info.timeOfDay] || info.timeOfDay
})

// --- コーナー順序 ---
function loadOrder() {
  try {
    const saved = localStorage.getItem(STORAGE_ORDER_KEY)
    if (saved) {
      const ids = JSON.parse(saved)
      const map = Object.fromEntries(PIYOPIYO_CORNERS.map(c => [c.id, c]))
      const ordered = ids.map(id => map[id]).filter(Boolean)
      // 新規追加されたコーナーを末尾に
      const existing = new Set(ids)
      PIYOPIYO_CORNERS.forEach(c => { if (!existing.has(c.id)) ordered.push(c) })
      return ordered
    }
  } catch {}
  return [...PIYOPIYO_CORNERS]
}

const orderedCorners = ref(loadOrder())

function saveOrder() {
  localStorage.setItem(STORAGE_ORDER_KEY, JSON.stringify(orderedCorners.value.map(c => c.id)))
}

// --- ドラッグ&ドロップ ---
const draggingIdx = ref(null)
const dragOverIdx = ref(null)

function onDragStart(e, idx) {
  draggingIdx.value = idx
  e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(_e, idx) {
  dragOverIdx.value = idx
}

function onDragLeave() {
  dragOverIdx.value = null
}

function onDrop(_e, idx) {
  const from = draggingIdx.value
  if (from === null || from === idx) return
  const items = [...orderedCorners.value]
  const [moved] = items.splice(from, 1)
  items.splice(idx, 0, moved)
  orderedCorners.value = items
  saveOrder()
}

function onDragEnd() {
  draggingIdx.value = null
  dragOverIdx.value = null
}

function onCardClick(corner) {
  if (draggingIdx.value !== null) return
  emit('selectCorner', corner)
}
</script>

<style scoped>
.home {
  max-width: 640px;
  margin: 0 auto;
  padding: 20px 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100vh;
}

/* ---- ヘッダー共通 ---- */
.home__header {
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 16px;
  padding: 22px 22px 18px;
}

/* ---- 表示モード ---- */
.header-view {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.header-view__event-label {
  font-size: 0.68rem;
  letter-spacing: 0.15em;
  color: #546e7a;
  text-transform: uppercase;
}

.header-view__event-name {
  font-size: 2rem;
  font-weight: 900;
  color: #ffd740;
  margin: 0;
  text-shadow: 0 2px 12px rgba(255,200,0,0.35);
}

.header-view__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 0.85rem;
  color: #78909c;
}

.header-view__staff {
  display: flex;
  gap: 16px;
  font-size: 0.82rem;
  color: #607d8b;
}

.header-view__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.profile-btn {
  padding: 5px 14px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #546e7a;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.profile-btn:hover { border-color: #42a5f5; color: #42a5f5; }

.break-btn {
  padding: 5px 14px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #546e7a;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.break-btn:hover { border-color: #ffb300; color: #ffb300; }

/* ---- 休憩 入力モーダル ---- */
.break-input-modal {
  background: #0d1b2a;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 28px 32px 28px;
  max-width: 440px;
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.break-input-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #ffb300;
}

.break-input-label {
  font-size: 0.8rem;
  color: #546e7a;
  margin-bottom: -8px;
}

.break-time-field {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  color: #eceff1;
  font-size: 2rem;
  font-weight: 700;
  outline: none;
  font-family: inherit;
  text-align: center;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.break-time-field:focus { border-color: #ffb300; }

.break-preview {
  text-align: center;
  font-size: 0.95rem;
  color: #90a4ae;
}

.break-bgm {
  padding: 12px;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 10px;
}

.break-bgm__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cfd8dc;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

.break-bgm__toggle input {
  width: 16px;
  height: 16px;
  accent-color: #ffb300;
}

.break-bgm__fields {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.break-bgm__fields label {
  color: #78909c;
  font-size: 0.72rem;
}

.break-bgm__url {
  width: 100%;
  padding: 9px 10px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #eceff1;
  font-size: 0.8rem;
  outline: none;
  font-family: inherit;
}

.break-bgm__url:focus { border-color: #ffb300; }

.break-bgm__hint {
  color: #546e7a;
  font-size: 0.68rem;
}

.break-bgm__error {
  color: #ef5350;
  font-size: 0.72rem;
}

.break-modal-actions {
  display: flex;
  gap: 10px;
}

.break-start-btn {
  flex: 1;
  padding: 10px;
  background: #e65100;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.break-start-btn:hover:not(:disabled) { background: #f4511e; }
.break-start-btn:disabled { opacity: 0.4; cursor: default; }

/* ---- 休憩 全画面 ---- */
.break-screen {
  position: fixed;
  inset: 0;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.break-screen__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32px;
}

.break-screen__icon {
  font-size: 6rem;
  animation: sway 3s ease-in-out infinite;
}

@keyframes sway {
  0%, 100% { transform: rotate(-8deg); }
  50% { transform: rotate(8deg); }
}

.break-screen__message {
  text-align: center;
  line-height: 1.3;
}

.break-screen__time {
  font-size: 5rem;
  font-weight: 900;
  color: #ffd740;
  text-shadow: 0 4px 32px rgba(255,200,0,0.5);
  letter-spacing: 0.05em;
}

.break-screen__text {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #90a4ae;
  margin-top: 8px;
}

.break-screen__player {
  position: absolute;
  left: 24px;
  bottom: 24px;
  width: min(400px, calc(100vw - 48px));
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 8px;
  background: #000;
  box-shadow: 0 8px 28px rgba(0,0,0,0.45);
}

.break-screen__player iframe {
  width: 100%;
  height: 100%;
  border: none;
  display: block;
}

@media (max-width: 760px), (max-height: 620px) {
  .break-screen__player {
    width: 280px;
  }

  .break-screen__content {
    transform: translateY(-90px);
  }
}

.break-screen__close {
  position: absolute;
  bottom: 32px;
  right: 32px;
  padding: 10px 22px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px;
  color: #546e7a;
  font-size: 0.85rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.break-screen__close:hover { color: #cfd8dc; border-color: rgba(255,255,255,0.4); }

.edit-btn {
  padding: 5px 14px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #546e7a;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.edit-btn:hover { border-color: #ffd740; color: #ffd740; }

/* ---- QMプロフィール モーダル ---- */
.profile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.profile-modal {
  background: #0d1b2a;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px;
  padding: 28px 28px 32px;
  max-width: 480px;
  width: 100%;
  position: relative;
  max-height: 90vh;
  overflow-y: auto;
}

.profile-close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: transparent;
  border: none;
  color: #546e7a;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px 8px;
  font-family: inherit;
  transition: color 0.15s;
}
.profile-close:hover { color: #cfd8dc; }

.profile-header {
  margin-bottom: 20px;
}

.profile-name-ja {
  font-size: 2rem;
  font-weight: 900;
  color: #ffd740;
  text-shadow: 0 2px 12px rgba(255,200,0,0.35);
}

.profile-name-real {
  font-size: 0.85rem;
  color: #607d8b;
  margin-top: 4px;
}

.profile-creed {
  background: rgba(255,215,64,0.06);
  border-left: 3px solid #ffd740;
  border-radius: 0 8px 8px 0;
  padding: 12px 16px;
  font-size: 0.92rem;
  color: #cfd8dc;
  line-height: 1.8;
  margin: 16px 0;
  font-weight: 600;
  white-space: pre-line;
}

.profile-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.profile-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.profile-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #546e7a;
  margin-bottom: 2px;
}

.profile-item {
  font-size: 0.88rem;
  color: #90a4ae;
  line-height: 1.6;
}

/* ---- プロフィール 表示→編集ボタン ---- */
.profile-edit-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.profile-edit-btn {
  padding: 6px 16px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #546e7a;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.profile-edit-btn:hover { border-color: #ffd740; color: #ffd740; }

/* ---- プロフィール 編集フォーム ---- */
.profile-edit {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pe-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
}

.pe-block-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pe-block-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #90a4ae;
  flex: 1;
}

.pe-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pe-item input,
.pe-section-label,
.pe-textarea {
  flex: 1;
  padding: 7px 10px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #eceff1;
  font-size: 0.88rem;
  outline: none;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.pe-item input:focus,
.pe-section-label:focus,
.pe-textarea:focus { border-color: #42a5f5; }

.pe-textarea {
  resize: vertical;
  line-height: 1.6;
}

.pe-section-label {
  font-weight: 700;
}

.pe-add {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid rgba(66,165,245,0.4);
  border-radius: 6px;
  color: #42a5f5;
  font-size: 0.72rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
}
.pe-add:hover { background: rgba(66,165,245,0.12); }

.pe-remove {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #78909c;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.pe-remove:hover { border-color: #ef5350; color: #ef5350; }

.pe-remove-section {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid rgba(239,83,80,0.4);
  border-radius: 6px;
  color: #ef5350;
  font-size: 0.72rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
}
.pe-remove-section:hover { background: rgba(239,83,80,0.12); }

.pe-add-section {
  padding: 8px;
  background: transparent;
  border: 1px dashed rgba(255,255,255,0.2);
  border-radius: 8px;
  color: #78909c;
  font-size: 0.82rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.pe-add-section:hover { border-color: #42a5f5; color: #42a5f5; }

/* ---- 編集モード ---- */
.header-edit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.edit-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #90a4ae;
  margin-bottom: 4px;
}

.edit-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  align-items: center;
  gap: 10px;
}

.edit-row label {
  font-size: 0.78rem;
  color: #546e7a;
  text-align: right;
}

.edit-row input[type="text"],
.edit-row input[type="date"],
.edit-row input:not([type="radio"]) {
  padding: 7px 10px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: #eceff1;
  font-size: 0.9rem;
  outline: none;
  font-family: inherit;
  width: 100%;
  box-sizing: border-box;
  transition: border-color 0.15s;
}
.edit-row input:focus { border-color: #42a5f5; }

.radio-group {
  display: flex;
  gap: 16px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.9rem;
  color: #b0bec5;
  cursor: pointer;
}

.edit-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 4px;
}

.save-btn {
  padding: 8px 22px;
  background: #1565c0;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.save-btn:hover { background: #1976d2; }

.cancel-btn {
  padding: 8px 16px;
  background: transparent;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  color: #546e7a;
  font-size: 0.9rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.cancel-btn:hover { color: #90a4ae; }

/* ---- ツール ---- */
.home__tools-details {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  overflow: hidden;
}

.home__tools-summary {
  padding: 10px 14px;
  font-size: 0.8rem;
  color: #546e7a;
  cursor: pointer;
  user-select: none;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
}

.home__tools-summary::-webkit-details-marker { display: none; }
.home__tools-summary::after { content: '▾'; margin-left: auto; }
details[open] .home__tools-summary::after { content: '▴'; }

.home__tools-summary:hover { color: #78909c; }

.home__tools {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.tool-card {
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  text-decoration: none;
  transition: all 0.15s;
}
.tool-card:last-child { border-bottom: none; }

.tool-card--internal {
  width: 100%;
  font-family: inherit;
  cursor: pointer;
}

.tool-card:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(255,255,255,0.18);
}

.tool-card__icon {
  font-size: 1.4rem;
  text-align: center;
}

.tool-card__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tool-card__title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #b0bec5;
}

.tool-card__sub {
  font-size: 0.72rem;
  color: #37474f;
}

.tool-card__ext {
  font-size: 0.9rem;
  color: #37474f;
}


/* ---- セクションタイトル ---- */
.home__section-title {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #546e7a;
  padding-left: 4px;
}

.drag-hint {
  font-size: 0.7rem;
  color: #37474f;
  text-transform: none;
  letter-spacing: 0;
}

/* ---- コーナーカード ---- */
.home__corners {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.corner-card {
  display: grid;
  grid-template-columns: 24px 36px 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(0,0,0,0.35);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  user-select: none;
}

.corner-card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.2);
}

.corner-card--game {
  border-color: rgba(255,215,64,0.2);
}

.corner-card--dragging {
  opacity: 0.4;
  cursor: grabbing;
}

.corner-card--over {
  border-color: #ffd740;
  background: rgba(255,215,64,0.06);
}

.corner-card__handle {
  color: #37474f;
  font-size: 1.1rem;
  cursor: grab;
  text-align: center;
  line-height: 1;
}

.corner-card__icon {
  font-size: 1.5rem;
  text-align: center;
}

.corner-card__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.corner-card__title {
  font-size: 1rem;
  font-weight: 800;
  line-height: 1.2;
}

.corner-card__sub {
  font-size: 0.75rem;
  color: #546e7a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.corner-card__arrow {
  color: #37474f;
  font-size: 1rem;
}

.corner-card__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.corner-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tag-chip {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 4px;
  letter-spacing: 0.03em;
  line-height: 1.4;
}
</style>
