const TARGET_CODE = [0, 9, 5, 4, 6];

// Use new dials inside the lock
const dials = Array.from(document.querySelectorAll(".dial"));
const digits = dials.map((d) => d.querySelector(".digit"));
const reels = dials.map((d) => d.querySelector(".reel-track"));
const upButtons = dials.map((d) => d.querySelector(".up"));
const downButtons = dials.map((d) => d.querySelector(".down"));
const shuffleBtn = document.getElementById("shuffleBtn");
const shareBtn = document.getElementById("shareBtn");
const lock3d = document.getElementById("lock3d");
const lockCard = document.getElementById("lockCard");
const loveMessage = document.getElementById("loveMessage");
const loveOverlay = document.getElementById("loveOverlay");

let values = [0, 0, 0, 0, 0];
let audioCtx;
let lastTickTime = 0;
let tickPlaybackRate = 1;

function clampDigit(n) {
  return (n + 10) % 10;
}
function render() {
  digits.forEach((d, i) => {
    d.textContent = String(values[i]);
    d.dataset.value = String(values[i]);
  });
  reels.forEach((track, i) => {
    if (!track) return;
    const v = values[i];
    const cellH =
      (track.parentElement && track.parentElement.offsetHeight) || 46;
    track.style.transform = `translateY(${-v * cellH}px)`;
  });
}

function nudge(index, delta) {
  values[index] = clampDigit(values[index] + delta);
  render();
  wobble(index, delta);
  playTick();
}

function wobble(index, delta) {
  const wheel = dials[index];
  wheel.animate(
    [
      { transform: "translateY(0px)" },
      { transform: `translateY(${delta > 0 ? -4 : 4}px)` },
      { transform: "translateY(0px)" },
    ],
    { duration: 140, easing: "ease-out" }
  );
}

function pulse(el) {
  el.animate(
    [
      { transform: "scale(1)" },
      { transform: "scale(1.04)" },
      { transform: "scale(1)" },
    ],
    { duration: 220, easing: "ease-out" }
  );
}

// Lightweight WebAudio tick
function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
  }
}

function playTick() {
  ensureAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const dt = now - lastTickTime;
  lastTickTime = now;
  // speed-aware pitch
  tickPlaybackRate = Math.min(1.6, 0.9 + (1 / Math.max(0.05, dt)) * 0.04);

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 2200;
  osc.type = "triangle";
  osc.frequency.setValueAtTime(480 * tickPlaybackRate, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.08);
}

function shake(el) {
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: "translateX(-6px)" },
      { transform: "translateX(6px)" },
      { transform: "translateX(-4px)" },
      { transform: "translateX(4px)" },
      { transform: "translateX(0)" },
    ],
    { duration: 360, easing: "ease-in-out" }
  );
}

function checkUnlock() {
  const isCorrect = values.every((v, i) => v === TARGET_CODE[i]);
  if (!isCorrect) {
    lockCard.classList.remove("unlocked");
    loveMessage.hidden = true;
    loveMessage.classList.remove("show");
    try {
      navigator.vibrate && navigator.vibrate(80);
    } catch {}
    shake(lockCard);
    return false;
  }

  // Success
  lockCard.classList.add("unlocked");
  pulse(lock3d);
  fireConfetti();
  revealMessage();
  animateShine();
  try {
    navigator.vibrate && navigator.vibrate([30, 60, 30]);
  } catch {}

  // morph points to heart scene
  startMorphToHeart();
  return true;
}

function revealMessage() {
  loveMessage.hidden = false;
  requestAnimationFrame(() => loveMessage.classList.add("show"));
}

function randomize() {
  values = values.map(() => Math.floor(Math.random() * 10));
  render();
}

function setFromQuery() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  if (code && /^\d{5}$/.test(code)) {
    values = code.split("").map((c) => Number(c));
    render();
  }
}

function copyShare() {
  const url = new URL(location.href);
  url.searchParams.set("code", values.join(""));
  navigator.clipboard.writeText(url.toString()).then(() => {
    shareBtn.textContent = "คัดลอกแล้ว!";
    setTimeout(() => (shareBtn.textContent = "แชร์ลิงก์"), 1200);
  });
}

