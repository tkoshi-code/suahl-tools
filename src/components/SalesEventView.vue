<template>
  <main class="sales-event">
    <header class="event-header">
      <button class="back-button" type="button" @click="emit('back')">← ホーム</button>
      <div>
        <p class="eyebrow">TEAM QUIZ EVENT</p>
        <h1>{{ state.eventTitle }}</h1>
        <p class="subtitle">5名 × 5チーム｜3ラウンド＋優勝者予想＋個人決勝</p>
      </div>
      <button class="display-button" type="button" @click="openScoreDisplay">会場表示を開く ↗</button>
    </header>

    <p v-if="message" class="message" :class="{ 'message--error': messageIsError }" role="status">
      {{ message }}
    </p>

    <nav class="stage-nav" aria-label="イベント進行">
      <button
        v-for="item in stages"
        :key="item.id"
        type="button"
        :class="{ active: state.stage === item.id }"
        :disabled="['prediction', 'final'].includes(item.id) && !state.finalTeamId"
        @click="setStage(item.id)"
      >
        <span>{{ item.step }}</span>{{ item.label }}
      </button>
    </nav>

    <section v-if="state.stage === 'setup'" class="panel setup-panel">
      <div class="section-heading">
        <div>
          <p class="section-kicker">PREPARATION</p>
          <h2>チーム・参加者登録</h2>
        </div>
        <p>名前は端末内だけに保存され、会場表示URLにも引き継がれます。</p>
      </div>

      <label class="event-title-field">
        <span>イベント名</span>
        <input v-model.trim="state.eventTitle" maxlength="60" />
      </label>

      <div class="team-setup-grid">
        <article v-for="(team, teamIndex) in state.teams" :key="team.id" class="team-setup-card">
          <label class="team-name-field">
            <span>TEAM {{ teamIndex + 1 }}</span>
            <input v-model.trim="team.name" maxlength="24" :aria-label="`チーム${teamIndex + 1}の名前`" />
          </label>
          <label v-for="(_, playerIndex) in team.players" :key="playerIndex" class="player-name-field">
            <span>{{ playerIndex + 1 }}</span>
            <input
              v-model.trim="team.players[playerIndex]"
              maxlength="24"
              :aria-label="`${team.name} メンバー${playerIndex + 1}の名前`"
            />
          </label>
        </article>
      </div>

      <div class="event-settings-grid">
        <article class="settings-card">
          <div class="settings-card__head">
            <div>
              <p class="section-kicker">GENRES</p>
              <h3>ジャンルと問題数</h3>
            </div>
            <p>2nd Roundで使う5ジャンル</p>
          </div>
          <div class="genre-settings">
            <label v-for="(genre, genreIndex) in state.genres" :key="genreIndex">
              <span>{{ genreIndex + 1 }}</span>
              <input
                v-model.trim="genre.name"
                maxlength="24"
                :aria-label="`ジャンル${genreIndex + 1}の名前`"
              />
              <input
                v-model.number="genre.questionCount"
                type="number"
                min="1"
                max="100"
                :aria-label="`${genre.name || `ジャンル${genreIndex + 1}`}の問題数`"
                @change="normalizeSettings"
              />
              <small>問</small>
            </label>
          </div>
        </article>

        <article class="settings-card">
          <div class="settings-card__head">
            <div>
              <p class="section-kicker">SCORING</p>
              <h3>得点配点</h3>
            </div>
            <p>変更後は総合得点を自動再計算</p>
          </div>
          <div class="placement-settings">
            <span>1st 完走順位</span>
            <label v-for="(_, index) in state.scoring.round1Placement" :key="index">
              <small>{{ index + 1 }}位</small>
              <input
                v-model.number="state.scoring.round1Placement[index]"
                type="number"
                min="0"
                max="999"
                :aria-label="`1st Round ${index + 1}位の得点`"
                @change="normalizeSettings"
              />
              <small>pt</small>
            </label>
          </div>
          <div class="correct-score-settings">
            <label>
              <span>2nd 正解1問</span>
              <input
                v-model.number="state.scoring.round2Correct"
                type="number"
                min="0"
                max="999"
                aria-label="2nd Round 正解1問の得点"
                @change="normalizeSettings"
              />
              <small>pt</small>
            </label>
            <label>
              <span>3rd 正解1問</span>
              <input
                v-model.number="state.scoring.round3Correct"
                type="number"
                min="0"
                max="999"
                aria-label="3rd Round 正解1問の得点"
                @change="normalizeSettings"
              />
              <small>pt</small>
            </label>
          </div>
        </article>
      </div>

      <div class="display-link-panel">
        <div>
          <span>会場表示リンク</span>
          <p>チーム名・25名・ジャンル・配点をURLパラメータへ出力します。</p>
        </div>
        <input :value="scoreDisplayUrl" readonly aria-label="会場表示URL" @focus="$event.target.select()" />
        <button class="secondary-button" type="button" @click="copyScoreUrl">URLをコピー</button>
        <button class="display-button" type="button" @click="openScoreDisplay">画面を起動 ↗</button>
      </div>

      <div class="setup-actions">
        <button class="primary-button" type="button" @click="startRound1">登録して1st Roundへ →</button>
      </div>
      <details class="url-guide">
        <summary>URLでの名前連携について</summary>
        <p>
          会場表示URLの <code>#</code> 以降には <code>t1</code>（チーム名）、
          <code>p1_1</code>（チーム1・1人目）から <code>p5_5</code> までの名前が入ります。
          URLを開くと、保存データがない端末でも名前を表示できます。
        </p>
      </details>
    </section>

    <section v-else-if="state.stage === 'round1'" class="round-layout">
      <div class="round-main">
        <div class="section-heading panel">
          <div>
            <p class="section-kicker">1ST ROUND</p>
            <h2>2名同時・勝ち抜けリレー</h2>
          </div>
          <p>正解した人は勝ち抜け。自動で次のメンバーに交代し、全員の完走順で5〜1pt。</p>
        </div>

        <div class="relay-grid">
          <article
            v-for="(team, teamIndex) in state.teams"
            :key="team.id"
            class="relay-card"
            :class="{ finished: team.round1FinishOrder }"
          >
            <div class="relay-card__head">
              <div>
                <span class="team-number">TEAM {{ teamIndex + 1 }}</span>
                <h3>{{ team.name }}</h3>
              </div>
              <div v-if="team.round1FinishOrder" class="finish-badge">
                {{ team.round1FinishOrder }}位 <strong>+{{ round1Points(teamIndex) }}pt</strong>
              </div>
              <div v-else class="progress-badge">{{ clearedCount(team) }} / 5</div>
            </div>

            <p class="active-label">{{ team.round1FinishOrder ? '全員勝ち抜け！' : '5名の勝ち抜け状況' }}</p>
            <div class="relay-roster" aria-label="回答席と勝ち抜け状況">
              <div
                v-for="(player, playerIndex) in team.players"
                :key="playerIndex"
                class="relay-player"
                :class="`relay-player--${round1PlayerStatus(team, playerIndex)}`"
              >
                <span class="relay-player__order">{{ playerIndex + 1 }}</span>
                <span class="relay-player__mark" aria-hidden="true">{{ round1PlayerMark(team, playerIndex) }}</span>
                <strong>{{ player || `メンバー${playerIndex + 1}` }}</strong>
                <button
                  v-if="round1PlayerStatus(team, playerIndex) === 'active'"
                  type="button"
                  class="correct-player-button"
                  @click="markRound1Correct(teamIndex, playerIndex)"
                >
                  回答席・正解で交代
                </button>
                <span v-else class="relay-player__status">{{ round1PlayerLabel(team, playerIndex) }}</span>
              </div>
            </div>
          </article>
        </div>

        <div class="round-actions panel">
          <button class="secondary-button" type="button" :disabled="!state.round1History.length" @click="undoRound1">
            直前の正解を取り消す
          </button>
          <button class="primary-button" type="button" @click="setStage('round2')">2nd Roundへ →</button>
        </div>
      </div>
      <ScoreRail :state="state" />
    </section>

    <section v-else-if="state.stage === 'round2'" class="round-layout">
      <div class="round-main">
        <div class="section-heading panel">
          <div>
            <p class="section-kicker">2ND ROUND</p>
            <h2>ジャンル別クイズ</h2>
          </div>
          <p>ジャンルごとに設定した問題数を実施。各チームの代表2名を選び、正解チームを1つ記録します。</p>
        </div>

        <div class="genre-tabs" role="tablist" aria-label="ジャンル">
          <button
            v-for="(genre, genreIndex) in state.genres"
            :key="genreIndex"
            type="button"
            :class="{ active: activeGenreIndex === genreIndex, complete: genre.questionsDone >= genre.questionCount }"
            @click="activeGenreIndex = genreIndex"
          >
            {{ genre.name || `ジャンル${genreIndex + 1}` }}
            <small>{{ genre.questionsDone }}/{{ genre.questionCount }}</small>
          </button>
        </div>

        <article class="genre-panel panel">
          <div class="genre-title-row">
            <label>
              <span>ジャンル名</span>
              <input v-model.trim="activeGenre.name" maxlength="24" />
            </label>
            <div class="question-counter">
              <span>QUESTION</span>
              <strong>{{ Math.min(activeGenre.questionCount, activeGenre.questionsDone + 1) }}</strong>
              <small>/ {{ activeGenre.questionCount }}</small>
            </div>
          </div>

          <div class="representatives-grid">
            <div v-for="(team, teamIndex) in state.teams" :key="team.id" class="representative-card">
              <h3>{{ team.name }}</h3>
              <div class="representative-selects">
                <select
                  v-model="activeGenre.representatives[teamIndex][0]"
                  :class="{ 'has-selection': activeGenre.representatives[teamIndex][0] !== '' }"
                  :aria-label="`${team.name}の代表者1`"
                >
                  <option value="">代表者1</option>
                  <option v-for="(player, playerIndex) in team.players" :key="playerIndex" :value="playerIndex">
                    {{ player || `メンバー${playerIndex + 1}` }}
                  </option>
                </select>
                <select
                  v-model="activeGenre.representatives[teamIndex][1]"
                  :class="{ 'has-selection': activeGenre.representatives[teamIndex][1] !== '' }"
                  :aria-label="`${team.name}の代表者2`"
                >
                  <option value="">代表者2</option>
                  <option v-for="(player, playerIndex) in team.players" :key="playerIndex" :value="playerIndex">
                    {{ player || `メンバー${playerIndex + 1}` }}
                  </option>
                </select>
              </div>
              <button
                type="button"
                class="genre-correct-button"
                :disabled="activeGenre.questionsDone >= activeGenre.questionCount"
                @click="recordGenreAnswer(teamIndex)"
              >
                正解 +{{ state.scoring.round2Correct }}pt
                <strong>{{ activeGenre.scores[teamIndex] }}問 / {{ activeGenre.scores[teamIndex] * state.scoring.round2Correct }}pt</strong>
              </button>
            </div>
          </div>

          <div class="genre-actions">
            <button
              class="secondary-button"
              type="button"
              :disabled="activeGenre.questionsDone >= activeGenre.questionCount"
              @click="recordGenreAnswer(null)"
            >
              スルー（得点なし）
            </button>
            <button
              class="secondary-button"
              type="button"
              :disabled="!activeGenre.history.length"
              @click="undoGenreAnswer"
            >
              このジャンルの直前を取消
            </button>
          </div>
        </article>

        <div class="round-actions panel">
          <span>全ジャンル進行：{{ totalGenreQuestions }} / {{ totalGenreQuestionTarget }}問</span>
          <button class="primary-button" type="button" @click="prepareRound3">3rd Roundへ →</button>
        </div>
      </div>
      <ScoreRail :state="state" />
    </section>

    <section v-else-if="state.stage === 'round3'" class="round-layout">
      <div class="round-main">
        <div class="section-heading panel">
          <div>
            <p class="section-kicker">3RD ROUND</p>
            <h2>ノンジャンル・タイムレース</h2>
          </div>
          <p>時間いっぱいまで出題。正解したチームへ1ptずつ加点します。</p>
        </div>

        <article class="timer-panel panel">
          <div class="timer-settings">
            <label>
              <span>制限時間（分）</span>
              <input
                v-model.number="state.round3DurationMinutes"
                type="number"
                min="1"
                max="120"
                :disabled="timerRunning"
                @change="applyTimerDuration"
              />
            </label>
          </div>
          <div class="timer" :class="{ urgent: state.round3RemainingSeconds <= 60 }">
            {{ formattedTime }}
          </div>
          <div class="timer-actions">
            <button class="primary-button" type="button" @click="toggleTimer">
              {{ timerRunning ? '一時停止' : state.round3RemainingSeconds ? 'スタート' : '終了' }}
            </button>
            <button class="secondary-button" type="button" @click="resetTimer">時間をリセット</button>
          </div>
        </article>

        <div class="round3-grid">
          <article v-for="(team, teamIndex) in state.teams" :key="team.id" class="round3-team-card">
            <span>TEAM {{ teamIndex + 1 }}</span>
            <h3>{{ team.name }}</h3>
            <strong>{{ round3Points(teamIndex) }}<small>pt</small></strong>
            <p>{{ state.round3Scores[teamIndex] }}問正解 × {{ state.scoring.round3Correct }}pt</p>
            <div>
              <button type="button" @click="changeRound3Score(teamIndex, -1)" :disabled="state.round3Scores[teamIndex] <= 0">−</button>
              <button type="button" class="plus" @click="changeRound3Score(teamIndex, 1)">正解 +{{ state.scoring.round3Correct }}pt</button>
            </div>
          </article>
        </div>

        <div class="round-actions panel">
          <span>同点の場合はサドンデスの正解を3rdへ加点してください。</span>
          <button class="primary-button" type="button" @click="finishTeamRounds">最終結果へ →</button>
        </div>
      </div>
      <ScoreRail :state="state" />
    </section>

    <section v-else-if="state.stage === 'result'" class="result-panel panel">
      <p class="section-kicker">TEAM RESULT</p>
      <h2>チーム戦 最終結果</h2>

      <div class="podium-list">
        <article v-for="(item, index) in ranking" :key="item.team.id" :class="{ winner: index === 0 }">
          <div class="rank">{{ index + 1 }}</div>
          <div class="result-team">
            <span>TEAM {{ item.teamIndex + 1 }}</span>
            <h3>{{ item.team.name }}</h3>
          </div>
          <div class="result-breakdown">
            <span>1st {{ round1Points(item.teamIndex) }}</span>
            <span>2nd {{ round2Total(item.teamIndex) }}</span>
            <span>3rd {{ round3Points(item.teamIndex) }}</span>
          </div>
          <strong>{{ item.total }}<small>pt</small></strong>
        </article>
      </div>

      <div class="champion-choice">
        <label>
          <span>{{ topTeamIds.length > 1 ? '同点です。優勝チームを選択' : '優勝チーム' }}</span>
          <select v-model="state.championTeamId" :class="{ 'has-selection': Boolean(state.championTeamId) }">
            <option value="">選択してください</option>
            <option
              v-for="item in ranking"
              :key="item.team.id"
              :value="item.team.id"
            >
              {{ item.team.name }}（{{ item.total }}pt）
            </option>
          </select>
        </label>
        <button class="primary-button" type="button" :disabled="!selectedChampion" @click="openPrediction">
          2連単予想へ →
        </button>
      </div>
    </section>

    <section v-else-if="state.stage === 'prediction'" class="prediction-panel panel">
      <p class="section-kicker">WINNER PREDICTION</p>
      <h2>個人決勝 2連単予想</h2>
      <p class="prediction-lead">個人決勝の開始前に、1着と2着になる2名を着順通りに予想します。</p>

      <ol class="prediction-rules">
        <li><strong>1</strong><span>下の進出者一覧から、1着（優勝）と2着（準優勝）になる2名を選びます。</span></li>
        <li><strong>2</strong><span>2名の着順まで一致すると的中です。回答方法と締切は司会者の案内に従ってください。</span></li>
        <li><strong>3</strong><span>予想を締め切ったら、5○3×の個人決勝を開始します。</span></li>
      </ol>

      <div class="prediction-heading">
        <div>
          <span>FINALISTS</span>
          <h3>進出者一覧</h3>
        </div>
        <strong>{{ finalEntrants.length }}名</strong>
      </div>
      <div class="prediction-roster">
        <article v-for="(finalist, finalistIndex) in finalEntrants" :key="finalist.key" :class="{ guest: finalist.isGuest }">
          <span>{{ String(finalistIndex + 1).padStart(2, '0') }}</span>
          <h3>{{ finalist.name }}</h3>
          <p>{{ finalist.teamName }}<b v-if="finalist.isGuest">追加参戦</b></p>
        </article>
      </div>

      <div class="guest-selector">
        <div>
          <span>OPTIONAL ENTRY</span>
          <h3>他チームから1名を追加参戦</h3>
          <p>追加しない場合は「追加参戦なし」のままで進めます。</p>
        </div>
        <label>
          <span>追加するプレイヤー</span>
          <select v-model="guestSelectionValue">
            <option value="">追加参戦なし（5名で実施）</option>
            <option v-for="candidate in guestCandidates" :key="candidate.value" :value="candidate.value">
              {{ candidate.teamName }}｜{{ candidate.playerName }}
            </option>
          </select>
        </label>
      </div>

      <div class="prediction-actions">
        <button class="primary-button" type="button" @click="startFinal">
          予想を締め切って個人決勝へ →
        </button>
      </div>
    </section>

    <section v-else-if="state.stage === 'final'" class="final-panel panel">
      <p class="section-kicker">CHAMPION FINAL</p>
      <h2>{{ selectedChampion?.name }} 個人決勝</h2>
      <p class="final-rule">5問正解で優勝・3問誤答で失格。最後の1人になった場合も優勝です。</p>

      <div v-if="finalWinner" class="final-winner">
        <span>WINNER</span>
        <strong>{{ finalWinner.name }}</strong>
      </div>

      <div class="finalists">
        <article
          v-for="(finalist, playerIndex) in finalEntrants"
          :key="finalist.key"
          :class="{
            eliminated: state.finalScores[playerIndex].wrong >= 3,
            crowned: finalWinner?.playerIndex === playerIndex,
          }"
        >
          <span class="finalist-number">{{ playerIndex + 1 }}</span>
          <h3>{{ finalist.name }}</h3>
          <small class="finalist-team">{{ finalist.teamName }}<b v-if="finalist.isGuest">追加枠</b></small>
          <div class="maru-batsu">
            <div>
              <span>○</span>
              <strong>{{ state.finalScores[playerIndex].correct }}</strong>
              <small>/ 5</small>
            </div>
            <div>
              <span>×</span>
              <strong>{{ state.finalScores[playerIndex].wrong }}</strong>
              <small>/ 3</small>
            </div>
          </div>
          <div class="finalist-actions">
            <button
              type="button"
              class="correct"
              :disabled="isFinalistLocked(playerIndex)"
              @click="changeFinalScore(playerIndex, 'correct', 1)"
            >○ 正解</button>
            <button
              type="button"
              class="wrong"
              :disabled="isFinalistLocked(playerIndex)"
              @click="changeFinalScore(playerIndex, 'wrong', 1)"
            >× 誤答</button>
          </div>
          <div class="finalist-undo">
            <button
              type="button"
              :disabled="state.finalScores[playerIndex].correct <= 0"
              @click="changeFinalScore(playerIndex, 'correct', -1)"
            >○を取消</button>
            <button
              type="button"
              :disabled="state.finalScores[playerIndex].wrong <= 0"
              @click="changeFinalScore(playerIndex, 'wrong', -1)"
            >×を取消</button>
          </div>
        </article>
      </div>
    </section>

    <footer class="event-footer">
      <div class="backup-actions">
        <button type="button" @click="exportBackup">JSONバックアップ</button>
        <label>
          JSONから復元
          <input type="file" accept="application/json,.json" @change="restoreBackup" />
        </label>
        <button type="button" class="danger-button" @click="resetAll">全データを初期化</button>
      </div>
      <details>
        <summary>使い方ガイド</summary>
        <ol>
          <li>準備で5チーム・各5名、5ジャンルと問題数、各ラウンドの配点を登録し、「画面を起動」で会場表示を用意します。</li>
          <li>1stは各チーム5名の一覧で「回答席」「勝ち抜け」「待機」を確認し、回答席の正解者を押します。次の人へ自動交代します。</li>
          <li>2ndはジャンル名と代表2名を選びます。選択済みの代表者は緑枠で表示され、設定した問題数まで正解チームまたはスルーを記録します。</li>
          <li>3rdはタイマーを開始し、正解チームへ加点します。同点時はサドンデス分もここへ加点します。</li>
          <li>優勝チームを確定後、進出者と「1着・2着を順番通りに当てる2連単」の説明を表示します。必要なら他チームから1名を追加し、予想を締め切って5○3×を始めます。</li>
          <li>会場表示には現在のジャンル・問題数・回答席メンバー・配点・総合得点が自動反映されます。</li>
        </ol>
      </details>
    </footer>
  </main>
