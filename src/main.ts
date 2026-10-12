
import "./style.css";

type Scene = "morning" | "day" | "sunset" | "night";
type Mode = Scene | "auto";

type Palette = {
  skyTop: string;
  skyBottom: string;
  sea: string;
  hill: string;
  foreground: string;
  light: string;
};

const W = 320;
const H = 180;
const FPS = 15;
const FRAME_MS = 1000 / FPS;

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const ctx = canvas.getContext("2d", { alpha: false })!;
const clock = document.querySelector<HTMLElement>("#clock")!;
const status = document.querySelector<HTMLElement>("#status")!;

ctx.imageSmoothingEnabled = false;

const palettes: Record<Scene, Palette> = {
  morning: {
    skyTop: "#789cbd",
    skyBottom: "#f5c8ab",
    sea: "#679ab3",
    hill: "#71899b",
    foreground: "#555d78",
    light: "#ffe5b6"
  },
  day: {
    skyTop: "#468dc2",
    skyBottom: "#afdce8",
    sea: "#438aaf",
    hill: "#558b9a",
    foreground: "#405f77",
    light: "#fff0cb"
  },
  sunset: {
    skyTop: "#48385f",
    skyBottom: "#f3a07e",
    sea: "#655c80",
    hill: "#756078",
    foreground: "#37364f",
    light: "#ffcf90"
  },
  night: {
    skyTop: "#151a36",
    skyBottom: "#455274",
    sea: "#273e60",
    hill: "#35405e",
    foreground: "#22283f",
    light: "#f0e8cb"
  }
};

const labels: Record<Scene, string> = {
  morning: "A QUIET MORNING",
  day: "A SLOW AFTERNOON",
  sunset: "THE GOLDEN HOUR",
  night: "GOOD NIGHT"
};

function savedMode(): Mode {
  try {
    const value = localStorage.getItem("sora-mode");
    if (value === "auto" || value === "morning" ||
        value === "day" || value === "sunset" ||
        value === "night") return value;
  } catch {
    // Storage can be unavailable in private contexts.
  }
  return "auto";
}

let mode: Mode = savedMode();

function sceneByTime(): Scene {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 19) return "sunset";
  return "night";
}

function currentScene(): Scene {
  return mode === "auto" ? sceneByTime() : mode;
}

function fill(
  color: string,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// Reproducible pseudo-random positions.
function noise(n: number): number {
  const x = Math.sin(n * 127.1 + 31.7) * 43758.5453;
  return x - Math.floor(x);
}

function drawSky(p: Palette) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 119);
  gradient.addColorStop(0, p.skyTop);
  gradient.addColorStop(1, p.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, 122);
}

function drawStars(time: number) {
  for (let i = 0; i < 48; i++) {
    const x = Math.floor(noise(i + 2) * W);
    const y = Math.floor(noise(i + 101) * 100);
    const twinkle = Math.sin(time * 0.001 + i * 3.8);
    ctx.globalAlpha = 0.45 + twinkle * 0.25;
    fill("#f1eddf", x, y, i % 9 === 0 ? 2 : 1, 1);
  }
  ctx.globalAlpha = 1;
}

