<template>
  <main class="score-display">
    <header>
      <div>
        <p>LIVE TEAM SCORE</p>
        <h1>{{ displayState.eventTitle }}</h1>
      </div>
      <div class="live-indicator"><span></span> LIVE</div>
    </header>

    <section v-if="displayState.stage === 'round1'" class="round-context">
      <div class="context-head">
        <div>
          <p>CURRENT ROUND</p>
          <h2>1st Round｜回答席</h2>
        </div>
        <strong>完走順 {{ displayState.scoring.round1Placement.join(' / ') }}pt</strong>
      </div>
      <div class="seat-grid">
        <article
          v-for="(team, teamIndex) in displayState.teams"
          :key="team.id"
          class="round1-team"
          :class="{ 'round1-team--finished': team.round1FinishOrder }"
        >
          <span>TEAM {{ teamIndex + 1 }}</span>
          <h3>{{ team.name }}</h3>
          <div v-if="team.round1FinishOrder" class="seat-complete">
            {{ team.round1FinishOrder }}位・{{ round1Points(teamIndex) }}pt
          </div>
          <div class="round1-roster" aria-label="回答席と勝ち抜け状況">
            <div
              v-for="(player, playerIndex) in team.players"
              :key="playerIndex"
              class="audience-player"
              :class="`audience-player--${round1PlayerStatus(team, playerIndex)}`"
            >
              <span aria-hidden="true">{{ round1PlayerMark(team, playerIndex) }}</span>
              <b>{{ player || `メンバー${playerIndex + 1}` }}</b>
              <em>{{ round1PlayerLabel(team, playerIndex) }}</em>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="displayState.stage === 'round2'" class="round-context">
      <div class="context-head">
        <div>
          <p>CURRENT GENRE</p>
          <h2>{{ activeGenre.name }}</h2>
        </div>
        <strong>第{{ currentGenreQuestion }}問 / {{ activeGenre.questionCount }}問・正解 {{ displayState.scoring.round2Correct }}pt</strong>
      </div>
      <div class="seat-grid">
        <article v-for="(team, teamIndex) in displayState.teams" :key="team.id">
          <span>TEAM {{ teamIndex + 1 }}</span>
          <h3>{{ team.name }}</h3>
          <div class="seat-members">
            <b
              v-for="(playerIndex, seatIndex) in activeGenre.representatives[teamIndex]"
              :key="seatIndex"
              :class="{ empty: playerIndex === '' }"
            >
              {{ playerIndex === '' ? `代表${seatIndex + 1} 未選択` : team.players[playerIndex] }}
            </b>
          </div>
        </article>
      </div>
    </section>

    <section v-else-if="displayState.stage === 'round3'" class="round-context round-context--timer">
      <div class="context-head">
        <div>
          <p>CURRENT ROUND</p>
          <h2>3rd Round｜ノンジャンル</h2>
        </div>
        <strong>正解 {{ displayState.scoring.round3Correct }}pt</strong>
      </div>
      <div class="audience-timer">{{ formattedTimer }}</div>
      <p class="all-play">全チーム・全員参加</p>
    </section>

    <section class="score-table" aria-label="総合得点">
      <article
        v-for="(item, rankIndex) in ranking"
        :key="item.team.id"
        :class="{ leader: rankIndex === 0 }"
      >
        <div class="rank">{{ rankIndex + 1 }}</div>
        <div class="team">
          <span>TEAM {{ item.teamIndex + 1 }}</span>
          <h2>{{ item.team.name }}</h2>
          <p>{{ item.team.players.join('　') }}</p>
        </div>
        <div class="round-score"><span>1ST</span><strong>{{ round1Points(item.teamIndex) }}</strong></div>
        <div class="round-score"><span>2ND</span><strong>{{ round2Total(item.teamIndex) }}</strong></div>
        <div class="round-score"><span>3RD</span><strong>{{ round3Total(item.teamIndex) }}</strong></div>
        <div class="total"><strong>{{ item.total }}</strong><span>pt</span></div>
      </article>
    </section>

    <section v-if="displayState.stage === 'prediction' && champion" class="prediction-display">
      <div class="prediction-title">
        <p>WINNER PREDICTION</p>
        <h2>個人決勝 2連単予想！</h2>
        <span>回答方法と締切は司会者の案内に従ってください</span>
      </div>
      <div class="prediction-rules">
        <span>① 1着と2着になる2名を予想</span>
        <span>② 2名の着順まで一致で的中</span>
        <span>③ 決勝は5○3×</span>
      </div>
      <div class="prediction-players">
        <article v-for="(finalist, finalistIndex) in finalEntrants" :key="finalist.key" :class="{ guest: finalist.isGuest }">
          <span>FINALIST {{ String(finalistIndex + 1).padStart(2, '0') }}</span>
          <h3>{{ finalist.name }}</h3>
          <p>{{ finalist.teamName }}<b v-if="finalist.isGuest">追加参戦</b></p>
        </article>
      </div>
    </section>

    <section v-if="displayState.stage === 'final' && champion" class="final-display">
      <div class="final-title">
        <p>CHAMPION TEAM FINAL</p>
        <h2>個人決勝｜5○3×</h2>
      </div>
      <div class="final-players">
        <article
          v-for="(finalist, playerIndex) in finalEntrants"
          :key="finalist.key"
          :class="{
            eliminated: displayState.finalScores[playerIndex].wrong >= 3,
            winner: finalWinnerIndex === playerIndex,
          }"
        >
          <div class="final-player-name">
            <h3>{{ finalist.name }}</h3>
            <small>{{ finalist.teamName }}<b v-if="finalist.isGuest">追加枠</b></small>
          </div>
          <div><span>○</span><strong>{{ displayState.finalScores[playerIndex].correct }}</strong></div>
          <div><span>×</span><strong>{{ displayState.finalScores[playerIndex].wrong }}</strong></div>
        </article>
      </div>
    </section>

    <footer>
      <span>{{ stageLabel }}</span>
      <span>最終更新 {{ updatedTime }}</span>
    </footer>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  SALES_EVENT_STORAGE_KEY,
  SALES_EVENT_SYNC_KEY,
  applyNamesFromUrl,
  getFinalists,
  getRound1PlayerStatus,
  getRound1TeamPoints,
  getRound2Total,
  getRound3Total,
  getTeamTotal,
  loadSalesEventState,
  normalizeSalesEventState,
} from '../utils/salesEvent.js'

