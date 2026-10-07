import type { GameCanvasProps } from "@/lib/types";

export type AsteroidsCallbacks = Omit<GameCanvasProps, "paused">;

export interface AsteroidsHandle {
  setPaused: (paused: boolean) => void;
  destroy: () => void;
}

// ── Constantes ────────────────────────────────────────────────────────────────
const W = 800;
const H = 600;

const POWERUP_DROP_CHANCE = 0.15;
const POWERUP_DURATION = 5;
const POWERUP_TTL = 12;
const TRIPLE_SPREAD = 0.18;

const RADII = [0, 16, 30, 50]; // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32]; // velocidad base por tamaño
const POINTS = [0, 100, 50, 20]; // puntos por tamaño

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap = (v: number, max: number) => ((v % max) + max) % max;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

type Keys = Record<string, boolean | undefined>;

// ── Tema (colores neón de la plataforma) ──────────────────────────────────────
interface Theme {
  ship: string;
  asteroid: string;
  bullet: string;
  powerUp: string;
  particle: string;
  flame: string;
}

const readTheme = (el: HTMLElement): Theme => {
  const style = getComputedStyle(el);
  const v = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    ship: v("--cyan", "#00f5ff"),
    asteroid: v("--ink", "#e6e9ff"),
    bullet: v("--ink", "#e6e9ff"),
    powerUp: v("--yellow", "#f5ff00"),
    particle: v("--magenta", "#ff006e"),
    flame: v("--yellow", "#f5ff00"),
  };
};

