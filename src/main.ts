import { SnakeGame, type Direction } from './game'

// ---- Elements ----
const startScreen = document.getElementById('start-screen')!
const gameScreen = document.getElementById('game-screen')!
const gameoverScreen = document.getElementById('gameover-screen')!
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement
const scoreDisplay = document.getElementById('score-display')!
const hudHighscore = document.getElementById('hud-highscore')!
const startHighscore = document.getElementById('start-highscore')!
const finalScore = document.getElementById('final-score')!
const finalHighscore = document.getElementById('final-highscore')!
const startBtn = document.getElementById('start-btn')!
const restartBtn = document.getElementById('restart-btn')!

// ---- Game ----
const game = new SnakeGame(
  canvas,
  (score) => {
    scoreDisplay.textContent = String(score)
  },
  (state, score, hs) => {
    if (state === 'gameover') {
      finalScore.textContent = String(score)
      finalHighscore.textContent = String(hs)
      showScreen('gameover')
      releaseWakeLock()
    }
  }
)

// ---- Screen management ----
function showScreen(name: 'start' | 'game' | 'gameover') {
  startScreen.classList.toggle('active', name === 'start')
  gameScreen.classList.toggle('active', name === 'game')
  gameoverScreen.classList.toggle('active', name === 'gameover')
}

function updateStartHighscore() {
  const hs = game.getHighScore()
  startHighscore.textContent = hs > 0 ? `BEST: ${hs}` : ''
}

// ---- Start / Restart ----
function startGame() {
  scoreDisplay.textContent = '0'
  hudHighscore.textContent = `BEST: ${game.getHighScore()}`
  showScreen('game')
  game.start()
  requestWakeLock()
}

startBtn.addEventListener('click', () => {
  updateStartHighscore()
  startGame()
})
restartBtn.addEventListener('click', startGame)

// Show start screen initially
updateStartHighscore()
showScreen('start')

// ---- Keyboard ----
const keyMap: Record<string, Direction> = {
  ArrowUp: 'UP', w: 'UP', W: 'UP',
  ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
  ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
  ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
}
document.addEventListener('keydown', (e) => {
  const dir = keyMap[e.key]
  if (dir) {
    e.preventDefault()
    game.setDirection(dir)
  }
  if ((e.key === ' ' || e.key === 'Enter') && game.getState() === 'start') {
    startGame()
  }
})

// ---- Touch / Swipe ----
const SWIPE_THRESHOLD = 30
let touchStartX = 0
let touchStartY = 0

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault()
  touchStartX = e.changedTouches[0].clientX
  touchStartY = e.changedTouches[0].clientY
}, { passive: false })

canvas.addEventListener('touchend', (e) => {
  e.preventDefault()
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return
  if (Math.abs(dx) > Math.abs(dy)) {
    game.setDirection(dx > 0 ? 'RIGHT' : 'LEFT')
  } else {
    game.setDirection(dy > 0 ? 'DOWN' : 'UP')
  }
}, { passive: false })

// ---- D-pad ----
const dpadMap: Record<string, Direction> = {
  'dpad-up': 'UP',
  'dpad-down': 'DOWN',
  'dpad-left': 'LEFT',
  'dpad-right': 'RIGHT',
}
for (const [id, dir] of Object.entries(dpadMap)) {
  document.getElementById(id)?.addEventListener('touchstart', (e) => {
    e.preventDefault()
    game.setDirection(dir)
  }, { passive: false })
  document.getElementById(id)?.addEventListener('click', () => {
    game.setDirection(dir)
  })
}

// ---- Resize ----
window.addEventListener('resize', () => game.resize())

// ---- Wake Lock ----
let wakeLock: WakeLockSentinel | null = null

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen')
    }
  } catch { /* ignore */ }
}

function releaseWakeLock() {
  wakeLock?.release().catch(() => {})
  wakeLock = null
}

// re-acquire on visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && game.getState() === 'playing') {
    requestWakeLock()
  }
})
