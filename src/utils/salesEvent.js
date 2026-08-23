export const SALES_EVENT_STORAGE_KEY = 'piyopiyo_sales_event_v1'
export const SALES_EVENT_SYNC_KEY = 'piyopiyo_sales_event_score_sync_v1'
export const SALES_EVENT_APP_ID = 'piyopiyo-sales-event'

const DEFAULT_GENRES = ['ことば', 'エンタメ', '社会', '理系', 'スポーツ']

function fixedArray(source, length, fallbackFactory) {
  return Array.from({ length }, (_, index) => (
    Array.isArray(source) && source[index] !== undefined
      ? source[index]
      : fallbackFactory(index)
  ))
}

function boundedNumber(value, fallback, min = 0, max = 999) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback
}

export function createSalesEventState() {
  return {
    schemaVersion: 1,
    eventTitle: '出張営業チームクイズ',
    stage: 'setup',
    teams: Array.from({ length: 5 }, (_, teamIndex) => ({
      id: `team-${teamIndex + 1}`,
      name: `チーム${teamIndex + 1}`,
      players: Array.from({ length: 5 }, (_, playerIndex) => `メンバー${playerIndex + 1}`),
      round1Cleared: [false, false, false, false, false],
      round1FinishOrder: null,
      round1Points: 0,
    })),
    round1History: [],
    genres: DEFAULT_GENRES.map(name => ({
      name,
      questionCount: 10,
      questionsDone: 0,
      scores: [0, 0, 0, 0, 0],
      representatives: Array.from({ length: 5 }, () => ['', '']),
      history: [],
    })),
    activeGenreIndex: 0,
    scoring: {
      round1Placement: [5, 4, 3, 2, 1],
      round2Correct: 1,
      round3Correct: 1,
    },
    round3DurationMinutes: 10,
    round3RemainingSeconds: 600,
    round3Scores: [0, 0, 0, 0, 0],
    championTeamId: null,
    finalTeamId: null,
    finalGuest: {
      teamId: '',
      playerIndex: '',
    },
    finalScores: Array.from({ length: 6 }, () => ({ correct: 0, wrong: 0 })),
    updatedAt: new Date().toISOString(),
  }
}