const glow = (ctx: CanvasRenderingContext2D, color: string, blur: number) => {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
};

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ttl = 1.1;
  radius = 2;
  dead = false;

  constructor(x: number, y: number, angle: number) {
    const SPEED = 520;
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    ctx.fillStyle = theme.bullet;
    glow(ctx, theme.bullet, 8);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
class Asteroid {
  x: number;
  y: number;
  size: number;
  radius: number;
  dead = false;
  vx: number;
  vy: number;
  rotSpeed: number;
  rot: number;
  verts: [number, number][] = [];

  constructor(x: number, y: number, size = 3) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.radius = RADII[size];

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split(): Asteroid[] {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = theme.asteroid;
    glow(ctx, theme.asteroid, 10);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp ───────────────────────────────────────────────────────────────────
class PowerUp {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius = 12;
  ttl = POWERUP_TTL;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 40);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(dt: number) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    if (this.ttl < 2 && Math.floor(this.ttl * 8) % 2 === 0) return;
    const pulse = 0.85 + Math.sin(performance.now() / 150) * 0.15;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = theme.powerUp;
    glow(ctx, theme.powerUp, 14);
    ctx.lineWidth = 2;
    const r = this.radius * pulse;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = theme.powerUp;
    glow(ctx, theme.powerUp, 8);
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("3x", this.x, this.y);
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  x = W / 2;
  y = H / 2;
  angle = -Math.PI / 2;
  vx = 0;
  vy = 0;
  radius = 12;
  thrusting = false;
  invincible = 3;
  shootCooldown = 0;
  dead = false;
  tripleShot = 0;

  reset() {
    this.x = W / 2;
    this.y = H / 2;
    this.angle = -Math.PI / 2;
    this.vx = 0;
    this.vy = 0;
    this.radius = 12;
    this.thrusting = false;
    this.invincible = 3;
    this.shootCooldown = 0;
    this.dead = false;
  }

  update(dt: number, keys: Keys) {
    if (this.dead) return;
    if (this.invincible > 0) this.invincible -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.tripleShot > 0) this.tripleShot -= dt;

    const ROT = 3.5; // rad/s
    const THRUST = 260; // px/s²
    const DRAG = 0.987;

    if (keys["ArrowLeft"]) this.angle -= ROT * dt;
    if (keys["ArrowRight"]) this.angle += ROT * dt;

    this.thrusting = !!keys["ArrowUp"];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot(): Bullet[] {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    if (this.tripleShot > 0) {
      return [
        new Bullet(ox, oy, this.angle - TRIPLE_SPREAD),
        new Bullet(ox, oy, this.angle),
        new Bullet(ox, oy, this.angle + TRIPLE_SPREAD),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0)
      return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = theme.ship;
    glow(ctx, theme.ship, 14);
    ctx.lineWidth = 1.5;
    ctx.lineJoin = "round";

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo(20, 0); // nariz
    ctx.lineTo(-12, -9); // ala izquierda
    ctx.lineTo(-7, 0); // muesca trasera
    ctx.lineTo(-12, 9); // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8, 4);
      ctx.strokeStyle = theme.flame;
      glow(ctx, theme.flame, 12);
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ttl: number;
  dead = false;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl = this.life;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D, theme: Theme) {
    const alpha = this.ttl / this.life;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = theme.particle;
    glow(ctx, theme.particle, 6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

// ── Motor ─────────────────────────────────────────────────────────────────────
type State = "playing" | "dead" | "gameover";

export const createAsteroids = (
  canvas: HTMLCanvasElement,
  callbacks: AsteroidsCallbacks,
): AsteroidsHandle => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return { setPaused: () => {}, destroy: () => {} };
  const theme = readTheme(canvas);

  // Buffer HiDPI: lógica fija 800×600, buffer escalado por devicePixelRatio
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  // Input
  const keys: Keys = {};
  const justPressed: Keys = {};
  const pressed = (code: string) => {
    const val = justPressed[code];
    justPressed[code] = false;
    return !!val;
  };

  // Estado
  const ship = new Ship();
  let bullets: Bullet[] = [];
  let asteroids: Asteroid[] = [];
  let particles: Particle[] = [];
  let powerUps: PowerUp[] = [];
  let powerUpSpawned = false;
  let killsSinceSpawn = 0;
  let score = 0;
  let lives = 3;
  let level = 1;
  let state: State = "playing";
  let deadTimer = 0;
  let paused = false;
  let destroyed = false;
  let rafId = 0;
  let lastTime: number | null = null;

  // Emisión solo cuando el valor cambia
  const emitScore = (v: number) => {
    score = v;
    callbacks.onScore(score);
  };
  const emitLives = (v: number) => {
    lives = v;
    callbacks.onLives(lives);
  };
  const emitLevel = (v: number) => {
    level = v;
    callbacks.onLevel(level);
  };

  const spawnAsteroids = (count: number) => {
    const SAFE_DIST = 130;
    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      do {
        x = rand(0, W);
        y = rand(0, H);
      } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
      asteroids.push(new Asteroid(x, y, 3));
    }
  };

  const nextLevel = () => {
    emitLevel(level + 1);
    bullets = [];
    particles = [];
    powerUps = [];
    powerUpSpawned = false;
    killsSinceSpawn = 0;
    ship.reset();
    spawnAsteroids(3 + level);
  };

  const explode = (x: number, y: number, count = 8) => {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
  };

  const killShip = () => {
    explode(ship.x, ship.y, 14);
    ship.dead = true;
    emitLives(lives - 1);
    if (lives <= 0) {
      state = "gameover";
      callbacks.onGameOver(score);
    } else {
      state = "dead";
      deadTimer = 2;
    }
  };

  const updateParticles = (dt: number) => {
    particles.forEach((p) => p.update(dt));
    particles = particles.filter((p) => !p.dead);
  };

  const update = (dt: number) => {
    if (state === "gameover") {
      updateParticles(dt);
      return;
    }

    if (state === "dead") {
      deadTimer -= dt;
      updateParticles(dt);
      asteroids.forEach((a) => a.update(dt));
      if (deadTimer <= 0) {
        state = "playing";
        ship.reset();
      }
      return;
    }

    // Disparar
    if (pressed("Space")) bullets.push(...ship.tryShoot());

    ship.update(dt, keys);
    bullets.forEach((b) => b.update(dt));
    asteroids.forEach((a) => a.update(dt));
    particles.forEach((p) => p.update(dt));
    powerUps.forEach((p) => p.update(dt));

    bullets = bullets.filter((b) => !b.dead);
    particles = particles.filter((p) => !p.dead);
    powerUps = powerUps.filter((p) => !p.dead);

    for (const p of powerUps) {
      if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
        p.dead = true;
        ship.tripleShot = POWERUP_DURATION;
      }
    }

    // Bala vs asteroide
    const newAsteroids: Asteroid[] = [];
    let gained = 0;
    for (const b of bullets) {
      for (const a of asteroids) {
        if (!a.dead && !b.dead && dist(b, a) < a.radius) {
          b.dead = true;
          a.dead = true;
          gained += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
          newAsteroids.push(...a.split());
          if (!powerUpSpawned) {
            killsSinceSpawn++;
            const guaranteed = killsSinceSpawn >= 5;
            if (guaranteed || Math.random() < POWERUP_DROP_CHANCE) {
              powerUps.push(new PowerUp(a.x, a.y));
              powerUpSpawned = true;
            }
          }
        }
      }
    }
    if (gained > 0) emitScore(score + gained);
    asteroids = asteroids.filter((a) => !a.dead).concat(newAsteroids);
    bullets = bullets.filter((b) => !b.dead);

    // Nave vs asteroide
    if (ship.invincible <= 0) {
      for (const a of asteroids) {
        if (dist(ship, a) < ship.radius + a.radius * 0.82) {
          killShip();
          break;
        }
      }
    }

    // Nivel completado
    if (state === "playing" && asteroids.length === 0) nextLevel();
  };

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    particles.forEach((p) => p.draw(ctx, theme));
    asteroids.forEach((a) => a.draw(ctx, theme));
    powerUps.forEach((p) => p.draw(ctx, theme));
    bullets.forEach((b) => b.draw(ctx, theme));
    ship.draw(ctx, theme);

    if (ship.tripleShot > 0) {
      ctx.font = "15px monospace";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = theme.powerUp;
      glow(ctx, theme.powerUp, 8);
      ctx.fillText(`3x  ${ship.tripleShot.toFixed(1)}s`, 14, 26);
    }
  };

  const loop = (ts: number) => {
    if (destroyed) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (!paused) update(dt);
    draw();
    rafId = requestAnimationFrame(loop);
  };

  // Listeners
  const isEditable = (t: EventTarget | null) =>
    t instanceof HTMLElement &&
    (t.isContentEditable ||
      t.tagName === "INPUT" ||
      t.tagName === "TEXTAREA" ||
      t.tagName === "SELECT");

  const clearKeys = () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    for (const k of Object.keys(justPressed)) justPressed[k] = false;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return;
    if (paused || state === "gameover" || isEditable(e.target)) return;
    e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
  };
  const onBlur = () => {
    clearKeys();
    if (!paused && state !== "gameover") callbacks.onAutoPause();
  };
  const onVisibility = () => {
    if (document.hidden) onBlur();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("visibilitychange", onVisibility);

  // Arranque
  spawnAsteroids(4);
  callbacks.onScore(score);
  callbacks.onLives(lives);
  callbacks.onLevel(level);
  rafId = requestAnimationFrame(loop);

  return {
    setPaused: (p) => {
      if (p === paused) return;
      paused = p;
      clearKeys();
      lastTime = null;
    },
    destroy: () => {
      destroyed = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
};
