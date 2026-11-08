export const WORDLE_LENGTH = 5
export const WORDLE_DISPLAY_STORAGE_KEY = 'piyopiyo_wordle_display_v1'
export const WORDLE_DISPLAY_CHANNEL = 'piyopiyo-wordle-display'

export function normalizeWordleWord(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\s\u3000]+/gu, '')
}

export function splitWordleWord(value) {
  return Array.from(normalizeWordleWord(value))
}

export function validateWordleWord(value) {
  const word = normalizeWordleWord(value)
  const characters = Array.from(word)
  if (characters.length !== WORDLE_LENGTH) {
    return { valid: false, word, error: `${WORDLE_LENGTH}文字で入力してください。` }
  }
  if (new Set(characters).size !== characters.length) {
    return { valid: false, word, error: '同じ文字は2回使えません。' }
  }
  return { valid: true, word, error: '' }
}

export function evaluateWordleGuess(guess, answer) {
  const guessCharacters = splitWordleWord(guess)
  const answerCharacters = splitWordleWord(answer)
  if (guessCharacters.length !== WORDLE_LENGTH || answerCharacters.length !== WORDLE_LENGTH) return []
  return guessCharacters.map((character, index) => {
    if (character === answerCharacters[index]) return 'exact'
    if (answerCharacters.includes(character)) return 'present'
    return 'absent'
  })
}

export function isWordleSolved(result) {
  return result.length === WORDLE_LENGTH && result.every(status => status === 'exact')
}

export function createWordlePublicState(state) {
  const isPlaying = state?.phase === 'play' || state?.phase === 'finished'
  return {
    schemaVersion: 1,
    phase: isPlaying ? state.phase : 'setup',
    challengerIndex: Number.isInteger(state?.challengerIndex) ? state.challengerIndex : null,
    targetIndex: Number.isInteger(state?.targetIndex) ? state.targetIndex : null,
    displayHistoryTeamIndex: Number.isInteger(state?.displayHistoryTeamIndex) ? state.displayHistoryTeamIndex : null,
    thinkingSeconds: Number.isInteger(state?.thinkingSeconds) ? Math.max(0, Math.min(30, state.thinkingSeconds)) : 30,
    thinkingRunning: Boolean(state?.thinkingRunning),
    showWinnerOverlay: state?.showWinnerOverlay !== false,
    teams: isPlaying && Array.isArray(state?.teams) ? state.teams.map(team => ({
      id: team.id,
      name: team.name,
      color: team.color,
      guesses: Array.isArray(team.guesses) ? team.guesses.map(guess => ({
        id: guess.id,
        challengerId: guess.challengerId,
        word: guess.word,
        result: Array.isArray(guess.result) ? [...guess.result] : [],
      })) : [],
      solvedBy: team.solvedBy || null,
      revealedAnswer: team.solvedBy || state.phase === 'finished' ? team.secret : '',
    })) : [],
    updatedAt: new Date().toISOString(),
  }
}
