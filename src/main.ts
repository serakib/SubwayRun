import "./style.css";

type GameState = "menu" | "playing" | "paused" | "gameover";
type ObjectKind = "coin" | "barrier" | "crate";

interface Player {
  lane: number;
  y: number;
  vy: number;
  jumping: boolean;
  sliding: boolean;
  slideTimer: number;
}

interface WorldObject {
  lane: number;
  z: number;
  kind: ObjectKind;
  collected?: boolean;
}

interface SaveData {
  bestScore: number;
  totalCoins: number;
  games: number;
  sound: boolean;
}

const SAVE_KEY = "runway-rush-save-v1";
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d")!;
const root = document.querySelector<HTMLDivElement>("#app")!;

const save: SaveData = loadSave();

const player: Player = {
  lane: 1,
  y: 0,
  vy: 0,
  jumping: false,
  sliding: false,
  slideTimer: 0
};

let state: GameState = "menu";
let score = 0;
let coins = 0;
let speed = 0.34;
let distance = 0;
let spawnTimer = 0;
let lastTime = performance.now();
let objects: WorldObject[] = [];
let soundOn = save.sound;

root.innerHTML = `
  <div class="game-shell">
    <header class="topbar">
      <div>
        <div class="logo">RUNWAY <span>RUSH</span></div>
        <div class="subtitle">ENDLESS RUNNER</div>
      </div>
      <button id="soundBtn" class="icon-btn" aria-label="Toggle sound">🔊</button>
    </header>

    <div class="hud">
      <div class="hud-card"><small>SCORE</small><strong id="score">0</strong></div>
      <div class="hud-card"><small>COINS</small><strong id="coins">0</strong></div>
      <div class="hud-card"><small>BEST</small><strong id="best">${save.bestScore}</strong></div>
    </div>

    <div class="canvas-wrap">
      <canvas id="game" aria-label="Runway Rush game"></canvas>

      <div id="menu" class="overlay">
        <div class="panel">
          <div class="badge">TYPEScript EDITION</div>
          <h1>Runway Rush</h1>
          <p>Switch lanes, jump obstacles and collect as many coins as possible.</p>
          <button id="startBtn" class="primary">START RUN</button>
          <div class="controls">
            <span>← → Lane</span><span>↑ Jump</span><span>↓ Slide</span>
          </div>
        </div>
      </div>

      <div id="pause" class="overlay hidden">
        <div class="panel">
          <h2>Paused</h2>
          <button id="resumeBtn" class="primary">RESUME</button>
          <button id="quitBtn" class="secondary">QUIT</button>
        </div>
      </div>

      <div id="gameover" class="overlay hidden">
        <div class="panel">
          <div class="badge danger">RUN OVER</div>
          <h2>Nice Run!</h2>
          <div class="results">
            <div><small>SCORE</small><strong id="finalScore">0</strong></div>
            <div><small>COINS</small><strong id="finalCoins">0</strong></div>
            <div><small>BEST</small><strong id="finalBest">0</strong></div>
          </div>
          <button id="againBtn" class="primary">RUN AGAIN</button>
        </div>
      </div>
    </div>

    <div class="mobile-controls">
      <button data-action="left">←</button>
      <button data-action="jump">↑</button>
      <button data-action="slide">↓</button>
      <button data-action="right">→</button>
    </div>

    <footer>
      <span>Local progress • No backend</span>
      <button id="resetBtn">Reset local data</button>
    </footer>
  </div>
`;

const gameCanvas = document.querySelector<HTMLCanvasElement>("#game")!;
const g = gameCanvas.getContext("2d")!;

const scoreEl = document.querySelector("#score")!;
const coinsEl = document.querySelector("#coins")!;
const bestEl = document.querySelector("#best")!;
const menu = document.querySelector("#menu")!;
const pause = document.querySelector("#pause")!;
const gameover = document.querySelector("#gameover")!;

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { bestScore: 0, totalCoins: 0, games: 0, sound: true };
    const data = JSON.parse(raw) as Partial<SaveData>;
    return {
      bestScore: Number.isFinite(data.bestScore) ? Math.max(0, data.bestScore!) : 0,
      totalCoins: Number.isFinite(data.totalCoins) ? Math.max(0, data.totalCoins!) : 0,
      games: Number.isFinite(data.games) ? Math.max(0, data.games!) : 0,
      sound: data.sound !== false
    };
  } catch {
    return { bestScore: 0, totalCoins: 0, games: 0, sound: true };
  }
}

