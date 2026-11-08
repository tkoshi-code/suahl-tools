export function findBoardRushWinner(scores, targetPoints) {
  const normalizedScores = scores.map(value => Math.max(0, Number(value) || 0))
  if (normalizedScores.length !== 2) return null
  const difference = Math.abs(normalizedScores[0] - normalizedScores[1])
  const topScore = Math.max(...normalizedScores)
  if (topScore < targetPoints || difference < 2) return null
  return normalizedScores[0] > normalizedScores[1] ? 0 : 1
}

export function isBoardRushDeuce(scores, targetPoints) {
  const normalizedScores = scores.map(value => Math.max(0, Number(value) || 0))
  if (normalizedScores.length !== 2) return false
  return Math.min(...normalizedScores) >= targetPoints - 1
    && Math.abs(normalizedScores[0] - normalizedScores[1]) < 2
}