export function normalizeSalesEventState(source) {
  const fallback = createSalesEventState()
  if (!source || typeof source !== 'object') return fallback

  const normalized = {
    ...fallback,
    ...source,
    schemaVersion: 1,
  }

  normalized.eventTitle = String(source.eventTitle ?? fallback.eventTitle).slice(0, 60)
  normalized.stage = ['setup', 'round1', 'round2', 'round3', 'result', 'prediction', 'final'].includes(source.stage)
    ? source.stage
    : fallback.stage

  normalized.teams = fixedArray(source.teams, 5, index => fallback.teams[index]).map((team, teamIndex) => {
    const base = fallback.teams[teamIndex]
    return {
      ...base,
      ...(team && typeof team === 'object' ? team : {}),
      id: base.id,
      name: String(team?.name ?? base.name).slice(0, 24),
      players: fixedArray(team?.players, 5, index => base.players[index])
        .map(name => String(name ?? '').slice(0, 24)),
      round1Cleared: fixedArray(team?.round1Cleared, 5, () => false).map(Boolean),
      round1FinishOrder: Number.isInteger(team?.round1FinishOrder)
        && team.round1FinishOrder >= 1
        && team.round1FinishOrder <= 5
        ? team.round1FinishOrder
        : null,
      round1Points: Math.max(0, Math.min(5, Number(team?.round1Points) || 0)),
    }
  })

  normalized.round1History = Array.isArray(source.round1History)
    ? source.round1History.filter(item => item && Number.isInteger(item.teamIndex) && Number.isInteger(item.playerIndex)).slice(-50)
    : []

  const sourceScoring = source.scoring && typeof source.scoring === 'object' ? source.scoring : {}
  normalized.scoring = {
    round1Placement: fixedArray(sourceScoring.round1Placement, 5, index => fallback.scoring.round1Placement[index])
      .map(value => Math.max(0, Math.min(999, Number(value) || 0))),
    round2Correct: boundedNumber(sourceScoring.round2Correct, fallback.scoring.round2Correct),
    round3Correct: boundedNumber(sourceScoring.round3Correct, fallback.scoring.round3Correct),
  }

  normalized.genres = fixedArray(source.genres, 5, index => fallback.genres[index]).map((genre, genreIndex) => {
    const base = fallback.genres[genreIndex]
    const questionsDone = Math.max(0, Math.min(100, Number(genre?.questionsDone) || 0))
    const configuredQuestionCount = Math.max(1, Math.min(100, Number(genre?.questionCount) || base.questionCount))
    const questionCount = Math.max(configuredQuestionCount, questionsDone)
    return {
      ...base,
      ...(genre && typeof genre === 'object' ? genre : {}),
      name: String(genre?.name ?? base.name).slice(0, 24),
      questionCount,
      questionsDone,
      scores: fixedArray(genre?.scores, 5, () => 0)
        .map(score => Math.max(0, Math.min(questionCount, Number(score) || 0))),
      representatives: fixedArray(genre?.representatives, 5, () => ['', '']).map(pair => (
        fixedArray(pair, 2, () => '').map(value => {
          if (value === '' || value === null || value === undefined) return ''
          const parsed = Number(value)
          return Number.isInteger(parsed) && parsed >= 0 && parsed < 5 ? parsed : ''
        })
      )),
      history: Array.isArray(genre?.history)
        ? genre.history
          .filter(value => value === null || (Number.isInteger(value) && value >= 0 && value < 5))
          .slice(-questionCount)
        : [],
    }
  })
  normalized.activeGenreIndex = Math.max(0, Math.min(4, Number(source.activeGenreIndex) || 0))

  normalized.round3DurationMinutes = Math.max(1, Math.min(120, Number(source.round3DurationMinutes) || 10))
  const remainingSeconds = Number(source.round3RemainingSeconds)
  normalized.round3RemainingSeconds = Math.max(
    0,
    Math.min(
      7200,
      Number.isFinite(remainingSeconds) ? remainingSeconds : normalized.round3DurationMinutes * 60
    )
  )
  normalized.round3Scores = fixedArray(source.round3Scores, 5, () => 0)
    .map(score => Math.max(0, Number(score) || 0))
  normalized.championTeamId = normalized.teams.some(team => team.id === source.championTeamId)
    ? source.championTeamId
    : null
  normalized.finalTeamId = normalized.teams.some(team => team.id === source.finalTeamId)
    ? source.finalTeamId
    : null
  const sourceFinalGuest = source.finalGuest && typeof source.finalGuest === 'object'
    ? source.finalGuest
    : {}
  const guestTeamExists = normalized.teams.some(team => team.id === sourceFinalGuest.teamId)
  const guestPlayerIndex = Number(sourceFinalGuest.playerIndex)
  const finalistTeamId = normalized.finalTeamId || normalized.championTeamId
  normalized.finalGuest = guestTeamExists
    && sourceFinalGuest.teamId !== finalistTeamId
    && Number.isInteger(guestPlayerIndex)
    && guestPlayerIndex >= 0
    && guestPlayerIndex < 5
    ? { teamId: sourceFinalGuest.teamId, playerIndex: guestPlayerIndex }
    : { teamId: '', playerIndex: '' }
  normalized.finalScores = fixedArray(source.finalScores, 6, () => ({ correct: 0, wrong: 0 })).map(score => ({
    correct: Math.max(0, Math.min(5, Number(score?.correct) || 0)),
    wrong: Math.max(0, Math.min(3, Number(score?.wrong) || 0)),
  }))
  normalized.updatedAt = typeof source.updatedAt === 'string' ? source.updatedAt : fallback.updatedAt

  return normalized
}

export function loadSalesEventState() {
  try {
    const saved = localStorage.getItem(SALES_EVENT_STORAGE_KEY)
    return saved ? normalizeSalesEventState(JSON.parse(saved)) : createSalesEventState()
  } catch {
    return createSalesEventState()
  }
}

export function getRound1ActivePlayerIndices(team) {
  if (!team || team.round1FinishOrder) return []
  return team.round1Cleared
    .map((cleared, playerIndex) => ({ cleared, playerIndex }))
    .filter(item => !item.cleared)
    .slice(0, 2)
    .map(item => item.playerIndex)
}

export function getRound1PlayerStatus(team, playerIndex) {
  if (team?.round1Cleared?.[playerIndex]) return 'cleared'
  return getRound1ActivePlayerIndices(team).includes(playerIndex) ? 'active' : 'waiting'
}

export function getRound1TeamPoints(state, teamIndex) {
  const finishOrder = state.teams[teamIndex]?.round1FinishOrder
  if (!finishOrder) return 0
  return Number(state.scoring?.round1Placement?.[finishOrder - 1]) || 0
}

export function getRound2CorrectCount(state, teamIndex) {
  return state.genres.reduce((sum, genre) => sum + (Number(genre.scores[teamIndex]) || 0), 0)
}

export function getRound2Total(state, teamIndex) {
  return getRound2CorrectCount(state, teamIndex) * (Number(state.scoring?.round2Correct) || 0)
}

