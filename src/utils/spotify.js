const SPOTIFY_IFRAME_API_SRC = 'https://open.spotify.com/embed/iframe-api/v1'
const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/

let iframeApiPromise = null
let resolvedIframeApi = null

export function parseSpotifyTrack(input) {
  const value = String(input || '').trim()
  const uriMatch = value.match(/^spotify:track:([A-Za-z0-9]{22})$/)

  if (uriMatch) {
    const id = uriMatch[1]
    return {
      id,
      uri: `spotify:track:${id}`,
      url: `https://open.spotify.com/track/${id}`,
    }
  }

  let url
  try {
    url = new URL(value)
  } catch {
    return null
  }

  if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') return null

  const segments = url.pathname.split('/').filter(Boolean)
  const trackIndex = segments.indexOf('track')
  const id = trackIndex >= 0 ? segments[trackIndex + 1] : ''
  if (!SPOTIFY_ID_PATTERN.test(id)) return null

  return {
    id,
    uri: `spotify:track:${id}`,
    url: `https://open.spotify.com/track/${id}`,
  }
}

export function loadSpotifyIframeApi() {
  if (resolvedIframeApi) return Promise.resolve(resolvedIframeApi)
  if (iframeApiPromise) return iframeApiPromise

  iframeApiPromise = new Promise((resolve, reject) => {
    const previousReadyHandler = window.onSpotifyIframeApiReady
    let timeoutId

    const finish = (api) => {
      resolvedIframeApi = api
      window.clearTimeout(timeoutId)
      resolve(api)
    }

    window.onSpotifyIframeApiReady = (api) => {
      if (typeof previousReadyHandler === 'function') previousReadyHandler(api)
      finish(api)
    }

    let script = document.querySelector(`script[src="${SPOTIFY_IFRAME_API_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SPOTIFY_IFRAME_API_SRC
      script.async = true
      document.body.appendChild(script)
    }

    script.addEventListener('error', () => {
      iframeApiPromise = null
      window.clearTimeout(timeoutId)
      reject(new Error('Spotify IFrame APIを読み込めませんでした'))
    }, { once: true })

    timeoutId = window.setTimeout(() => {
      iframeApiPromise = null
      reject(new Error('Spotify IFrame APIの読み込みがタイムアウトしました'))
    }, 15000)
  })

  return iframeApiPromise
}