</template>

<script setup>
import { computed, defineComponent, h, onBeforeUnmount, reactive, ref, watch } from 'vue'
import {
  SALES_EVENT_APP_ID,
  SALES_EVENT_STORAGE_KEY,
  SALES_EVENT_SYNC_KEY,
  buildSalesScoreUrl,
  createSalesEventState,
  getFinalists,
  getRound1ActivePlayerIndices,
  getRound1PlayerStatus,
  getRound1TeamPoints,
  getRound2CorrectCount,
  getRound2Total,
  getRound3Total,
  getTeamTotal,
  loadSalesEventState,
  normalizeSalesEventState,
} from '../utils/salesEvent.js'

const emit = defineEmits(['back'])
const state = reactive(loadSalesEventState())
const timerRunning = ref(false)
const message = ref('')
const messageIsError = ref(false)
let timerId = null
let messageTimer = null

const stages = [
  { id: 'setup', step: '00', label: '準備' },
  { id: 'round1', step: '01', label: '1st' },
  { id: 'round2', step: '02', label: '2nd' },
  { id: 'round3', step: '03', label: '3rd' },
  { id: 'result', step: '04', label: '結果' },
  { id: 'prediction', step: '05', label: '2連単予想' },
  { id: 'final', step: '06', label: '個人決勝' },
]