const displayState = ref(applyNamesFromUrl(loadSalesEventState()))
let refreshTimer = null

const activeGenre = computed(() => (
  displayState.value.genres[displayState.value.activeGenreIndex] || displayState.value.genres[0]
))
const currentGenreQuestion = computed(() => (
  Math.min(activeGenre.value.questionCount, activeGenre.value.questionsDone + 1)
))
const formattedTimer = computed(() => {
  const minutes = Math.floor(displayState.value.round3RemainingSeconds / 60)
  const seconds = displayState.value.round3RemainingSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
const ranking = computed(() => displayState.value.teams
  .map((team, teamIndex) => ({
    team,
    teamIndex,
    total: getTeamTotal(displayState.value, teamIndex),
  }))
  .sort((a, b) => b.total - a.total || a.teamIndex - b.teamIndex))
const champion = computed(() => displayState.value.teams.find(
  team => team.id === (displayState.value.finalTeamId || displayState.value.championTeamId)
) || null)
const finalEntrants = computed(() => getFinalists(displayState.value))
const finalWinnerIndex = computed(() => {
  const finalistScores = finalEntrants.value.map((_, index) => displayState.value.finalScores[index])
  const reachedFive = finalistScores.findIndex(score => score.correct >= 5)
  if (reachedFive >= 0) return reachedFive
  const active = finalistScores
    .map((score, index) => ({ score, index }))
    .filter(item => item.score.wrong < 3)
  return active.length === 1 && finalistScores.some(score => score.wrong >= 3)
    ? active[0].index
    : -1
})
const stageLabel = computed(() => ({
  setup: 'チーム登録',
  round1: '1st Round｜勝ち抜けリレー',
  round2: '2nd Round｜ジャンル別',
  round3: '3rd Round｜ノンジャンル',
  result: 'チーム戦 最終結果',
  prediction: '個人決勝｜2連単予想',
  final: '5○3× 個人決勝',
})[displayState.value.stage] || '')
const updatedTime = computed(() => {
  const date = new Date(displayState.value.updatedAt)
  return Number.isNaN(date.getTime()) ? '--:--:--' : date.toLocaleTimeString('ja-JP')
})

function round2Total(teamIndex) {
  return getRound2Total(displayState.value, teamIndex)
}

function round1Points(teamIndex) {
  return getRound1TeamPoints(displayState.value, teamIndex)
}

function round3Total(teamIndex) {
  return getRound3Total(displayState.value, teamIndex)
}

function round1PlayerStatus(team, playerIndex) {
  return getRound1PlayerStatus(team, playerIndex)
}

function round1PlayerMark(team, playerIndex) {
  return {
    active: '●',
    cleared: '✓',
    waiting: '−',
  }[round1PlayerStatus(team, playerIndex)]
}

function round1PlayerLabel(team, playerIndex) {
  return {
    active: '回答席',
    cleared: '勝ち抜け',
    waiting: '待機',
  }[round1PlayerStatus(team, playerIndex)]
}

function refreshFromStorage() {
  try {
    const saved = localStorage.getItem(SALES_EVENT_SYNC_KEY) || localStorage.getItem(SALES_EVENT_STORAGE_KEY)
    if (!saved) return
    const nextState = normalizeSalesEventState(JSON.parse(saved))
    const currentUpdatedAt = new Date(displayState.value.updatedAt).getTime() || 0
    const nextUpdatedAt = new Date(nextState.updatedAt).getTime() || 0
    if (nextUpdatedAt <= currentUpdatedAt) return
    // URLは初回表示の名前・設定を補完し、その後は操作画面の最新状態を優先する。
    displayState.value = nextState
  } catch {
    // 表示を止めず、直前に読み込めた得点を保持する。
  }
}

function handleStorage(event) {
  if (event.key === SALES_EVENT_SYNC_KEY || event.key === SALES_EVENT_STORAGE_KEY) refreshFromStorage()
}

onMounted(() => {
  window.addEventListener('storage', handleStorage)
  refreshTimer = window.setInterval(refreshFromStorage, 1500)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorage)
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<style scoped>
.score-display {
  min-height: 100vh;
  padding: clamp(18px, 3vw, 42px);
  color: #f8faf5;
  background:
    radial-gradient(circle at 83% 0%, rgba(247, 209, 84, .18), transparent 32%),
    linear-gradient(145deg, #07130a, #102b17 65%, #08140c);
}

header, footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

header { margin-bottom: clamp(18px, 3vw, 34px); }
header p, .final-title p { margin: 0; color: #f7d154; font-size: .9rem; font-weight: 950; letter-spacing: .2em; }
header h1 { margin: 5px 0 0; font-size: clamp(2rem, 4.4vw, 3.8rem); letter-spacing: -.04em; }
.live-indicator { color: #8ba38f; font-size: .88rem; font-weight: 900; letter-spacing: .14em; }
.live-indicator span { display: inline-block; width: 9px; height: 9px; margin-right: 7px; border-radius: 50%; background: #5bd18b; box-shadow: 0 0 14px #5bd18b; }

.round-context {
  margin-bottom: clamp(14px, 2.2vw, 24px);
  padding: clamp(14px, 2vw, 22px);
  border: 1px solid rgba(247, 209, 84, .38);
  border-radius: 16px;
  background: rgba(247, 209, 84, .075);
}

.context-head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 18px;
  margin-bottom: 14px;
}
.context-head p { margin: 0; color: #f7d154; font-size: .8rem; font-weight: 950; letter-spacing: .18em; }
.context-head h2 { margin: 3px 0 0; font-size: clamp(1.55rem, 3.3vw, 2.5rem); }
.context-head > strong { color: #f7d154; font-size: clamp(1rem, 1.8vw, 1.28rem); }

.seat-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.seat-grid article { min-width: 0; padding: 12px; border: 1px solid rgba(255,255,255,.1); border-radius: 10px; background: rgba(5,16,8,.54); }
.seat-grid article > span { color: #96a49a; font-size: .72rem; font-weight: 900; letter-spacing: .12em; }
.seat-grid h3 { margin: 3px 0 10px; overflow: hidden; font-size: 1rem; text-overflow: ellipsis; white-space: nowrap; }
.seat-members { display: grid; gap: 5px; }
.seat-members b, .seat-complete {
  display: block;
  min-width: 0;
  padding: 8px 9px;
  overflow: hidden;
  border-radius: 7px;
  color: #daf5e3;
  background: rgba(42,127,75,.32);
  font-size: clamp(.78rem, 1.45vw, 1rem);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.seat-members b.empty { color: #78857c; background: rgba(255,255,255,.045); }
.seat-complete { color: #f7d154; background: rgba(247,209,84,.12); }
.round1-team--finished { border-color: rgba(247,209,84,.35) !important; }
.round1-roster { display: grid; gap: 4px; }
.audience-player {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  align-items: center;
  gap: 5px;
  min-width: 0;
  min-height: 34px;
  padding: 5px 6px;
  border: 1px solid transparent;
  border-radius: 6px;
}
.audience-player > span { font-size: .82rem; font-weight: 950; text-align: center; }
.audience-player b {
  min-width: 0;
  overflow: hidden;
  font-size: clamp(.78rem, 1.15vw, .95rem);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.audience-player em { font-size: clamp(.68rem, .9vw, .8rem); font-style: normal; font-weight: 900; }
.audience-player--active {
  border-color: rgba(91,209,139,.58);
  color: #eefff4;
  background: rgba(42,127,75,.38);
  box-shadow: inset 2px 0 #5bd18b;
}
.audience-player--active > span, .audience-player--active em { color: #6ee49b; }
.audience-player--cleared { color: #8cb399; background: rgba(42,127,75,.1); }
.audience-player--cleared > span, .audience-player--cleared em { color: #5bd18b; }
.audience-player--cleared b { text-decoration: line-through; text-decoration-thickness: 1px; }
.audience-player--waiting { color: #5f6c63; background: rgba(255,255,255,.025); opacity: .62; }

.round-context--timer { text-align: center; }
.round-context--timer .context-head { text-align: left; }
.audience-timer { color: #f7d154; font-size: clamp(3.2rem, 9vw, 6.8rem); font-weight: 950; letter-spacing: -.06em; line-height: .95; font-variant-numeric: tabular-nums; }
.all-play { margin: 8px 0 0; color: #9da9a0; font-weight: 800; letter-spacing: .08em; }

.score-table { display: grid; gap: clamp(7px, 1.2vw, 13px); }
.score-table > article {
  display: grid;
  grid-template-columns: 64px minmax(260px, 1fr) repeat(3, 100px) 150px;
  align-items: center;
  gap: 12px;
  min-height: 116px;
  padding: 15px 22px;
  border: 1px solid rgba(255,255,255,.11);
  border-radius: 16px;
  background: rgba(5, 16, 8, .74);
}
.score-table > article.leader { border-color: rgba(247,209,84,.65); box-shadow: inset 5px 0 #f7d154; }
.rank { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 50%; color: #142016; background: #f7d154; font-size: 1.5rem; font-weight: 950; }
.team span, .round-score span { color: #96a49a; font-size: .78rem; font-weight: 900; letter-spacing: .13em; }
.team h2 { margin: 3px 0; font-size: clamp(1.4rem, 2.8vw, 2.2rem); }
.team p { margin: 0; overflow: hidden; color: #8e9a92; font-size: .82rem; text-overflow: ellipsis; white-space: nowrap; }
.round-score { text-align: center; }
.round-score span, .round-score strong { display: block; }
.round-score strong { margin-top: 3px; font-size: 1.65rem; }
.total { text-align: right; color: #f7d154; }
.total strong { font-size: clamp(2.8rem, 6vw, 4.6rem); line-height: .9; }
.total span { margin-left: 5px; font-weight: 900; }

.prediction-display { margin-top: 28px; padding: 24px; border: 1px solid rgba(247,209,84,.35); border-radius: 18px; background: rgba(247,209,84,.065); text-align: center; }
.prediction-title p { margin: 0; color: #f7d154; font-size: .82rem; font-weight: 950; letter-spacing: .18em; }
.prediction-title h2 { margin: 4px 0; font-size: clamp(1.6rem, 4vw, 3rem); }
.prediction-title > span { color: #b4beb6; font-size: .95rem; font-weight: 800; }
.prediction-rules { display: flex; margin: 16px 0; justify-content: center; flex-wrap: wrap; gap: 7px; }
.prediction-rules span { padding: 9px 12px; border-radius: 999px; color: #e8ede9; background: rgba(255,255,255,.075); font-size: .86rem; font-weight: 800; }
.prediction-players { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
.prediction-players article { min-width: 0; padding: 15px 10px; border: 1px solid rgba(255,255,255,.12); border-radius: 11px; background: rgba(5,16,8,.72); }
.prediction-players article.guest { border-color: rgba(91,209,139,.7); box-shadow: inset 0 3px #5bd18b; }
.prediction-players article > span { color: #96a49a; font-size: .7rem; font-weight: 950; letter-spacing: .12em; }
.prediction-players h3 { margin: 6px 0; overflow: hidden; font-size: clamp(1rem, 1.6vw, 1.25rem); text-overflow: ellipsis; white-space: nowrap; }
.prediction-players p { margin: 0; color: #9ba89f; font-size: .78rem; }
.prediction-players p b { margin-left: 5px; color: #6ee49b; }

.final-display { margin-top: 28px; padding-top: 22px; border-top: 1px solid rgba(255,255,255,.12); }
.final-title { display: flex; justify-content: space-between; align-items: baseline; }
.final-title h2 { margin: 0; }
.final-players { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 9px; margin-top: 14px; }
.final-players article { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px; padding: 13px; border: 1px solid rgba(255,255,255,.11); border-radius: 12px; background: rgba(5,16,8,.74); }
.final-players article.eliminated { opacity: .35; }
.final-players article.winner { border-color: #f7d154; box-shadow: 0 0 24px rgba(247,209,84,.18); }
.final-player-name { min-width: 0; text-align: left !important; }
.final-players h3 { min-width: 0; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.final-player-name small { display: block; margin-top: 3px; color: #9ba89f; font-size: .75rem; }
.final-player-name small b { margin-left: 5px; color: #6ee49b; }
.final-players div { text-align: center; }
.final-players div span, .final-players div strong { display: block; }
.final-players div span { color: #9aa79e; font-size: .82rem; }
.final-players div strong { font-size: 1.7rem; }
.final-players div:nth-child(2) strong { color: #5bd18b; }
.final-players div:nth-child(3) strong { color: #ff756e; }

footer { margin-top: 26px; color: #929f96; font-size: .82rem; }

@media (max-width: 900px) {
  .seat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .score-table > article { grid-template-columns: 48px minmax(150px, 1fr) repeat(3, 54px) 90px; min-height: 96px; padding: 11px; gap: 6px; }
  .rank { width: 38px; height: 38px; }
  .round-score strong { font-size: 1.15rem; }
  .team p { display: none; }
  .final-players { grid-template-columns: 1fr; }
}

@media (max-width: 620px) {
  .score-display { padding: 12px 8px; }
  header { align-items: end; }
  .context-head { display: block; }
  .context-head > strong { display: block; margin-top: 7px; }
  .seat-grid { grid-template-columns: 1fr; }
  .seat-grid article { display: grid; grid-template-columns: 1fr 2fr; align-items: center; }
  .seat-grid article > span, .seat-grid h3 { grid-column: 1; }
  .seat-grid h3 { margin-bottom: 0; }
  .seat-members, .seat-complete { grid-column: 2; grid-row: 1 / 3; }
  .round1-team { display: block !important; }
  .round1-team h3 { margin-bottom: 7px; }
  .round1-team .seat-complete { margin-bottom: 6px; }
  .round1-roster { grid-column: auto; grid-row: auto; }
  .score-table > article { grid-template-columns: 38px 1fr 72px; min-height: 88px; }
  .rank { width: 32px; height: 32px; font-size: 1rem; }
  .round-score { display: none; }
  .total strong { font-size: 2.4rem; }
  .team h2 { font-size: 1.15rem; }
  .final-title { display: block; }
  .final-title h2 { margin-top: 5px; }
}
</style>