function persist() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

function resize() {
  const rect = gameCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  gameCanvas.width = Math.max(320, Math.floor(rect.width * dpr));
  gameCanvas.height = Math.max(420, Math.floor(rect.height * dpr));
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

function startGame() {
  state = "playing";
  score = 0;
  coins = 0;
  speed = 0.34;
  distance = 0;
  spawnTimer = 0;
  objects = [];
  player.lane = 1;
  player.y = 0;
  player.vy = 0;
  player.jumping = false;
  player.sliding = false;
  player.slideTimer = 0;
  save.games++;
  persist();
  menu.classList.add("hidden");
  gameover.classList.add("hidden");
  pause.classList.add("hidden");
}

function endGame() {
  if (state !== "playing") return;
  state = "gameover";
  score = Math.floor(score);
  save.bestScore = Math.max(save.bestScore, score);
  save.totalCoins += coins;
  persist();
  (document.querySelector("#finalScore") as HTMLElement).textContent = String(score);
  (document.querySelector("#finalCoins") as HTMLElement).textContent = String(coins);
  (document.querySelector("#finalBest") as HTMLElement).textContent = String(save.bestScore);
  bestEl.textContent = String(save.bestScore);
  gameover.classList.remove("hidden");
  beep(110, 0.12);
}

function move(dir: -1 | 1) {
  if (state !== "playing") return;
  player.lane = Math.max(0, Math.min(2, player.lane + dir));
}

function jump() {
  if (state !== "playing" || player.jumping) return;
  player.jumping = true;
  player.sliding = false;
  player.vy = 1.18;
  beep(520, 0.045);
}

function slide() {
  if (state !== "playing" || player.jumping) return;
  player.sliding = true;
  player.slideTimer = 0.48;
}

function togglePause() {
  if (state === "playing") {
    state = "paused";
    pause.classList.remove("hidden");
  } else if (state === "paused") {
    state = "playing";
    pause.classList.add("hidden");
    lastTime = performance.now();
  }
}

function spawn() {
  const lane = Math.floor(Math.random() * 3);
  const roll = Math.random();

  if (roll < 0.52) {
    objects.push({ lane, z: 1.05, kind: "coin" });
  } else if (roll < 0.84) {
    objects.push({ lane, z: 1.05, kind: "barrier" });
  } else {
    objects.push({ lane, z: 1.05, kind: "crate" });
  }

  if (Math.random() < 0.28) {
    const second = (lane + (Math.random() < 0.5 ? 1 : 2)) % 3;
    objects.push({ lane: second, z: 1.24, kind: "coin" });
  }
}

function update(dt: number) {
  if (state !== "playing") return;

  distance += speed * dt;
  score += speed * dt * 110;
  speed = Math.min(0.72, speed + dt * 0.0035);

  player.y += player.vy * dt * 2.7;
  player.vy -= 2.65 * dt;
  if (player.y <= 0) {
    player.y = 0;
    player.vy = 0;
    player.jumping = false;
  }

  if (player.sliding) {
    player.slideTimer -= dt;
    if (player.slideTimer <= 0) player.sliding = false;
  }

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawn();
    spawnTimer = Math.max(0.38, 0.92 - speed * 0.45);
  }

  for (const obj of objects) {
    obj.z -= speed * dt;
    if (obj.z < 0.075 && !obj.collected && obj.lane === player.lane) {
      if (obj.kind === "coin") {
        obj.collected = true;
        coins++;
        score += 80;
        beep(760, 0.035);
      } else if (obj.z > 0.015) {
        const safeJump = player.y > 0.25;
        const safeSlide = player.sliding;
        if (!safeJump && !safeSlide) {
          endGame();
          return;
        }
      }
    }
  }

  objects = objects.filter(o => o.z > -0.08 && !o.collected);
  scoreEl.textContent = String(Math.floor(score));
  coinsEl.textContent = String(coins);
}

