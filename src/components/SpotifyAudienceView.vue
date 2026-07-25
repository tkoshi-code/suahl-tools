<template>
  <div class="audience">
    <header class="audience__header">
      <span class="audience__brand">SPOTIFY INTRO QUIZ</span>
      <span class="audience__connection" :class="{ 'audience__connection--live': connected }">
        {{ connected ? '接続中' : '接続待ち' }}
      </span>
    </header>

    <main class="audience__main" aria-live="polite">
      <template v-if="state.phase === 'answer'">
        <div class="audience__eyebrow">ANSWER</div>
        <h1 class="audience__answer">{{ state.answer }}</h1>
      </template>

      <template v-else-if="state.phase === 'playing'">
        <div class="audience__eyebrow">NOW PLAYING</div>
        <div class="audience__countdown">{{ state.remaining }}</div>
        <div class="audience__unit">seconds</div>
      </template>

      <template v-else-if="state.phase === 'waiting'">
        <div class="audience__mark">?</div>
        <h1 class="audience__prompt">回答をどうぞ</h1>
      </template>

      <template v-else-if="state.phase === 'ready'">
        <div class="audience__mark">♪</div>
        <h1 class="audience__prompt">イントロクイズ</h1>
        <p class="audience__sub">まもなく再生します</p>
      </template>

      <template v-else>
        <div class="audience__mark">♪</div>
        <h1 class="audience__prompt">イントロクイズ</h1>
        <p class="audience__sub">QMの操作をお待ちください</p>
      </template>
    </main>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'

const CHANNEL_NAME = 'piyopiyo_spotify_intro_channel_v1'
const connected = ref(false)
const state = reactive({
  phase: 'idle',
  remaining: 0,
  answer: '',
})

let channel = null
let connectionTimer = null

onMounted(() => {
  if (!('BroadcastChannel' in window)) return

  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event) => {
    const message = event.data
    if (!message || message.type !== 'state') return

    connected.value = true
    state.phase = message.phase || 'idle'
    state.remaining = Number(message.remaining) || 0
    state.answer = message.phase === 'answer' ? String(message.answer || '') : ''

    window.clearTimeout(connectionTimer)
    connectionTimer = window.setTimeout(() => {
      connected.value = false
    }, 5000)
  }

  channel.postMessage({ type: 'request-state' })
})

onUnmounted(() => {
  window.clearTimeout(connectionTimer)
  channel?.close()
})
</script>

<style scoped>
.audience {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  background: #09110b;
  color: #f5f7f5;
}

.audience__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 32px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}

.audience__brand {
  color: #1ed760;
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.audience__connection {
  color: #607d68;
  font-size: 0.75rem;
}

.audience__connection--live {
  color: #a5d6b2;
}

.audience__main {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 32px;
  text-align: center;
}

.audience__eyebrow {
  margin-bottom: 20px;
  color: #1ed760;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.15em;
}

.audience__countdown {
  font-size: clamp(7rem, 28vh, 16rem);
  font-weight: 900;
  line-height: 0.85;
  color: #f5f7f5;
  font-variant-numeric: tabular-nums;
}

.audience__unit {
  margin-top: 24px;
  color: #789080;
  font-size: 1rem;
  letter-spacing: 0.08em;
}

.audience__mark {
  width: 128px;
  height: 128px;
  display: grid;
  place-items: center;
  margin-bottom: 28px;
  border: 2px solid #1ed760;
  border-radius: 50%;
  color: #1ed760;
  font-size: 4rem;
  font-weight: 800;
}

.audience__prompt {
  margin: 0;
  font-size: clamp(2.5rem, 8vw, 6rem);
  line-height: 1.15;
}

.audience__sub {
  margin: 18px 0 0;
  color: #789080;
  font-size: 1.2rem;
}

.audience__answer {
  max-width: 1100px;
  margin: 0;
  overflow-wrap: anywhere;
  color: #ffd740;
  font-size: clamp(2.8rem, 8vw, 6.5rem);
  line-height: 1.2;
}

@media (max-width: 600px) {
  .audience__header {
    padding: 16px 18px;
  }

  .audience__main {
    padding: 24px 18px;
  }

  .audience__mark {
    width: 96px;
    height: 96px;
    font-size: 3rem;
  }
}
</style>