function drawSunOrMoon(scene: Scene, p: Palette) {
  const night = scene === "night";
  const x = scene === "morning" ? 82 : 245;
  const y = scene === "day" ? 39 : night ? 43 : 89;
  const r = night ? 9 : 15;

  ctx.fillStyle = p.light;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  if (night) {
    ctx.fillStyle = p.skyTop;
    ctx.beginPath();
    ctx.arc(x + 5, y - 4, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCloud(x: number, y: number, color: string) {
  fill(color, x + 9, y, 27, 5);
  fill(color, x, y + 5, 54, 7);
  fill(color, x + 7, y + 12, 42, 3);
}

function drawClouds(time: number, scene: Scene) {
  if (scene === "night") return;
  const color = scene === "sunset" ? "#dfacae" : "#e4e8e6";

  ctx.globalAlpha = scene === "sunset" ? 0.65 : 0.8;

  for (let i = 0; i < 3; i++) {
    const speed = 0.0015 + i * 0.0005;
    const x = ((i * 138 + time * speed) % 430) - 65;
    const y = 23 + i * 22;
    drawCloud(x, y, color);
  }
  ctx.globalAlpha = 1;
}

function drawHills(p: Palette) {
  ctx.fillStyle = p.hill;
  ctx.beginPath();
  ctx.moveTo(0, 122);
  ctx.lineTo(0, 110);
  ctx.lineTo(18, 108);
  ctx.lineTo(40, 113);
  ctx.lineTo(73, 99);
  ctx.lineTo(98, 107);
  ctx.lineTo(120, 104);
  ctx.lineTo(151, 119);
  ctx.lineTo(190, 110);
  ctx.lineTo(229, 119);
  ctx.lineTo(257, 105);
  ctx.lineTo(285, 115);
  ctx.lineTo(320, 110);
  ctx.lineTo(320, 122);
  ctx.fill();
}

function drawSea(time: number, p: Palette) {
  fill(p.sea, 0, 121, W, 59);

  ctx.globalAlpha = 0.35;

  for (let i = 0; i < 42; i++) {
    const speed = i % 2 === 0 ? 0.004 : -0.003;
    const x = ((noise(i + 30) * 350 + time * speed) % 350 + 350) % 350 - 15;
    const y = 126 + Math.floor(noise(i + 80) * 50);
    const length = 4 + Math.floor(noise(i + 47) * 18);
    fill(p.light, x, y, length, 1);
  }

  ctx.globalAlpha = 1;
}

function drawTown(p: Palette, scene: Scene) {
  const dark = p.foreground;

  // Shoreline
  fill(dark, 0, 170, W, 10);
  fill(dark, 0, 163, 76, 17);

  // House silhouette
  fill(dark, 34, 132, 69, 35);

  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(27, 133);
  ctx.lineTo(68, 114);
  ctx.lineTo(110, 133);
  ctx.fill();

  // Door and windows
  fill("#26283d", 65, 147, 13, 20);
  const windowColor = scene === "night" || scene === "sunset"
    ? "#f5ba7e"
    : "#8ba4b0";

  fill(windowColor, 45, 143, 12, 11);
  fill(windowColor, 84, 143, 10, 11);

  // Telegraph pole
  fill(dark, 17, 115, 4, 55);
  fill(dark, 10, 119, 20, 4);
  fill(dark, 13, 127, 13, 2);

  // Distant pier
  fill(dark, 254, 150, 66, 4);
  for (let i = 0; i < 4; i++) {
    fill(dark, 260 + i * 17, 153, 3, 27);
  }

  // A small light
  fill(dark, 285, 134, 3, 20);
  fill(windowColor, 283, 132, 7, 4);
}

function render(time: number) {
  const scene = currentScene();
  const p = palettes[scene];

  drawSky(p);
  if (scene === "night") drawStars(time);
  drawSunOrMoon(scene, p);
  drawClouds(time, scene);
  drawHills(p);
  drawSea(time, p);
  drawTown(p, scene);
}

// UI
function updateUI() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  clock.textContent = `${hours}:${minutes}`;
  status.textContent = labels[currentScene()];

  document.querySelectorAll<HTMLButtonElement>("[data-mode]")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.mode === mode
      );
    });
}

document.querySelectorAll<HTMLButtonElement>("[data-mode]")
  .forEach((button) => {
    button.addEventListener("click", () => {
      mode = button.dataset.mode as Mode;
      try {
        localStorage.setItem("sora-mode", mode);
      } catch {
        // Continue without persistence.
      }
      updateUI();
      render(performance.now());
    });
  });

async function toggleFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  } else {
    await document.documentElement.requestFullscreen();
  }
}

document.querySelector("#fullscreen")!
  .addEventListener("click", () => {
    void toggleFullscreen();
  });

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "f" && !event.repeat) {
    void toggleFullscreen();
  }
});

// Animation
const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

let elapsed = 0;
let lastFrame = 0;
let lastTick = 0;
let animationId = 0;

function loop(now: number) {
  if (document.hidden) return;

  const delta = lastTick ? Math.min(now - lastTick, 100) : 0;
  lastTick = now;

  if (now - lastFrame >= FRAME_MS) {
    lastFrame = now;

    if (!reducedMotion.matches) {
      elapsed += delta;
    }

    render(elapsed);
  }

  animationId = requestAnimationFrame(loop);
}

document.addEventListener("visibilitychange", () => {
  cancelAnimationFrame(animationId);

  if (!document.hidden) {
    lastTick = 0;
    lastFrame = 0;
    animationId = requestAnimationFrame(loop);
  }
});

updateUI();
render(0);

animationId = requestAnimationFrame(loop);

// Keep clock and automatic scene in sync with local time.
setInterval(() => {
  updateUI();
  if (reducedMotion.matches && !document.hidden) {
    render(elapsed);
  }
}, 10_000);