export function getRound3Total(state, teamIndex) {
  return (Number(state.round3Scores[teamIndex]) || 0) * (Number(state.scoring?.round3Correct) || 0)
}

export function getTeamTotal(state, teamIndex) {
  return getRound1TeamPoints(state, teamIndex)
    + getRound2Total(state, teamIndex)
    + getRound3Total(state, teamIndex)
}

export function getFinalists(state) {
  const finalTeamId = state?.finalTeamId || state?.championTeamId
  const finalTeam = state?.teams?.find(team => team.id === finalTeamId)
  if (!finalTeam) return []

  const finalists = finalTeam.players.map((name, playerIndex) => ({
    key: `${finalTeam.id}-${playerIndex}`,
    name: name || `メンバー${playerIndex + 1}`,
    teamId: finalTeam.id,
    teamName: finalTeam.name,
    playerIndex,
    isGuest: false,
  }))

  const guestTeam = state.teams.find(team => team.id === state.finalGuest?.teamId)
  const guestPlayerIndex = Number(state.finalGuest?.playerIndex)
  if (
    guestTeam
    && guestTeam.id !== finalTeam.id
    && Number.isInteger(guestPlayerIndex)
    && guestPlayerIndex >= 0
    && guestPlayerIndex < 5
  ) {
    finalists.push({
      key: `guest-${guestTeam.id}-${guestPlayerIndex}`,
      name: guestTeam.players[guestPlayerIndex] || `メンバー${guestPlayerIndex + 1}`,
      teamId: guestTeam.id,
      teamName: guestTeam.name,
      playerIndex: guestPlayerIndex,
      isGuest: true,
    })
  }

  return finalists
}

export function applyNamesFromUrl(
  state,
  search = window.location.search,
  hash = window.location.hash
) {
  const params = new URLSearchParams(search)
  const fragmentParams = new URLSearchParams(String(hash).replace(/^#\??/, ''))
  fragmentParams.forEach((value, key) => params.set(key, value))
  if (params.has('event')) state.eventTitle = params.get('event') || state.eventTitle
  state.teams.forEach((team, teamIndex) => {
    const teamNumber = teamIndex + 1
    if (params.has(`t${teamNumber}`)) {
      team.name = params.get(`t${teamNumber}`) || team.name
    }
    team.players.forEach((_, playerIndex) => {
      const key = `p${teamNumber}_${playerIndex + 1}`
      if (params.has(key)) {
        team.players[playerIndex] = params.get(key) || team.players[playerIndex]
      }
    })
  })
  state.genres.forEach((genre, genreIndex) => {
    const genreNumber = genreIndex + 1
    if (params.has(`g${genreNumber}`)) genre.name = params.get(`g${genreNumber}`) || genre.name
    if (params.has(`q${genreNumber}`)) {
      genre.questionCount = Math.max(
        genre.questionsDone,
        Math.max(1, Math.min(100, Number(params.get(`q${genreNumber}`)) || genre.questionCount))
      )
    }
  })
  if (params.has('r1')) {
    const placement = String(params.get('r1')).split(',').map(value => Math.max(0, Math.min(999, Number(value) || 0)))
    if (placement.length === 5) state.scoring.round1Placement = placement
  }
  if (params.has('r2')) state.scoring.round2Correct = Math.max(0, Math.min(999, Number(params.get('r2')) || 0))
  if (params.has('r3')) state.scoring.round3Correct = Math.max(0, Math.min(999, Number(params.get('r3')) || 0))
  return state
}

export function buildSalesScoreUrl(state, baseUrl, origin = window.location.origin) {
  const url = new URL(baseUrl, origin)
  url.searchParams.set('view', 'sales-score')
  const nameParams = new URLSearchParams()
  nameParams.set('event', state.eventTitle)
  state.teams.forEach((team, teamIndex) => {
    const teamNumber = teamIndex + 1
    nameParams.set(`t${teamNumber}`, team.name)
    team.players.forEach((player, playerIndex) => {
      nameParams.set(`p${teamNumber}_${playerIndex + 1}`, player)
    })
  })
  state.genres.forEach((genre, genreIndex) => {
    const genreNumber = genreIndex + 1
    nameParams.set(`g${genreNumber}`, genre.name)
    nameParams.set(`q${genreNumber}`, String(genre.questionCount))
  })
  nameParams.set('r1', state.scoring.round1Placement.join(','))
  nameParams.set('r2', String(state.scoring.round2Correct))
  nameParams.set('r3', String(state.scoring.round3Correct))
  // 名前はURLフラグメントへ入れ、Webサーバーへのリクエストには含めない。
  url.hash = nameParams.toString()
  return url.toString()
}
