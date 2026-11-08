export const WORDLE_LENGTH = 5

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