// Mouse parallax
const scene = document.getElementById("scene");
scene.addEventListener("mousemove", (e) => {
  const rect = lockCard.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  lockCard.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(
    x * 12
  ).toFixed(2)}deg)`;
});
scene.addEventListener("mouseleave", () => {
  lockCard.style.transform = "rotateX(0deg) rotateY(0deg)";
});

// Bind buttons (defensive: skip if missing)
upButtons.forEach((btn, i) => {
  if (!btn) return;
  let holdInt;
  let holdTimeout;
  let holdStarted = false;
  const startHold = () => {
    holdStarted = true;
    nudge(i, +1);
    checkUnlock();
    holdInt = setInterval(() => {
      nudge(i, +1);
      checkUnlock();
    }, 120);
  };
  const clearHold = () => {
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      holdTimeout = null;
    }
    if (holdInt) {
      clearInterval(holdInt);
      holdInt = null;
    }
  };
  btn.addEventListener("pointerdown", (e) => {
    holdStarted = false;
    holdTimeout = setTimeout(startHold, 300);
    if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
  });
  const release = () => {
    const wasHold = holdStarted;
    clearHold();
    if (!wasHold) {
      nudge(i, +1);
      checkUnlock();
    }
  };
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointerleave", release);
  btn.addEventListener("pointercancel", release);
  // prevent native click causing duplicate step after pointer sequence
  btn.addEventListener("click", (e) => e.preventDefault());
});
downButtons.forEach((btn, i) => {
  if (!btn) return;
  let holdInt;
  let holdTimeout;
  let holdStarted = false;
  const startHold = () => {
    holdStarted = true;
    nudge(i, -1);
    checkUnlock();
    holdInt = setInterval(() => {
      nudge(i, -1);
      checkUnlock();
    }, 120);
  };
  const clearHold = () => {
    if (holdTimeout) {
      clearTimeout(holdTimeout);
      holdTimeout = null;
    }
    if (holdInt) {
      clearInterval(holdInt);
      holdInt = null;
    }
  };
  btn.addEventListener("pointerdown", (e) => {
    holdStarted = false;
    holdTimeout = setTimeout(startHold, 300);
    if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
  });
  const release = () => {
    const wasHold = holdStarted;
    clearHold();
    if (!wasHold) {
      nudge(i, -1);
      checkUnlock();
    }
  };
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointerleave", release);
  btn.addEventListener("pointercancel", release);
  btn.addEventListener("click", (e) => e.preventDefault());
});
shuffleBtn.addEventListener("click", () => {
  randomize();
  checkUnlock();
});
shareBtn.addEventListener("click", copyShare);

// Keyboard support
dials.forEach((dial, i) => {
  // Click anywhere on the dial: top half = up, bottom half = down
  dial.addEventListener("click", (ev) => {
    const upEl = ev.target.closest(".up");
    const downEl = ev.target.closest(".down");
    if (upEl) {
      nudge(i, +1);
      checkUnlock();
      return;
    }
    if (downEl) {
      nudge(i, -1);
      checkUnlock();
      return;
    }
    const rect = dial.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    if (y < rect.height / 2) {
      nudge(i, +1);
    } else {
      nudge(i, -1);
    }
    checkUnlock();
  });

  dial.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowUp") {
      nudge(i, +1);
      ev.preventDefault();
      checkUnlock();
    }
    if (ev.key === "ArrowDown") {
      nudge(i, -1);
      ev.preventDefault();
      checkUnlock();
    }
    if (ev.key === "Enter") {
      checkUnlock();
      ev.preventDefault();
    }
  });
  // scroll wheel to change number
  dial.addEventListener(
    "wheel",
    (ev) => {
      ev.preventDefault();
      const step = Math.sign(-ev.deltaY);
      if (step !== 0) {
        nudge(i, step);
        checkUnlock();
      }
    },
    { passive: false }
  );

  // drag/swipe vertical to change
  let startY = 0;
  let acc = 0;
  let dragging = false;
  const STEP_PX = 18;
  dial.addEventListener("pointerdown", (ev) => {
    dragging = true;
    startY = ev.clientY;
    acc = 0;
    dial.setPointerCapture(ev.pointerId);
    dial.classList.add("active");
  });
  dial.addEventListener("pointermove", (ev) => {
    if (!dragging) return;
    const dy = startY - ev.clientY; // up -> positive
    const steps = Math.trunc((dy - acc) / STEP_PX);
    if (steps !== 0) {
      acc += steps * STEP_PX;
      nudge(i, steps);
      checkUnlock();
    }
  });
  dial.addEventListener("pointerup", () => {
    dragging = false;
    acc = 0;
    dial.classList.remove("active");
  });
  dial.addEventListener("pointercancel", () => {
    dragging = false;
    acc = 0;
    dial.classList.remove("active");
  });
});

// Hearts + confetti canvases
const confettiCanvas = document.getElementById("confettiCanvas");
const heartsCanvas = document.getElementById("heartsCanvas");
const morphCanvas = document.getElementById("morphCanvas");
const DPR = Math.min(2, window.devicePixelRatio || 1);

function fitCanvas(canvas) {
  const { innerWidth: w, innerHeight: h } = window;
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
}
fitCanvas(confettiCanvas);
fitCanvas(heartsCanvas);
fitCanvas(morphCanvas);
window.addEventListener("resize", () => {
  fitCanvas(confettiCanvas);
  fitCanvas(heartsCanvas);
  fitCanvas(morphCanvas);
  render();
});

// Ambient background particles (CSS-driven)
const bg = document.getElementById("bgParticles");
if (bg && bg.children.length === 0) {
  const COUNT = 60;
  for (let i = 0; i < COUNT; i++) {
    const el = document.createElement("div");
    el.className = "particle";
    el.style.left = Math.random() * 100 + "vw";
    el.style.animationDelay = (Math.random() * 20).toFixed(2) + "s";
    el.style.animationDuration = (16 + Math.random() * 16).toFixed(2) + "s";
    el.style.opacity = (0.3 + Math.random() * 0.6).toFixed(2);
    bg.appendChild(el);
  }
}

// Confetti
let confetti = [];
function spawnConfetti(burst = 120) {
  const cw = confettiCanvas.width;
  const ch = confettiCanvas.height;
  for (let i = 0; i < burst; i++) {
    confetti.push({
      x: cw / 2,
      y: ch * 0.25,
      vx: (Math.random() - 0.5) * 6 * DPR,
      vy: (Math.random() * -6 - 2) * DPR,
      g: 0.15 * DPR,
      hue: 330 + Math.random() * 40,
      size: 3 + Math.random() * 3,
      life: 100 + Math.random() * 60,
    });
  }
}

function drawConfetti(ctx) {
  confetti = confetti.filter((c) => c.life > 0);
  for (const c of confetti) {
    c.x += c.vx;
    c.y += c.vy;
    c.vy += c.g;
    c.life -= 1;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate((c.x + c.y) * 0.01);
    ctx.fillStyle = `hsl(${c.hue}deg 90% 60% / 0.95)`;
    ctx.fillRect(-c.size, -c.size, c.size * 2, c.size * 2);
    ctx.restore();
  }
}

function fireConfetti() {
  spawnConfetti(160);
}

// Hearts float
let hearts = [];
function spawnHearts(count = 12) {
  const w = heartsCanvas.width;
  const h = heartsCanvas.height;
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = h + Math.random() * 60;
    hearts.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.6 * DPR,
      vy: -(1.2 + Math.random() * 0.8) * DPR,
      size: 10 + Math.random() * 14,
      alpha: 0.6 + Math.random() * 0.4,
    });
  }
}

function drawHeart(ctx, x, y, size, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, -0.5);
  ctx.bezierCurveTo(0.5, -1.2, 1.8, -0.1, 0, 1);
  ctx.bezierCurveTo(-1.8, -0.1, -0.5, -1.2, 0, -0.5);
  ctx.fillStyle = `rgba(255, 61, 110, ${alpha})`;
  ctx.fill();
  ctx.restore();
}

function drawHearts(ctx) {
  hearts = hearts.filter((h) => h.y > -40);
  for (const h of hearts) {
    h.x += h.vx;
    h.y += h.vy;
    drawHeart(ctx, h.x, h.y, h.size, "#ff3d6e", h.alpha);
  }
}

// Shine effect
function animateShine() {
  lock3d.animate(
    [
      { filter: "drop-shadow(0 10px 24px rgba(255, 61, 110, 0.25))" },
      { filter: "drop-shadow(0 10px 24px rgba(255, 61, 110, 0.6))" },
      { filter: "drop-shadow(0 10px 24px rgba(255, 61, 110, 0.25))" },
    ],
    { duration: 900, easing: "ease-in-out" }
  );
  spawnHearts(18);
}

// Main loop
const confettiCtx = confettiCanvas.getContext("2d");
const heartsCtx = heartsCanvas.getContext("2d");
const morphCtx = morphCanvas.getContext("2d");
function loop() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  heartsCtx.clearRect(0, 0, heartsCanvas.width, heartsCanvas.height);
  drawConfetti(confettiCtx);
  drawHearts(heartsCtx);
  drawMorph(morphCtx);
  requestAnimationFrame(loop);
}

// Init
setFromQuery();
render();

// Removed demo auto-random motion to avoid unexpected changes

// =============== Morphing Particles to Heart ===============
let morphState = { active: false, t: 0 };
let particles = [];
const PARTICLE_COUNT = 600;

function createParticles() {
  const w = morphCanvas.width,
    h = morphCanvas.height;
  particles = Array.from({ length: PARTICLE_COUNT }).map(() => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.3 * DPR,
    vy: (Math.random() - 0.5) * 0.3 * DPR,
    tx: 0,
    ty: 0,
    size: 1 + Math.random() * 2,
    hue: 330 + Math.random() * 40,
  }));
}
createParticles();

function heartPoint(u, v, scale = 1) {
  // classic heart parametric curve converted to canvas space
  const x = 16 * Math.pow(Math.sin(u), 3);
  const y =
    13 * Math.cos(u) -
    5 * Math.cos(2 * u) -
    2 * Math.cos(3 * u) -
    Math.cos(4 * u);
  return { x: x * scale + v.x, y: -y * scale + v.y };
}

function buildHeartTargets() {
  const w = morphCanvas.width,
    h = morphCanvas.height;
  const center = { x: w / 2, y: h / 2 };
  const scale = Math.min(w, h) * 0.02;
  const targets = [];
  for (let i = 0; i < particles.length; i++) {
    const u = (i / particles.length) * Math.PI * 2;
    const p = heartPoint(u, center, scale);
    targets.push(p);
  }
  return targets;
}

let heartTargets = buildHeartTargets();
window.addEventListener("resize", () => {
  heartTargets = buildHeartTargets();
});

function startMorphToHeart() {
  morphState.active = true;
  morphState.t = 0;
  document.getElementById("scene").classList.add("fade-out");
  loveOverlay.hidden = false;
  requestAnimationFrame(() => loveOverlay.classList.add("show"));
}

function drawMorph(ctx) {
  if (!morphState.active) return;
  const w = morphCanvas.width,
    h = morphCanvas.height;
  ctx.clearRect(0, 0, w, h);

  morphState.t = Math.min(1, morphState.t + 0.008);
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const t = ease(morphState.t);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const target = heartTargets[i % heartTargets.length];
    p.x += (target.x - p.x) * (0.03 + t * 0.08);
    p.y += (target.y - p.y) * (0.03 + t * 0.08);

    ctx.fillStyle = `hsla(${p.hue}deg, 90%, ${60 + Math.sin(i) * 10}%, ${
      0.35 + 0.45 * t
    })`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * DPR * (0.8 + t), 0, Math.PI * 2);
    ctx.fill();
  }
}

// Start loop after morph code is defined to avoid TDZ errors
loop();
