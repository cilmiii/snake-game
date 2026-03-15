// ---- Types ----
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
export type GameState = 'start' | 'playing' | 'gameover'

interface Point { x: number; y: number }

// ---- Constants ----
const CELL = 20          // grid cell size in px
const BASE_INTERVAL = 150 // ms per tick at score 0
const MIN_INTERVAL = 60   // fastest tick

// ---- Neon colors ----
const COLOR_BG = '#0a0a0a'
const COLOR_GRID = '#111111'
const COLOR_SNAKE_HEAD = '#39ff14'
const COLOR_SNAKE_BODY = '#1db81d'
const COLOR_FOOD = '#ff3939'
const COLOR_FOOD_GLOW = 'rgba(255,57,57,0.3)'

// ---- Game Class ----
export class SnakeGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private dpr: number

  // logical grid dims
  private cols = 0
  private rows = 0

  private snake: Point[] = []
  private dir: Direction = 'RIGHT'
  private nextDir: Direction = 'RIGHT'
  private food: Point = { x: 0, y: 0 }
  private score = 0
  private highScore = 0

  private state: GameState = 'start'
  private lastTick = 0
  private rafId = 0

  private onScoreChange: (s: number) => void
  private onStateChange: (s: GameState, score: number, hs: number) => void

  constructor(
    canvas: HTMLCanvasElement,
    onScoreChange: (s: number) => void,
    onStateChange: (s: GameState, score: number, hs: number) => void
  ) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.dpr = Math.round(window.devicePixelRatio || 1)
    this.onScoreChange = onScoreChange
    this.onStateChange = onStateChange
    this.highScore = parseInt(localStorage.getItem('snakeHS') || '0', 10)
    this.resize()
  }

  resize() {
    const w = window.innerWidth
    const h = window.innerHeight
    this.cols = Math.floor(w / CELL)
    this.rows = Math.floor(h / CELL)
    // css size
    this.canvas.style.width = w + 'px'
    this.canvas.style.height = h + 'px'
    // pixel size
    this.canvas.width = w * this.dpr
    this.canvas.height = h * this.dpr
    this.ctx.scale(this.dpr, this.dpr)
    if (this.state === 'playing') this.drawFrame()
  }

  start() {
    this.score = 0
    const midX = Math.floor(this.cols / 2)
    const midY = Math.floor(this.rows / 2)
    this.snake = [
      { x: midX, y: midY },
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
    ]
    this.dir = 'RIGHT'
    this.nextDir = 'RIGHT'
    this.placeFood()
    this.state = 'playing'
    this.lastTick = performance.now()
    cancelAnimationFrame(this.rafId)
    this.loop(performance.now())
  }

  private tickInterval(): number {
    return Math.max(MIN_INTERVAL, BASE_INTERVAL - this.score * 2)
  }

  private loop = (now: number) => {
    this.rafId = requestAnimationFrame(this.loop)
    const elapsed = now - this.lastTick
    if (elapsed < this.tickInterval()) {
      return // don't draw mid-tick; only draw on tick
    }
    this.lastTick = now - (elapsed % this.tickInterval())
    this.tick()
    this.drawFrame()
  }

  private tick() {
    this.dir = this.nextDir
    const head = this.snake[0]
    const newHead: Point = { x: head.x, y: head.y }
    if (this.dir === 'UP') newHead.y--
    else if (this.dir === 'DOWN') newHead.y++
    else if (this.dir === 'LEFT') newHead.x--
    else newHead.x++

    // wall collision
    if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
      return this.endGame()
    }
    // self collision
    if (this.snake.some(p => p.x === newHead.x && p.y === newHead.y)) {
      return this.endGame()
    }

    this.snake.unshift(newHead)

    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++
      if (this.score > this.highScore) {
        this.highScore = this.score
        localStorage.setItem('snakeHS', String(this.highScore))
      }
      this.onScoreChange(this.score)
      this.placeFood()
    } else {
      this.snake.pop()
    }
  }

  private endGame() {
    cancelAnimationFrame(this.rafId)
    this.state = 'gameover'
    this.onStateChange('gameover', this.score, this.highScore)
  }

  private placeFood() {
    const empties: Point[] = []
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!this.snake.some(p => p.x === x && p.y === y)) {
          empties.push({ x, y })
        }
      }
    }
    this.food = empties[Math.floor(Math.random() * empties.length)]
  }

  // ---- Drawing ----
  private drawFrame() {
    const ctx = this.ctx
    const w = window.innerWidth
    const h = window.innerHeight

    // Background
    ctx.fillStyle = COLOR_BG
    ctx.fillRect(0, 0, w, h)

    // Subtle grid
    ctx.strokeStyle = COLOR_GRID
    ctx.lineWidth = 0.5
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL, 0)
      ctx.lineTo(x * CELL, h)
      ctx.stroke()
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL)
      ctx.lineTo(w, y * CELL)
      ctx.stroke()
    }

    // Food glow
    const fx = (this.food.x + 0.5) * CELL
    const fy = (this.food.y + 0.5) * CELL
    const grd = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL)
    grd.addColorStop(0, COLOR_FOOD_GLOW)
    grd.addColorStop(1, 'transparent')
    ctx.fillStyle = grd
    ctx.fillRect(this.food.x * CELL - CELL, this.food.y * CELL - CELL, CELL * 3, CELL * 3)

    // Food
    ctx.fillStyle = COLOR_FOOD
    ctx.shadowColor = COLOR_FOOD
    ctx.shadowBlur = 12
    ctx.fillRect(
      Math.round(this.food.x * CELL) + 3,
      Math.round(this.food.y * CELL) + 3,
      CELL - 6, CELL - 6
    )
    ctx.shadowBlur = 0

    // Snake body (batch)
    ctx.fillStyle = COLOR_SNAKE_BODY
    for (let i = 1; i < this.snake.length; i++) {
      const p = this.snake[i]
      ctx.fillRect(Math.round(p.x * CELL) + 1, Math.round(p.y * CELL) + 1, CELL - 2, CELL - 2)
    }

    // Snake head
    if (this.snake.length > 0) {
      const h0 = this.snake[0]
      ctx.fillStyle = COLOR_SNAKE_HEAD
      ctx.shadowColor = COLOR_SNAKE_HEAD
      ctx.shadowBlur = 16
      ctx.fillRect(Math.round(h0.x * CELL) + 1, Math.round(h0.y * CELL) + 1, CELL - 2, CELL - 2)
      ctx.shadowBlur = 0
    }
  }

  setDirection(d: Direction) {
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT'
    }
    if (d !== opposites[this.dir]) {
      this.nextDir = d
    }
  }

  getHighScore() { return this.highScore }
  getState() { return this.state }
}