const activeGenreIndex = computed({
  get: () => state.activeGenreIndex,
  set: value => {
    state.activeGenreIndex = Math.max(0, Math.min(4, Number(value) || 0))
  },
})
const activeGenre = computed(() => state.genres[state.activeGenreIndex])
const totalGenreQuestions = computed(() => state.genres.reduce((sum, genre) => sum + genre.questionsDone, 0))
const totalGenreQuestionTarget = computed(() => state.genres.reduce((sum, genre) => sum + genre.questionCount, 0))
const scoreDisplayUrl = computed(() => buildSalesScoreUrl(state, import.meta.env.BASE_URL))
const formattedTime = computed(() => {
  const minutes = Math.floor(state.round3RemainingSeconds / 60)
  const seconds = state.round3RemainingSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
const ranking = computed(() => state.teams
  .map((team, teamIndex) => ({ team, teamIndex, total: getTeamTotal(state, teamIndex) }))
  .sort((a, b) => b.total - a.total || a.teamIndex - b.teamIndex))
const topTeamIds = computed(() => {
  const topScore = ranking.value[0]?.total
  return ranking.value.filter(item => item.total === topScore).map(item => item.team.id)
})
const selectedChampion = computed(() => state.teams.find(team => team.id === state.championTeamId) || null)
const finalEntrants = computed(() => getFinalists(state))
const guestCandidates = computed(() => state.teams
  .filter(team => team.id !== state.finalTeamId)
  .flatMap(team => team.players.map((playerName, playerIndex) => ({
    value: `${team.id}:${playerIndex}`,
    teamName: team.name,
    playerName: playerName || `メンバー${playerIndex + 1}`,
  }))))
const guestSelectionValue = computed({
  get: () => {
    const { teamId, playerIndex } = state.finalGuest
    return teamId && Number.isInteger(playerIndex) ? `${teamId}:${playerIndex}` : ''
  },
  set: value => {
    const [teamId, rawPlayerIndex] = String(value).split(':')
    const playerIndex = Number(rawPlayerIndex)
    const isValid = guestCandidates.value.some(candidate => candidate.value === value)
    state.finalGuest = isValid
      ? { teamId, playerIndex }
      : { teamId: '', playerIndex: '' }
    state.finalScores[5] = { correct: 0, wrong: 0 }
  },
})
const finalWinner = computed(() => {
  if (!finalEntrants.value.length) return null
  const finalistScores = finalEntrants.value.map((_, playerIndex) => state.finalScores[playerIndex])
  const reachedFive = finalistScores.findIndex(score => score.correct >= 5)
  if (reachedFive >= 0) {
    return { playerIndex: reachedFive, name: finalEntrants.value[reachedFive].name }
  }
  const active = finalistScores
    .map((score, playerIndex) => ({ score, playerIndex }))
    .filter(item => item.score.wrong < 3)
  if (active.length === 1 && finalistScores.some(score => score.wrong >= 3)) {
    const playerIndex = active[0].playerIndex
    return { playerIndex, name: finalEntrants.value[playerIndex].name }
  }
  return null
})

const ScoreRail = defineComponent({
  name: 'ScoreRail',
  props: {
    state: { type: Object, required: true },
  },
  setup(props) {
    const sorted = computed(() => props.state.teams
      .map((team, teamIndex) => ({
        team,
        teamIndex,
        round1: getRound1TeamPoints(props.state, teamIndex),
        round2Correct: getRound2CorrectCount(props.state, teamIndex),
        round2: getRound2Total(props.state, teamIndex),
        round3: getRound3Total(props.state, teamIndex),
        total: getTeamTotal(props.state, teamIndex),
      }))
      .sort((a, b) => b.total - a.total || a.teamIndex - b.teamIndex))
    return () => h('aside', { class: 'score-rail panel' }, [
      h('div', { class: 'score-rail__title' }, 'LIVE SCORE'),
      ...sorted.value.map((item, index) => h('div', { class: 'score-rail__team', key: item.team.id }, [
        h('span', { class: 'score-rail__rank' }, String(index + 1)),
        h('div', [
          h('strong', item.team.name),
          h('small', `1st ${item.round1} ｜ 2nd ${item.round2}（${item.round2Correct}問）｜ 3rd ${item.round3}（${props.state.round3Scores[item.teamIndex]}問）`),
        ]),
        h('b', [String(item.total), h('small', 'pt')]),
      ])),
    ])
  },
})

function showMessage(text, isError = false) {
  message.value = text
  messageIsError.value = isError
  if (messageTimer) window.clearTimeout(messageTimer)
  messageTimer = window.setTimeout(() => {
    message.value = ''
  }, 5000)
}

function persistState() {
  try {
    const serialized = JSON.stringify({
      ...JSON.parse(JSON.stringify(state)),
      updatedAt: new Date().toISOString(),
    })
    localStorage.setItem(SALES_EVENT_STORAGE_KEY, serialized)
    localStorage.setItem(SALES_EVENT_SYNC_KEY, serialized)
  } catch {
    showMessage('保存できませんでした。端末の空き容量とブラウザ設定を確認してください。', true)
  }
}

watch(state, persistState, { deep: true })

function setStage(stage) {
  if (stage !== 'round3') stopTimer()
  state.stage = stage
}

function startRound1() {
  const missingTeam = state.teams.find(team => !team.name.trim())
  const missingPlayer = state.teams.find(team => team.players.some(player => !player.trim()))
  if (missingTeam || missingPlayer) {
    showMessage('チーム名と25名全員の名前を入力してください。', true)
    return
  }
  setStage('round1')
}

function normalizeSettings() {
  state.genres.forEach(genre => {
    const questionCount = Math.max(1, Math.min(100, Number(genre.questionCount) || 10))
    genre.questionCount = Math.max(questionCount, genre.questionsDone)
  })
  state.scoring.round1Placement = state.scoring.round1Placement.map(value => (
    Math.max(0, Math.min(999, Number(value) || 0))
  ))
  state.scoring.round2Correct = Math.max(0, Math.min(999, Number(state.scoring.round2Correct) || 0))
  state.scoring.round3Correct = Math.max(0, Math.min(999, Number(state.scoring.round3Correct) || 0))
}

function clearedCount(team) {
  return team.round1Cleared.filter(Boolean).length
}

function activePlayerIndices(team) {
  return getRound1ActivePlayerIndices(team)
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

function markRound1Correct(teamIndex, playerIndex) {
  const team = state.teams[teamIndex]
  if (team.round1Cleared[playerIndex] || !activePlayerIndices(team).includes(playerIndex)) return
  team.round1Cleared[playerIndex] = true
  const completed = team.round1Cleared.every(Boolean)
  if (completed) {
    const finishOrder = state.teams.filter(item => item.round1FinishOrder).length + 1
    team.round1FinishOrder = finishOrder
    team.round1Points = getRound1TeamPoints(state, teamIndex)
  }
  state.round1History.push({ teamIndex, playerIndex, completed })
}

function undoRound1() {
  const last = state.round1History.pop()
  if (!last) return
  const team = state.teams[last.teamIndex]
  team.round1Cleared[last.playerIndex] = false
  if (last.completed) {
    team.round1FinishOrder = null
    team.round1Points = 0
  }
}

function recordGenreAnswer(teamIndex) {
  if (activeGenre.value.questionsDone >= activeGenre.value.questionCount) return
  activeGenre.value.questionsDone += 1
  if (teamIndex !== null) activeGenre.value.scores[teamIndex] += 1
  activeGenre.value.history.push(teamIndex)
}

function undoGenreAnswer() {
  const teamIndex = activeGenre.value.history.pop()
  if (teamIndex === undefined) return
  activeGenre.value.questionsDone = Math.max(0, activeGenre.value.questionsDone - 1)
  if (teamIndex !== null) {
    activeGenre.value.scores[teamIndex] = Math.max(0, activeGenre.value.scores[teamIndex] - 1)
  }
}

function prepareRound3() {
  applyTimerDuration(false)
  setStage('round3')
}

function applyTimerDuration(force = true) {
  state.round3DurationMinutes = Math.max(1, Math.min(120, Number(state.round3DurationMinutes) || 10))
  if (force || state.round3RemainingSeconds === 0 || state.round3RemainingSeconds === 600) {
    state.round3RemainingSeconds = Math.round(state.round3DurationMinutes * 60)
  }
}

function stopTimer() {
  timerRunning.value = false
  if (timerId) {
    window.clearInterval(timerId)
    timerId = null
  }
}

function toggleTimer() {
  if (timerRunning.value) {
    stopTimer()
    return
  }
  if (state.round3RemainingSeconds <= 0) return
  timerRunning.value = true
  timerId = window.setInterval(() => {
    state.round3RemainingSeconds = Math.max(0, state.round3RemainingSeconds - 1)
    if (state.round3RemainingSeconds === 0) stopTimer()
  }, 1000)
}

function resetTimer() {
  if (!window.confirm('タイマーを設定時間へ戻しますか？')) return
  stopTimer()
  state.round3RemainingSeconds = Math.round(state.round3DurationMinutes * 60)
}

function changeRound3Score(teamIndex, delta) {
  state.round3Scores[teamIndex] = Math.max(0, state.round3Scores[teamIndex] + delta)
}

function finishTeamRounds() {
  stopTimer()
  state.stage = 'result'
  if (topTeamIds.value.length === 1) state.championTeamId = topTeamIds.value[0]
}

function round2Total(teamIndex) {
  return getRound2Total(state, teamIndex)
}

function round1Points(teamIndex) {
  return getRound1TeamPoints(state, teamIndex)
}

function round3Points(teamIndex) {
  return getRound3Total(state, teamIndex)
}

function openPrediction() {
  if (!selectedChampion.value) return
  const teamChanged = state.finalTeamId && state.finalTeamId !== selectedChampion.value.id
  const hasProgress = state.finalScores.some(score => score.correct > 0 || score.wrong > 0)
  if (teamChanged && hasProgress && !window.confirm('優勝チームを変更すると個人決勝の得点を初期化します。よろしいですか？')) {
    return
  }
  if (!state.finalTeamId || teamChanged) {
    state.finalScores = Array.from({ length: 6 }, () => ({ correct: 0, wrong: 0 }))
    state.finalGuest = { teamId: '', playerIndex: '' }
  }
  state.finalTeamId = selectedChampion.value.id
  if (state.finalGuest.teamId === state.finalTeamId) {
    state.finalGuest = { teamId: '', playerIndex: '' }
    state.finalScores[5] = { correct: 0, wrong: 0 }
  }
  state.stage = 'prediction'
}

function startFinal() {
  if (!finalEntrants.value.length) return
  state.stage = 'final'
}

function isFinalistLocked(playerIndex) {
  return Boolean(finalWinner.value) || state.finalScores[playerIndex].wrong >= 3
}

function changeFinalScore(playerIndex, field, delta) {
  const max = field === 'correct' ? 5 : 3
  state.finalScores[playerIndex][field] = Math.max(0, Math.min(max, state.finalScores[playerIndex][field] + delta))
}

function currentScoreUrl() {
  persistState()
  return scoreDisplayUrl.value
}

function openScoreDisplay() {
  window.open(currentScoreUrl(), 'piyopiyo-sales-score', 'popup=yes,width=1280,height=800')
}

async function copyScoreUrl() {
  const url = currentScoreUrl()
  try {
    await navigator.clipboard.writeText(url)
    showMessage('会場表示URLをコピーしました。')
  } catch {
    window.prompt('このURLをコピーしてください。', url)
  }
}

function exportBackup() {
  const payload = {
    app: SALES_EVENT_APP_ID,
    exportedAt: new Date().toISOString(),
    state: normalizeSalesEventState(state),
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `sales-event-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

async function restoreBackup(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    const payload = JSON.parse(await file.text())
    if (payload.app !== SALES_EVENT_APP_ID || !payload.state) throw new Error('invalid')
    if (!window.confirm('現在の進行状況を、選択したバックアップで置き換えますか？')) return
    stopTimer()
    Object.assign(state, normalizeSalesEventState(payload.state))
    showMessage('バックアップを復元しました。')
  } catch {
    showMessage('このJSONは営業イベントの有効なバックアップではありません。', true)
  }
}

function resetAll() {
  if (!window.confirm('チーム名・得点・進行状況をすべて初期化します。元に戻せません。よろしいですか？')) return
  stopTimer()
  Object.assign(state, createSalesEventState())
  showMessage('営業イベントのデータを初期化しました。')
}

onBeforeUnmount(() => {
  stopTimer()
  if (messageTimer) window.clearTimeout(messageTimer)
})
</script>

<style scoped>
.sales-event {
  --ink: #f7f8f3;
  --muted: #a8b2a5;
  --line: rgba(255, 255, 255, 0.12);
  --panel: rgba(8, 20, 12, 0.88);
  --yellow: #f7d154;
  --green: #5bd18b;
  min-height: 100vh;
  padding: 24px clamp(14px, 3vw, 40px) 80px;
  color: var(--ink);
  background:
    linear-gradient(120deg, rgba(0, 0, 0, 0.72), rgba(13, 54, 28, 0.42)),
    radial-gradient(circle at 85% 10%, rgba(247, 209, 84, 0.17), transparent 28%);
}

button, input, select { font: inherit; }
button { touch-action: manipulation; }

.event-header {
  max-width: 1500px;
  margin: 0 auto 20px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 22px;
}

.event-header h1 {
  margin: 2px 0 4px;
  font-size: clamp(1.7rem, 4vw, 3.4rem);
  letter-spacing: -0.04em;
}

.eyebrow, .section-kicker, .team-number {
  margin: 0;
  color: var(--yellow);
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.18em;
}

.subtitle { margin: 0; color: var(--muted); }

.back-button, .display-button, .secondary-button, .primary-button, .event-footer button, .event-footer label {
  min-height: 46px;
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 16px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  font-size: .95rem;
  font-weight: 800;
}

.display-button, .primary-button {
  border-color: transparent;
  color: #132014;
  background: var(--yellow);
}

button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.message {
  max-width: 1500px;
  margin: 0 auto 16px;
  padding: 12px 16px;
  border: 1px solid rgba(91, 209, 139, 0.4);
  border-radius: 10px;
  color: #c9f6d9;
  background: rgba(35, 110, 66, 0.3);
}

.message--error {
  border-color: rgba(255, 100, 100, 0.5);
  color: #ffd4d4;
  background: rgba(130, 30, 30, 0.35);
}

.stage-nav {
  max-width: 1500px;
  margin: 0 auto 20px;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
}

.stage-nav button {
  min-height: 52px;
  border: 0;
  border-right: 1px solid var(--line);
  color: var(--muted);
  background: rgba(0, 0, 0, 0.25);
  cursor: pointer;
  font-weight: 800;
}

.stage-nav button:last-child { border-right: 0; }
.stage-nav button span { margin-right: 7px; color: #627166; font-size: 0.78rem; }
.stage-nav button.active { color: #142115; background: var(--yellow); }
.stage-nav button.active span { color: rgba(20, 33, 21, 0.6); }

.panel {
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--panel);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
}

.setup-panel, .result-panel, .prediction-panel, .final-panel, .event-footer {
  max-width: 1500px;
  margin: 0 auto;
}

.setup-panel, .result-panel, .prediction-panel, .final-panel { padding: clamp(18px, 3vw, 34px); }

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 24px;
}

.section-heading.panel { padding: 22px 24px; }
.section-heading h2, .result-panel h2, .prediction-panel h2, .final-panel h2 { margin: 4px 0 0; font-size: clamp(1.4rem, 3vw, 2.2rem); }
.section-heading > p { max-width: 640px; margin: 0; color: var(--muted); line-height: 1.7; }

.event-title-field {
  display: grid;
  grid-template-columns: 110px 1fr;
  align-items: center;
  margin: 30px 0 18px;
}

.event-title-field span, .team-name-field span, .genre-title-row label span, .timer-settings span, .champion-choice label span {
  color: var(--muted);
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.06em;
}

input, select {
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  outline: 0;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.07);
}

input:focus, select:focus { border-color: var(--yellow); box-shadow: 0 0 0 3px rgba(247, 209, 84, 0.12); }
.event-title-field input { padding: 0 14px; font-size: 1.1rem; font-weight: 800; }

.team-setup-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.team-setup-card {
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
}

.team-name-field { display: grid; gap: 6px; margin-bottom: 12px; }
.team-name-field input { width: 100%; padding: 0 10px; color: var(--yellow); font-weight: 900; }
.player-name-field { display: grid; grid-template-columns: 22px 1fr; align-items: center; gap: 6px; margin: 7px 0; }
.player-name-field span { color: #87958b; font-size: 0.82rem; text-align: center; }
.player-name-field input { width: 100%; min-width: 0; padding: 0 9px; }

.event-settings-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 12px;
  margin-top: 18px;
}

.settings-card {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.025);
}

.settings-card__head {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 16px;
  margin-bottom: 14px;
}

.settings-card__head h3 { margin: 3px 0 0; }
.settings-card__head > p { margin: 0; color: var(--muted); font-size: .82rem; }

.genre-settings { display: grid; gap: 7px; }
.genre-settings label {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) 70px 20px;
  align-items: center;
  gap: 7px;
}
.genre-settings label > span { color: #87958b; font-size: .82rem; text-align: center; }
.genre-settings input { width: 100%; min-width: 0; padding: 0 9px; }
.genre-settings input[type="number"] { text-align: right; }
.genre-settings small, .placement-settings small, .correct-score-settings small { color: var(--muted); font-size: .78rem; }

.placement-settings > span {
  display: block;
  margin-bottom: 7px;
  color: var(--muted);
  font-size: .86rem;
  font-weight: 800;
}
.placement-settings {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
}
.placement-settings > span { grid-column: 1 / -1; }
.placement-settings label {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  text-align: center;
}
.placement-settings input { width: 100%; min-width: 0; padding: 0 6px; text-align: center; }

.correct-score-settings {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;
}
.correct-score-settings label {
  display: grid;
  grid-template-columns: 1fr 72px 20px;
  align-items: center;
  gap: 7px;
}
.correct-score-settings span { color: var(--muted); font-size: .86rem; font-weight: 800; }
.correct-score-settings input { width: 100%; min-width: 0; padding: 0 8px; text-align: right; }

.display-link-panel {
  display: grid;
  grid-template-columns: minmax(180px, .7fr) minmax(240px, 1.4fr) auto auto;
  align-items: center;
  gap: 8px;
  margin-top: 18px;
  padding: 14px;
  border: 1px solid rgba(247, 209, 84, .24);
  border-radius: 12px;
  background: rgba(247, 209, 84, .055);
}
.display-link-panel span { color: var(--yellow); font-size: .88rem; font-weight: 900; }
.display-link-panel p { margin: 3px 0 0; color: var(--muted); font-size: .78rem; }
.display-link-panel input { width: 100%; min-width: 0; padding: 0 10px; color: #aeb8b0; font-size: .78rem; }

.setup-actions, .round-actions, .genre-actions, .timer-actions, .champion-choice {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
}

.url-guide {
  margin-top: 18px;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.7;
}

.url-guide summary { cursor: pointer; }
.url-guide code { color: var(--yellow); }

.round-layout {
  max-width: 1500px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 18px;
}

.round-main { min-width: 0; }
.relay-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 12px; }
.relay-card { padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: rgba(7, 17, 10, 0.82); }
.relay-card:last-child { grid-column: 1 / -1; }
.relay-card.finished { border-color: rgba(247, 209, 84, 0.45); background: rgba(67, 63, 21, 0.35); }
.relay-card__head { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.relay-card h3, .representative-card h3, .round3-team-card h3 { margin: 4px 0 0; }
.finish-badge, .progress-badge { padding: 6px 9px; border-radius: 8px; color: #102016; background: var(--yellow); font-weight: 900; }
.finish-badge strong { margin-left: 5px; }
.progress-badge { color: var(--muted); background: rgba(255, 255, 255, 0.08); }
.active-label { margin: 18px 0 8px; color: var(--muted); font-size: 0.85rem; font-weight: 800; }
.relay-roster { display: grid; gap: 6px; }
.relay-player {
  display: grid;
  grid-template-columns: 24px 20px minmax(0, 1fr) minmax(112px, auto);
  align-items: center;
  gap: 7px;
  min-height: 52px;
  padding: 6px 7px;
  border: 1px solid transparent;
  border-radius: 10px;
  transition: opacity .2s ease, background .2s ease, border-color .2s ease;
}
.relay-player__order { color: #7f8c83; font-size: .78rem; font-weight: 900; text-align: center; }
.relay-player__mark { font-size: 1rem; font-weight: 950; text-align: center; }
.relay-player strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.relay-player__status { justify-self: end; font-size: .78rem; font-weight: 900; }
.relay-player--active {
  border-color: rgba(91, 209, 139, .58);
  color: #effff4;
  background: rgba(42, 127, 75, .32);
  box-shadow: inset 3px 0 #5bd18b;
}
.relay-player--active .relay-player__mark { color: #5bd18b; }
.relay-player--cleared { color: #93b9a0; background: rgba(42, 127, 75, .1); }
.relay-player--cleared .relay-player__mark, .relay-player--cleared .relay-player__status { color: #5bd18b; }
.relay-player--cleared strong { text-decoration: line-through; text-decoration-thickness: 1px; }
.relay-player--waiting { color: #657269; background: rgba(255,255,255,.025); opacity: .68; }
.relay-player--waiting .relay-player__status { color: #657269; }
.correct-player-button {
  min-height: 34px;
  padding: 6px 9px;
  border: 1px solid rgba(91, 209, 139, .62);
  border-radius: 8px;
  color: #eafff0;
  background: rgba(42, 127, 75, .48);
  cursor: pointer;
  font-size: .78rem;
  font-weight: 900;
}
.correct-player-button:hover { background: rgba(42, 127, 75, .68); }

.round-actions { min-height: 76px; padding: 14px 18px; }
.round-actions span { margin-right: auto; color: var(--muted); font-size: 0.9rem; }

.score-rail { position: sticky; top: 16px; align-self: start; padding: 16px; }
.score-rail__title { margin-bottom: 12px; color: var(--yellow); font-size: 0.85rem; font-weight: 900; letter-spacing: 0.14em; }
.score-rail__team { display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 9px; padding: 11px 0; border-top: 1px solid var(--line); }
.score-rail__rank { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 50%; color: #172018; background: var(--yellow); font-weight: 900; }
.score-rail__team strong, .score-rail__team small { display: block; }
.score-rail__team small { margin-top: 3px; color: #87958b; font-size: 0.75rem; }
.score-rail__team b { color: var(--yellow); font-size: 1.5rem; }
.score-rail__team b small { display: inline; margin-left: 2px; }

.genre-tabs { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 12px 0; }
.genre-tabs button { min-height: 56px; border: 1px solid var(--line); border-radius: 9px; color: var(--muted); background: rgba(0,0,0,.28); cursor: pointer; font-weight: 800; }
.genre-tabs button small { display: block; margin-top: 3px; color: #6d776f; }
.genre-tabs button.active { border-color: var(--yellow); color: var(--yellow); }
.genre-tabs button.complete small { color: var(--green); }
.genre-panel { padding: 20px; }
.genre-title-row { display: flex; justify-content: space-between; align-items: end; gap: 20px; }
.genre-title-row label { display: grid; gap: 6px; flex: 1; }
.genre-title-row input { width: 100%; padding: 0 12px; font-size: 1.1rem; font-weight: 900; }
.question-counter { display: flex; align-items: baseline; gap: 5px; }
.question-counter span { color: var(--muted); font-size: 0.75rem; font-weight: 900; letter-spacing: .12em; }
.question-counter strong { color: var(--yellow); font-size: 2.1rem; }
.question-counter small { color: var(--muted); }
.representatives-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-top: 18px; }
.representative-card { padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: rgba(255,255,255,.025); }
.representative-card h3 { min-height: 40px; font-size: 1rem; }
.representative-selects { display: grid; gap: 6px; margin: 8px 0; }
.representative-selects select {
  width: 100%;
  min-width: 0;
  padding: 0 28px 0 9px;
  border-color: rgba(255,255,255,.25);
  color: #f7fff9;
  background-color: #14291a;
  font-size: .88rem;
  font-weight: 850;
}
.representative-selects select.has-selection {
  border-color: rgba(91,209,139,.72);
  color: #ffffff;
  background-color: #173b25;
  box-shadow: inset 3px 0 #5bd18b;
}
.representative-selects select:focus {
  border-color: #f7d154;
  box-shadow: 0 0 0 3px rgba(247,209,84,.16);
}
.representative-selects option {
  color: #172019;
  background: #ffffff;
  font-weight: 700;
}
.representative-selects option[value=""] { color: #59635b; }
.genre-correct-button { width: 100%; min-height: 56px; border: 1px solid rgba(91,209,139,.35); border-radius: 9px; color: #dff9e8; background: rgba(42,127,75,.28); cursor: pointer; font-weight: 900; }
.genre-correct-button strong { display: block; margin-top: 2px; color: var(--green); }

.timer-panel { margin-top: 12px; padding: 22px; text-align: center; }
.timer-settings { display: flex; justify-content: flex-end; }
.timer-settings label { display: flex; align-items: center; gap: 8px; }
.timer-settings input { width: 80px; padding: 0 8px; }
.timer { margin: 10px 0; color: var(--yellow); font-size: clamp(4rem, 13vw, 8rem); font-weight: 950; letter-spacing: -.06em; line-height: 1; font-variant-numeric: tabular-nums; }
.timer.urgent { color: #ff6b64; }
.timer-actions { justify-content: center; }
.round3-grid { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 8px; margin-top: 12px; }
.round3-team-card { padding: 14px; border: 1px solid var(--line); border-radius: 12px; text-align: center; background: rgba(7,17,10,.82); }
.round3-team-card > span { color: var(--muted); font-size: .75rem; font-weight: 900; letter-spacing: .1em; }
.round3-team-card > strong { display: block; margin: 14px 0; color: var(--yellow); font-size: 2.6rem; }
.round3-team-card > strong small { margin-left: 3px; font-size: .8rem; }
.round3-team-card > p { min-height: 30px; margin: -8px 0 10px; color: var(--muted); font-size: .76rem; }
.round3-team-card > div { display: grid; grid-template-columns: 44px 1fr; gap: 5px; }
.round3-team-card button { min-height: 45px; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: rgba(255,255,255,.05); cursor: pointer; font-weight: 900; }
.round3-team-card button.plus { border-color: rgba(91,209,139,.4); color: #dff9e8; background: rgba(42,127,75,.3); }

.result-panel, .prediction-panel, .final-panel { text-align: center; }
.podium-list { max-width: 940px; margin: 26px auto; display: grid; gap: 8px; text-align: left; }
.podium-list article { display: grid; grid-template-columns: 48px 1fr auto 90px; align-items: center; gap: 16px; padding: 14px 18px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,.025); }
.podium-list article.winner { border-color: var(--yellow); background: rgba(247,209,84,.1); }
.rank { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 50%; color: #172018; background: var(--yellow); font-size: 1.2rem; font-weight: 950; }
.result-team span { color: var(--muted); font-size: .72rem; font-weight: 900; letter-spacing: .12em; }
.result-team h3 { margin: 2px 0 0; }
.result-breakdown { display: flex; gap: 10px; color: var(--muted); font-size: .86rem; }
.podium-list article > strong { color: var(--yellow); font-size: 2rem; text-align: right; }
.podium-list article > strong small { margin-left: 3px; font-size: .75rem; }
.champion-choice { justify-content: center; }
.champion-choice label { display: grid; gap: 5px; text-align: left; }
.champion-choice select {
  min-width: 280px;
  padding: 0 30px 0 10px;
  border-color: rgba(255,255,255,.3);
  color: #f7fff9;
  background-color: #14291a;
  font-weight: 850;
}
.champion-choice select.has-selection {
  border-color: rgba(91,209,139,.72);
  color: #ffffff;
  background-color: #173b25;
  box-shadow: inset 3px 0 #5bd18b;
}
.champion-choice select:focus {
  border-color: var(--yellow);
  box-shadow: 0 0 0 3px rgba(247,209,84,.16);
}
.champion-choice option { color: #172019; background: #ffffff; font-weight: 700; }
.champion-choice option[value=""] { color: #59635b; }

.prediction-lead { margin: 8px 0 0; color: var(--muted); }
.prediction-rules { display: grid; max-width: 940px; margin: 24px auto; padding: 0; gap: 8px; list-style: none; text-align: left; }
.prediction-rules li { display: grid; grid-template-columns: 34px 1fr; align-items: center; gap: 10px; padding: 11px 14px; border: 1px solid var(--line); border-radius: 10px; background: rgba(255,255,255,.025); }
.prediction-rules strong { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; color: #172018; background: var(--yellow); }
.prediction-rules span { color: #e5eae6; font-size: .95rem; font-weight: 700; }
.prediction-heading { display: flex; max-width: 1080px; margin: 30px auto 10px; justify-content: space-between; align-items: end; text-align: left; }
.prediction-heading span, .guest-selector > div > span { color: var(--yellow); font-size: .75rem; font-weight: 950; letter-spacing: .16em; }
.prediction-heading h3, .guest-selector h3 { margin: 3px 0 0; }
.prediction-heading > strong { color: var(--yellow); font-size: 1.8rem; }
.prediction-roster { display: grid; max-width: 1080px; margin: 0 auto; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
.prediction-roster article { padding: 14px 10px; border: 1px solid var(--line); border-radius: 11px; background: rgba(255,255,255,.03); }
.prediction-roster article.guest { border-color: rgba(91,209,139,.65); background: rgba(42,127,75,.17); }
.prediction-roster article > span { color: var(--muted); font-size: .75rem; font-weight: 950; letter-spacing: .12em; }
.prediction-roster h3 { margin: 6px 0; }
.prediction-roster p { margin: 0; color: var(--muted); font-size: .82rem; }
.prediction-roster p b, .finalist-team b { margin-left: 6px; padding: 2px 5px; border-radius: 999px; color: #bdf5d0; background: rgba(42,127,75,.35); font-size: .7rem; }
.guest-selector { display: grid; max-width: 940px; margin: 24px auto 0; padding: 16px; grid-template-columns: 1fr minmax(280px, .8fr); align-items: center; gap: 18px; border: 1px solid rgba(91,209,139,.3); border-radius: 12px; background: rgba(42,127,75,.08); text-align: left; }
.guest-selector p { margin: 4px 0 0; color: var(--muted); font-size: .85rem; }
.guest-selector label { display: grid; gap: 5px; color: var(--muted); font-size: .82rem; font-weight: 800; }
.guest-selector select { width: 100%; padding: 0 10px; color: #fff; background-color: #173b25; font-weight: 850; }
.guest-selector option { color: #172019; background: #fff; }
.prediction-actions { margin-top: 22px; }

.final-rule { color: var(--muted); }
.final-winner { max-width: 760px; margin: 22px auto; padding: 18px; border: 1px solid var(--yellow); border-radius: 14px; background: rgba(247,209,84,.1); }
.final-winner span, .final-winner strong { display: block; }
.final-winner span { color: var(--yellow); font-size: .75rem; font-weight: 950; letter-spacing: .2em; }
.final-winner strong { margin-top: 4px; font-size: clamp(2rem, 5vw, 4rem); }
.finalists { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px,1fr)); gap: 10px; margin-top: 24px; }
.finalists article { position: relative; padding: 16px 10px; border: 1px solid var(--line); border-radius: 12px; background: rgba(255,255,255,.025); }
.finalists article.eliminated { opacity: .42; }
.finalists article.crowned { border-color: var(--yellow); box-shadow: 0 0 30px rgba(247,209,84,.2); }
.finalist-number { display: grid; width: 26px; height: 26px; margin: 0 auto; place-items: center; border-radius: 50%; color: var(--muted); background: rgba(255,255,255,.08); font-weight: 900; }
.finalists h3 { min-height: 24px; margin: 9px 0 3px; }
.finalist-team { display: block; min-height: 22px; margin-bottom: 7px; color: var(--muted); font-size: .75rem; }
.maru-batsu { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
.maru-batsu > div { padding: 9px 4px; }
.maru-batsu > div + div { border-left: 1px solid var(--line); }
.maru-batsu span, .maru-batsu strong, .maru-batsu small { display: block; }
.maru-batsu span { color: var(--muted); font-size: .82rem; }
.maru-batsu strong { font-size: 2rem; }
.maru-batsu > div:first-child strong { color: var(--green); }
.maru-batsu > div:last-child strong { color: #ff756e; }
.maru-batsu small { color: var(--muted); font-size: .75rem; }
.finalist-actions, .finalist-undo { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-top: 9px; }
.finalist-actions button { min-height: 48px; border: 0; border-radius: 8px; color: white; cursor: pointer; font-weight: 900; }
.finalist-actions .correct { background: #287d48; }
.finalist-actions .wrong { background: #a33834; }
.finalist-undo button { border: 0; color: var(--muted); background: transparent; cursor: pointer; font-size: .75rem; }

.event-footer { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--line); color: var(--muted); }
.backup-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.event-footer button, .event-footer label { display: inline-flex; align-items: center; min-height: 42px; padding: 8px 13px; color: var(--muted); font-size: .82rem; }
.event-footer label { cursor: pointer; }
.event-footer input[type="file"] { display: none; }
.event-footer .danger-button { color: #ff938e; margin-left: auto; }
.event-footer details { margin-top: 14px; line-height: 1.8; }
.event-footer summary { cursor: pointer; color: #c5cec6; font-weight: 800; }

@media (max-width: 1100px) {
  .team-setup-grid, .representatives-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .event-settings-grid { grid-template-columns: 1fr; }
  .display-link-panel { grid-template-columns: 1fr auto auto; }
  .display-link-panel > div { grid-column: 1 / -1; }
  .round-layout { grid-template-columns: 1fr; }
  .score-rail { position: static; grid-row: 1; }
  .score-rail__team { display: grid; }
  .round3-grid, .finalists { grid-template-columns: repeat(3, minmax(0,1fr)); }
}

@media (max-width: 680px) {
  .sales-event { padding: 14px 10px 72px; }
  .event-header { grid-template-columns: auto 1fr; gap: 10px; }
  .event-header .display-button { grid-column: 1 / -1; }
  .back-button { padding: 8px 10px; }
  .subtitle { font-size: .78rem; }
  .stage-nav { overflow-x: auto; grid-template-columns: repeat(7, minmax(82px, 1fr)); }
  .section-heading { display: block; }
  .section-heading > p { margin-top: 10px; font-size: .82rem; }
  .event-title-field { grid-template-columns: 1fr; gap: 6px; }
  .team-setup-grid, .relay-grid, .representatives-grid, .round3-grid, .finalists { grid-template-columns: 1fr; }
  .display-link-panel { grid-template-columns: 1fr 1fr; }
  .display-link-panel input { grid-column: 1 / -1; }
  .relay-card:last-child { grid-column: auto; }
  .relay-player { grid-template-columns: 24px 20px minmax(0, 1fr) minmax(104px, auto); }
  .genre-tabs { display: flex; overflow-x: auto; }
  .genre-tabs button { min-width: 110px; }
  .genre-title-row { align-items: center; }
  .representative-card { display: grid; grid-template-columns: 1fr 1.2fr 1fr; align-items: center; gap: 8px; }
  .representative-card h3 { min-height: 0; }
  .round3-team-card { display: grid; grid-template-columns: 1fr 70px 1.4fr; align-items: center; text-align: left; }
  .round3-team-card > span { grid-column: 1; }
  .round3-team-card h3 { grid-column: 1; }
  .round3-team-card > strong { grid-column: 2; grid-row: 1 / 3; margin: 0; text-align: center; }
  .round3-team-card > div { grid-column: 3; grid-row: 1 / 3; }
  .round3-team-card > p { grid-column: 1 / -1; min-height: 0; margin: 5px 0 0; }
  .podium-list article { grid-template-columns: 38px 1fr 70px; gap: 8px; padding: 10px; }
  .result-breakdown { grid-column: 2 / -1; grid-row: 2; }
  .champion-choice { flex-direction: column; align-items: stretch; }
  .champion-choice select { min-width: 0; width: 100%; }
  .guest-selector { grid-template-columns: 1fr; }
  .setup-actions, .round-actions { align-items: stretch; flex-direction: column; }
  .round-actions span { margin: 0; }
  .event-footer .danger-button { margin-left: 0; }
}
</style>