function roadGeometry(w: number, h: number) {
  const horizon = h * 0.27;
  const bottom = h * 1.02;
  const center = w / 2;
  const topHalf = w * 0.11;
  const bottomHalf = w * 0.49;
  return { horizon, bottom, center, topHalf, bottomHalf };
}

function laneX(lane: number, z: number, w: number, h: number) {
  const { center, topHalf, bottomHalf } = roadGeometry(w, h);
  const t = Math.max(0, Math.min(1, 1 - z));
  const half = topHalf + (bottomHalf - topHalf) * t;
  return center + (lane - 1) * half * 0.58;
}

function draw() {
  const w = gameCanvas.clientWidth;
  const h = gameCanvas.clientHeight;
  g.clearRect(0, 0, w, h);

  // Sky
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#071326");
  sky.addColorStop(0.55, "#18385a");
  sky.addColorStop(1, "#d27d43");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  // Sun
  g.beginPath();
  g.arc(w * 0.78, h * 0.18, Math.min(w, h) * 0.075, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,220,145,.82)";
  g.fill();

  const { horizon, bottom, center, topHalf, bottomHalf } = roadGeometry(w, h);

  // Distant city
  g.fillStyle = "#0b2030";
  for (let i = 0; i < 18; i++) {
    const bw = w / 18;
    const bh = 15 + ((i * 37) % 48);
    g.fillRect(i * bw, horizon - bh, bw - 2, bh);
  }

  // Road
  g.beginPath();
  g.moveTo(center - topHalf, horizon);
  g.lineTo(center + topHalf, horizon);
  g.lineTo(center + bottomHalf, bottom);
  g.lineTo(center - bottomHalf, bottom);
  g.closePath();
  g.fillStyle = "#252b34";
  g.fill();

  // Road edge
  g.strokeStyle = "#f3c96a";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(center - topHalf, horizon);
  g.lineTo(center - bottomHalf, bottom);
  g.moveTo(center + topHalf, horizon);
  g.lineTo(center + bottomHalf, bottom);
  g.stroke();

  // Lane lines
  for (let lane = 0; lane < 2; lane++) {
    g.strokeStyle = "rgba(255,255,255,.45)";
    g.lineWidth = 2;
    g.setLineDash([18, 18]);
    const xTop = center + (lane === 0 ? -topHalf * 0.33 : topHalf * 0.33);
    const xBottom = center + (lane === 0 ? -bottomHalf * 0.33 : bottomHalf * 0.33);
    g.beginPath();
    g.moveTo(xTop, horizon);
    g.lineTo(xBottom, bottom);
    g.stroke();
    g.setLineDash([]);
  }

  // Moving road stripes
  for (let i = 0; i < 12; i++) {
    const z = ((i / 12 + distance * 0.8) % 1);
    const y = horizon + Math.pow(z, 1.7) * (bottom - horizon);
    const half = topHalf + (bottomHalf - topHalf) * z;
    const stripeW = Math.max(2, half * 0.018);
    g.fillStyle = "rgba(255,255,255,.72)";
    g.fillRect(center - stripeW / 2, y, stripeW, 4 + z * 9);
  }

  // Objects, far to near
  const sorted = [...objects].sort((a, b) => b.z - a.z);
  for (const obj of sorted) drawObject(obj, w, h);

  drawPlayer(w, h);

  if (state === "playing") {
    scoreEl.textContent = String(Math.floor(score));
    coinsEl.textContent = String(coins);
  }
}

