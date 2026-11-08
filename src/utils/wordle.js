export const WORDLE_LENGTH = 5
export const WORDLE_DISPLAY_STORAGE_KEY = 'piyopiyo_wordle_display_v1'
export const WORDLE_DISPLAY_CHANNEL = 'piyopiyo-wordle-display'
export const WORDLE_KANA_GROUPS = [
  { label: '清音', characters: Array.from('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん') },
  { label: '濁音', characters: Array.from('がぎぐげござじずぜぞだぢづでどばびぶべぼゔ') },
  { label: '半濁音', characters: Array.from('ぱぴぷぺぽ') },
  { label: '小書き・長音', characters: Array.from('ぁぃぅぇぉゃゅょっゎー') },
]

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

export function validateWordleGuess(value) {
  const word = normalizeWordleWord(value)
  const characters = Array.from(word)
  if (characters.length !== WORDLE_LENGTH) {
    return { valid: false, word, error: `${WORDLE_LENGTH}文字で入力してください。` }
  }
  return { valid: true, word, error: '' }
}

export function evaluateWordleGuess(guess, answer) {
  const guessCharacters = splitWordleWord(guess)
  const answerCharacters = splitWordleWord(answer)
  if (guessCharacters.length !== WORDLE_LENGTH || answerCharacters.length !== WORDLE_LENGTH) return []
  const result = Array(WORDLE_LENGTH).fill('absent')
  const remaining = new Map()
  guessCharacters.forEach((character, index) => {
    if (character === answerCharacters[index]) result[index] = 'exact'
    else remaining.set(answerCharacters[index], (remaining.get(answerCharacters[index]) || 0) + 1)
  })
  guessCharacters.forEach((character, index) => {
    if (result[index] === 'exact') return
    const count = remaining.get(character) || 0
    if (count > 0) {
      result[index] = 'present'
      remaining.set(character, count - 1)
    }
  })
  return result
}

export function isWordleSolved(result) {
  return result.length === WORDLE_LENGTH && result.every(status => status === 'exact')
}

export function getUnusedWordleKana(guesses) {
  const used = new Set()
  for (const guess of guesses || []) {
    const word = typeof guess === 'string' ? guess : guess?.word
    for (const character of splitWordleWord(word)) used.add(toHiraganaForGuide(character))
  }
  return WORDLE_KANA_GROUPS.map(group => ({
    label: group.label,
    characters: group.characters.filter(character => !used.has(character)),
  }))
}

function toHiraganaForGuide(character) {
  const code = character.codePointAt(0)
  return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : character
}

export function createWordlePublicState(state) {
  const isPlaying = state?.phase === 'play' || state?.phase === 'finished'
  return {
    schemaVersion: 1,
    phase: isPlaying ? state.phase : 'setup',
    challengerIndex: Number.isInteger(state?.challengerIndex) ? state.challengerIndex : null,
    targetIndex: Number.isInteger(state?.targetIndex) ? state.targetIndex : null,
    displayHistoryTeamIndex: Number.isInteger(state?.displayHistoryTeamIndex) ? state.displayHistoryTeamIndex : null,
    displayKanaTeamIndex: Number.isInteger(state?.displayKanaTeamIndex) ? state.displayKanaTeamIndex : null,
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
      revealedAnswer: team.solvedBy || team.answerRevealed ? team.secret : '',
    })) : [],
    updatedAt: new Date().toISOString(),
  }
}