function drawObject(obj: WorldObject, w: number, h: number) {
  const t = Math.max(0, Math.min(1, 1 - obj.z));
  const y = roadGeometry(w, h).horizon + Math.pow(t, 1.7) * (h * 0.76);
  const scale = 0.2 + t * 1.05;
  const x = laneX(obj.lane, obj.z, w, h);

  if (obj.kind === "coin") {
    const r = 8 + 14 * scale;
    g.beginPath();
    g.arc(x, y - r * 0.6, r, 0, Math.PI * 2);
    g.fillStyle = "#ffd54a";
    g.fill();
    g.strokeStyle = "#fff1a6";
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = "#9c6410";
    g.font = `${Math.max(10, r)}px system-ui`;
    g.textAlign = "center";
    g.fillText("$", x, y - r * 0.6 + r * 0.34);
  } else {
    const width = 34 + 42 * scale;
    const height = obj.kind === "crate" ? 34 + 42 * scale : 24 + 25 * scale;
    g.fillStyle = obj.kind === "crate" ? "#b96b38" : "#e24848";
    g.fillRect(x - width / 2, y - height, width, height);
    g.strokeStyle = "rgba(255,255,255,.4)";
    g.lineWidth = 2;
    g.strokeRect(x - width / 2, y - height, width, height);
    if (obj.kind === "barrier") {
      g.fillStyle = "#fff0a6";
      g.fillRect(x - width / 2, y - height * 0.58, width, Math.max(4, height * 0.14));
    } else {
      g.strokeStyle = "rgba(50,20,10,.5)";
      g.beginPath();
      g.moveTo(x - width * .35, y - height * .8);
      g.lineTo(x + width * .35, y - height * .2);
      g.moveTo(x + width * .35, y - height * .8);
      g.lineTo(x - width * .35, y - height * .2);
      g.stroke();
    }
  }
}

function drawPlayer(w: number, h: number) {
  const x = laneX(player.lane, 0.02, w, h);
  const ground = h * 0.88;
  const jumpY = player.y * h * 0.18;
  const sliding = player.sliding;
  const bodyW = sliding ? 54 : 38;
  const bodyH = sliding ? 30 : 62;

  // Shadow
  g.beginPath();
  g.ellipse(x, ground + 4, 32 - player.y * 12, 8, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(0,0,0,.35)";
  g.fill();

  // Body
  g.fillStyle = "#43d7ff";
  g.fillRect(x - bodyW / 2, ground - bodyH - jumpY, bodyW, bodyH);

  // Head
  if (!sliding) {
    g.beginPath();
    g.arc(x, ground - bodyH - 15 - jumpY, 15, 0, Math.PI * 2);
    g.fillStyle = "#ffd0aa";
    g.fill();
    g.fillStyle = "#172033";
    g.fillRect(x - 15, ground - bodyH - 21 - jumpY, 30, 8);
  }

  // Shoes
  g.fillStyle = "#f4f7fb";
  g.fillRect(x - 20, ground - 5 - jumpY, 16, 8);
  g.fillRect(x + 4, ground - 5 - jumpY, 16, 8);
}

function beep(freq: number, duration: number) {
  if (!soundOn) return;
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const audio = new AudioCtx();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + duration);
  } catch { /* audio is optional */ }
}

function loop(now: number) {
  const dt = Math.min(0.04, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

document.querySelector("#startBtn")!.addEventListener("click", startGame);
document.querySelector("#againBtn")!.addEventListener("click", startGame);
document.querySelector("#resumeBtn")!.addEventListener("click", togglePause);
document.querySelector("#quitBtn")!.addEventListener("click", () => {
  state = "menu";
  pause.classList.add("hidden");
  menu.classList.remove("hidden");
});
document.querySelector("#soundBtn")!.addEventListener("click", () => {
  soundOn = !soundOn;
  save.sound = soundOn;
  persist();
  document.querySelector("#soundBtn")!.textContent = soundOn ? "🔊" : "🔇";
});
document.querySelector("#resetBtn")!.addEventListener("click", () => {
  localStorage.removeItem(SAVE_KEY);
  location.reload();
});

document.querySelectorAll<HTMLButtonElement>("[data-action]").forEach(btn => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    if (action === "left") move(-1);
    if (action === "right") move(1);
    if (action === "jump") jump();
    if (action === "slide") slide();
  });
});

window.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") move(-1);
  else if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") move(1);
  else if (e.key === "ArrowUp" || e.key.toLowerCase() === "w" || e.code === "Space") {
    e.preventDefault();
    jump();
  } else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") slide();
  else if (e.key === "Escape" || e.key.toLowerCase() === "p") togglePause();
});

let touchStartX = 0;
let touchStartY = 0;
gameCanvas.addEventListener("touchstart", e => {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

gameCanvas.addEventListener("touchend", e => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
  else if (dy < 0) jump();
  else slide();
}, { passive: true });

document.querySelector("#soundBtn")!.textContent = soundOn ? "🔊" : "🔇";
