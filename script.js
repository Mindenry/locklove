const TARGET_CODE = [2, 0, 1, 1, 4, 6];

// Use new dials inside the lock
const dials = Array.from(document.querySelectorAll(".dial"));
const digits = dials.map((d) => d.querySelector(".digit"));
// reel mode removed: using digit-only display
const reels = [];
const upButtons = dials.map((d) => d.querySelector(".up"));
const downButtons = dials.map((d) => d.querySelector(".down"));
const lock3d = document.getElementById("lock3d");
const lockCard = document.getElementById("lockCard");
const loveMessage = document.getElementById("loveMessage");
const loveOverlay = document.getElementById("loveOverlay");
const tw1 = document.getElementById("tw1");
const tw2 = document.getElementById("tw2");
const tw3 = document.getElementById("tw3");
const btnReplay = document.getElementById("btnReplay");
const btnSurprise = document.getElementById("btnSurprise");
const btnLetter = document.getElementById("btnLetter");
const btnCopyLetter = document.getElementById("btnCopyLetter");
const btnCloseLetter = document.getElementById("btnCloseLetter");
const pickup = document.getElementById("pickupCarousel");
const loveLetter = document.getElementById("loveLetter");
const letterBody = document.getElementById("letterBody");

let values = Array(TARGET_CODE.length).fill(0);
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
}

function nudge(index, delta) {
  values[index] = clampDigit(values[index] + delta);
  render();
  wobble(index, delta);
  playTick();
}

function wobble(index, delta) {
  const digitEl = digits[index];
  digitEl.animate(
    [
      { transform: "rotateX(0deg)", opacity: 1 },
      { transform: `rotateX(${delta > 0 ? -70 : 70}deg)`, opacity: 0.4 },
      { transform: "rotateX(0deg)", opacity: 1 },
    ],
    { duration: 160, easing: "cubic-bezier(0.22, 1, 0.36, 1)", transformOrigin: "50% 50%" }
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
  setTimeout(() => fireConfetti(), 250);
  setTimeout(() => fireConfetti(), 550);
  revealMessage();
  animateShine();
  try {
    navigator.vibrate && navigator.vibrate([30, 60, 30]);
  } catch {}

  // morph points to heart scene
  startMorphToHeart();
  // sweet extras
  sparkleBurst();
  ringPulse();
  petalShower();
  heartFireworks();
  playChime();
  startHeartOutline();
  return true;
}

function revealMessage() {
  loveMessage.hidden = false;
  requestAnimationFrame(() => loveMessage.classList.add("show"));
}


function setFromQuery() {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const re = new RegExp("^\\d{" + TARGET_CODE.length + "}$");
  if (code && re.test(code)) {
    values = code.split("").map((c) => Number(c));
    render();
  }
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
  let isPressing = false;
  let activePointerId = null;
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
    isPressing = true;
    activePointerId = e.pointerId;
    holdStarted = false;
    holdTimeout = setTimeout(startHold, 300);
    if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
  });
  const release = (e) => {
    if (!isPressing) return; // ignore hover exits without a prior press
    if (e && activePointerId !== null && e.pointerId !== activePointerId) return;
    const wasHold = holdStarted;
    isPressing = false;
    activePointerId = null;
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
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});
downButtons.forEach((btn, i) => {
  if (!btn) return;
  let holdInt;
  let holdTimeout;
  let holdStarted = false;
  let isPressing = false;
  let activePointerId = null;
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
    isPressing = true;
    activePointerId = e.pointerId;
    holdStarted = false;
    holdTimeout = setTimeout(startHold, 300);
    if (btn.setPointerCapture) btn.setPointerCapture(e.pointerId);
  });
  const release = (e) => {
    if (!isPressing) return; // ignore hover exits without a prior press
    if (e && activePointerId !== null && e.pointerId !== activePointerId) return;
    const wasHold = holdStarted;
    isPressing = false;
    activePointerId = null;
    clearHold();
    if (!wasHold) {
      nudge(i, -1);
      checkUnlock();
    }
  };
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointerleave", release);
  btn.addEventListener("pointercancel", release);
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
});

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
    if (ev.target.closest(".arrow")) return; // don't start drag from arrow buttons
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
const fxCanvas = document.getElementById("fxCanvas");
const DPR = Math.min(2, window.devicePixelRatio || 1);

// Predeclare FX container early to avoid TDZ on first loop()
let fxItems = [];
// Predeclare heart outline state early to avoid TDZ
let heartOutline = { active: false, t: 0, beads: [], targets: [] };

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
fitCanvas(fxCanvas);
window.addEventListener("resize", () => {
  fitCanvas(confettiCanvas);
  fitCanvas(heartsCanvas);
  fitCanvas(morphCanvas);
  fitCanvas(fxCanvas);
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
  // Make heart responsive & crisp: use DPR aware scale
  const s = size * 0.06 * DPR; // normalize size
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.bezierCurveTo(6, -18, 24, -2, 0, 20);
  ctx.bezierCurveTo(-24, -2, -6, -18, 0, -8);
  const grd = ctx.createRadialGradient(0, -6, 2, 0, 6, 20);
  grd.addColorStop(0, `rgba(255, 122, 153, ${alpha})`);
  grd.addColorStop(1, `rgba(255, 61, 110, ${alpha})`);
  ctx.fillStyle = grd;
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
const fxCtx = fxCanvas.getContext("2d");
function loop() {
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  heartsCtx.clearRect(0, 0, heartsCanvas.width, heartsCanvas.height);
  fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
  drawConfetti(confettiCtx);
  drawHearts(heartsCtx);
  drawMorph(morphCtx);
  drawFX(fxCtx);
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

// Draw morphing particles into a heart shape on the morphCanvas
function drawMorph(ctx) {
  const w = morphCanvas.width, h = morphCanvas.height;
  // Clear the morph canvas here since the main loop doesn't
  ctx.clearRect(0, 0, w, h);
  if (!morphState.active) return;

  // Ease-in progress for smoother converge
  morphState.t = Math.min(1, morphState.t + 0.02);
  const t = 1 - Math.pow(1 - morphState.t, 3);

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const trg = heartTargets[i % heartTargets.length];
    // Move particle towards target
    p.x += (trg.x - p.x) * (0.06 + 0.10 * t);
    p.y += (trg.y - p.y) * (0.06 + 0.10 * t);
    // Draw
    const alpha = 0.4 + 0.5 * t;
    ctx.fillStyle = `hsla(${p.hue}deg, 95%, 70%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (0.7 + 0.6 * t) * DPR, 0, Math.PI * 2);
    ctx.fill();
  }
}

// แก้ไขฟังก์ชัน startMorphToHeart() ให้หัวใจจางลงก่อนแสดงข้อความ
function startMorphToHeart() {
  morphState.active = true;
  morphState.t = 0;
  document.getElementById("scene").classList.add("fade-out");
  loveOverlay.hidden = false;
  
  // Stage 1: แสดงเฉพาะหัวใจเท่านั้น
  requestAnimationFrame(() => loveOverlay.classList.add("show"));
  
  // ซ่อน UI เดิม
  document.body.classList.add("unlocked");
  
  // เริ่มแสดงหัวใจ
  startHeartOutline();
  
  // หลังจาก 3 วินาที เริ่มทำให้หัวใจจางลง
  setTimeout(() => {
    heartOutline.fadeOut = true;
    heartOutline.fadeTimer = 0;
  }, 3000);
  
  // หลังจากหัวใจจางหมด (ประมาณ 1.5 วินาที) ค่อยแสดงข้อความ
  setTimeout(() => {
    // หยุดทุก effect ของหัวใจ
    morphState.active = false;
    heartOutline.active = false;
    heartOutline.fadeOut = false;
    heartOutline.fadeTimer = 0;
    
    // แสดงข้อความและปุ่มต่างๆ (stage 2)
    loveOverlay.classList.add('stage2');
    startTypewriter();
    bindOverlayTrail();
  }, 4500); // 3000 + 1500 = 4.5 วินาที
}

// drawFX is defined later with final behavior

// Start loop after morph code is defined to avoid TDZ errors
loop();

// =============== Typewriter encouragement ===============
function typeLine(el, text, speed = 28) {
  return new Promise((resolve) => {
    if (!el) return resolve();
    el.textContent = "";
    let i = 0;
    const timer = setInterval(() => {
      el.textContent += text[i] || "";
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
}

async function startTypewriter() {
  const line1 = "คุณ Baby Bambi ครับ ผมอยากบอกว่า ต่อให้โลกวุ่นวายแค่ไหน";
  const line2 = "ขอให้รู้ไว้นะ ว่ามีผมคอยอยู่ข้างคุณ—ไม่ไปไหน 💞";
  const line3 = "พักก่อนนิดนึงนะคุณ แล้วค่อยไปต่อ ผมเชื่อในคุณเสมอ ✨";
  await typeLine(tw1, line1, 26);
  await new Promise((r) => setTimeout(r, 300));
  await typeLine(tw2, line2, 24);
  await new Promise((r) => setTimeout(r, 400));
  await typeLine(tw3, line3, 22);
}

// =============== Extra FX (sparkles, rings, petals, fireworks) ===============
// fxItems is declared near top to avoid TDZ

function sparkleBurst() {
  const w = fxCanvas.width, h = fxCanvas.height;
  for (let i = 0; i < 80; i++) {
    fxItems.push({
      kind: 'spark',
      x: w / 2,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 5 * DPR,
      vy: (Math.random() - 0.5) * 5 * DPR,
      life: 70 + Math.random() * 30,
      hue: 320 + Math.random() * 40,
      size: 1 + Math.random() * 2
    });
  }
}

function ringPulse() {
  const w = fxCanvas.width, h = fxCanvas.height;
  fxItems.push({ kind: 'ring', x: w / 2, y: h * 0.35, r: 10, life: 80 });
}

function petalShower() {
  const w = fxCanvas.width, h = fxCanvas.height;
  for (let i = 0; i < 20; i++) {
    fxItems.push({
      kind: 'petal',
      x: Math.random() * w,
      y: -20,
      vx: (Math.random() - 0.5) * 0.6 * DPR,
      vy: (0.8 + Math.random() * 0.7) * DPR,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.03,
      life: 400 + Math.random() * 200
    });
  }
}

function heartFireworks() {
  const w = fxCanvas.width, h = fxCanvas.height;
  const center = { x: w / 2, y: h * 0.38 };
  const n = 36;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    fxItems.push({
      kind: 'hfw',
      x: center.x,
      y: center.y,
      vx: Math.cos(a) * 2.2 * DPR,
      vy: Math.sin(a) * 2.2 * DPR,
      hue: 340 + (i % 6) * 5,
      life: 90,
      size: 2
    });
  }
}

// Smooth heart outline made of moving beads (post-unlock centerpiece)
function startHeartOutline() {
  const w = fxCanvas.width, h = fxCanvas.height;
  const cx = w / 2, cy = h * 0.40;
  const scale = Math.min(w, h) * 0.26; // larger, fuller heart
  const N = 360; // denser bead count for smoother outline
  heartOutline.active = true;
  heartOutline.t = 0;
  heartOutline.beads = Array.from({ length: N }, (_, i) => ({
    u: (i / N) * Math.PI * 2, // param angle
    x: Math.random() * w,
    y: Math.random() * h,
    hue: 338 + Math.random() * 24,
    size: 1.6 + Math.random() * 1.2,
  }));
  // store target points
  heartOutline.targets = heartOutline.beads.map((b) => {
    const x = 16 * Math.pow(Math.sin(b.u), 3) * scale + cx;
    const y = -(
      13 * Math.cos(b.u) - 5 * Math.cos(2 * b.u) - 2 * Math.cos(3 * b.u) - Math.cos(4 * b.u)
    ) * scale + cy;
    return { x, y };
  });
}

function drawFX(ctx) {
  const w = fxCanvas.width, h = fxCanvas.height;
  fxItems = fxItems.filter((it) => it.life > 0);
  // Draw soft vignette heart outline if active
  if (heartOutline.active) {
    heartOutline.t = Math.min(1, heartOutline.t + 0.02);
    const t = 1 - Math.pow(1 - heartOutline.t, 3);
    ctx.save();
    // draw soft gradient glow behind
    const path = new Path2D();
    for (let i = 0; i < heartOutline.beads.length; i++) {
      const b = heartOutline.beads[i];
      const trg = heartOutline.targets[i];
      b.x += (trg.x - b.x) * (0.07 + 0.10 * t);
      b.y += (trg.y - b.y) * (0.07 + 0.10 * t);
      const wob = Math.sin(performance.now() * 0.0018 + i * 0.6) * 1.2 * DPR;
      const px = b.x + wob;
      const py = b.y;
      path.moveTo(px, py);
      path.arc(px, py, b.size * DPR * (1.2 + 0.4 * t), 0, Math.PI * 2);
    }
    const glow = ctx.createRadialGradient(w/2, h*0.4, Math.max(30*DPR, Math.min(w,h)*0.05), w/2, h*0.4, Math.min(w,h)*0.35);
    glow.addColorStop(0, 'rgba(255, 182, 193, 0.25)');
    glow.addColorStop(1, 'rgba(255, 182, 193, 0.0)');
    ctx.fillStyle = glow;
    ctx.fill(path);

    // draw crisp luminous outline with gradient stroke
    ctx.lineWidth = 2.2 * DPR;
    const strokeGrad = ctx.createLinearGradient(w*0.4, h*0.3, w*0.6, h*0.5);
    strokeGrad.addColorStop(0, 'rgba(255, 120, 160, 0.95)');
    strokeGrad.addColorStop(0.5, 'rgba(255, 200, 220, 0.95)');
    strokeGrad.addColorStop(1, 'rgba(255, 120, 160, 0.95)');
    ctx.strokeStyle = strokeGrad;
    ctx.shadowColor = 'rgba(255, 140, 180, 0.55)';
    ctx.shadowBlur = 18 * DPR;

    // Build smooth polyline along ordered beads
    ctx.beginPath();
    for (let i = 0; i < heartOutline.beads.length; i += 6) {
      const b = heartOutline.beads[i];
      const wob = Math.sin(performance.now() * 0.0018 + i * 0.6) * 1.2 * DPR;
      const px = b.x + wob;
      const py = b.y;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    // fade factor
    let fadeMul = 1;
    if (heartOutline.fadeOut) {
      heartOutline.fadeTimer = (heartOutline.fadeTimer || 0) + 16;
      const fadeProgress = Math.min(1, heartOutline.fadeTimer / 1500);
      fadeMul = 1 - fadeProgress * fadeProgress;
    }
    ctx.globalAlpha = 0.9 * fadeMul;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
    if (heartOutline.fadeOut && heartOutline.fadeTimer > 1500) {
      heartOutline.active = false;
      heartOutline.fadeOut = false;
      heartOutline.fadeTimer = 0;
    }
  }

  for (const it of fxItems) {
    it.life--;
    if (it.kind === 'spark') {
      it.x += it.vx; it.y += it.vy; it.vy += 0.02 * DPR;
      ctx.fillStyle = `hsla(${it.hue}deg,95%,65%,${Math.max(0, it.life / 80)})`;
      ctx.beginPath(); ctx.arc(it.x, it.y, it.size * DPR, 0, Math.PI * 2); ctx.fill();
    } else if (it.kind === 'ring') {
      it.r += 3 * DPR; const alpha = Math.max(0, it.life / 80);
      const grad = ctx.createRadialGradient(it.x, it.y, Math.max(1, it.r - 6), it.x, it.y, it.r + 6);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.3})`);
      grad.addColorStop(1, `rgba(255, 105, 180, 0)`);
      ctx.strokeStyle = `rgba(255, 182, 193, ${alpha})`;
      ctx.lineWidth = 2 * DPR;
      ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(it.x, it.y, it.r + 6, 0, Math.PI * 2); ctx.fill();
    } else if (it.kind === 'petal') {
      it.x += it.vx; it.y += it.vy; it.rot += it.vr;
      drawPetal(ctx, it.x, it.y, 8 * DPR, it.rot, 0.85);
    } else if (it.kind === 'hfw') {
      it.x += it.vx; it.y += it.vy; it.vy += 0.02 * DPR;
      ctx.fillStyle = `hsla(${it.hue}deg,95%,65%,${Math.max(0, it.life / 90)})`;
      ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(0.78); // rotate a bit
      ctx.beginPath();
      ctx.moveTo(0, -2 * DPR);
      ctx.bezierCurveTo(1.5 * DPR, -3.5 * DPR, 3.6 * DPR, -0.2 * DPR, 0, 2.5 * DPR);
      ctx.bezierCurveTo(-3.6 * DPR, -0.2 * DPR, -1.5 * DPR, -3.5 * DPR, 0, -2 * DPR);
      ctx.fill(); ctx.restore();
    }
  }
}

function drawPetal(ctx, x, y, s, rot, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s / 12, s / 12);
  ctx.fillStyle = `rgba(255, 182, 193, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.bezierCurveTo(4, -12, 12, -1, 0, 10);
  ctx.bezierCurveTo(-12, -1, -4, -12, 0, -6);
  ctx.fill(); ctx.restore();
}

// Pointer trail on overlay (sparkly hearts following the cursor)
function bindOverlayTrail() {
  if (!loveOverlay) return;
  let last = 0;
  loveOverlay.addEventListener('pointermove', (e) => {
    const now = performance.now();
    if (now - last < 20) return;
    last = now;
    const rect = loveOverlay.getBoundingClientRect();
    const x = (e.clientX - rect.left) * DPR;
    const y = (e.clientY - rect.top) * DPR;
    // spawn spark
    fxItems.push({ kind: 'spark', x, y, vx: (Math.random()-0.5)*1.2, vy: (Math.random()-0.5)*1.2, life: 50, hue: 330+Math.random()*30, size: 1.2 });
    // small heart
    fxItems.push({ kind: 'hfw', x, y, vx: (Math.random()-0.5)*0.8, vy: (Math.random()-0.5)*0.8, hue: 340, life: 60, size: 1.4 });
  });
}

// =============== Sweet audio chime ===============
function playChime() {
  ensureAudio();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const notes = [0, 4, 7, 12]; // major-ish arpeggio
  notes.forEach((semi, i) => {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const f = audioCtx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 1800;
    osc.type = 'sine';
    osc.frequency.value = 440 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0.0001, now + i * 0.08);
    g.gain.exponentialRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.5);
    osc.connect(f); f.connect(g); g.connect(audioCtx.destination);
    osc.start(now + i * 0.08); osc.stop(now + i * 0.08 + 0.6);
  });
}

// =============== Overlay actions ===============
if (btnReplay) {
  btnReplay.addEventListener('click', async () => {
    fireMegaShow();
    tw1 && (tw1.textContent = ''); tw2 && (tw2.textContent = ''); tw3 && (tw3.textContent = '');
    await startTypewriter();
  });
}

if (btnSurprise) {
  btnSurprise.addEventListener('click', () => {
    fireMegaShow();
    carouselPickup();
  });
}


function showPickup(text) {
  if (!pickup) return;
  pickup.textContent = text;
}

const pickupList = [
  'ขอยืมมือคุณ… ไปจับมือผมตลอดไปนะ',
  'คุณคือบ้านของผม แม้โลกจะวุ่นวาย',
  'ดวงดาวก็ยังแพ้แววตาคุณ',
  'กาแฟอาจขม แต่รักของผมกับคุณ หวานกว่านั้นมาก',
  'แค่มองตาคุณ หัวใจก็ล็อคแล้ว'
];

function carouselPickup() {
  if (!pickup) return;
  const next = pickupList[(Math.random() * pickupList.length) | 0];
  showPickup(next + ' ✨');
}

// =============== Love Letter Modal ===============
const LETTER_TEXT = `\
คุณ Baby Bambi ที่น่ารักของผม,\n\nเวลาที่คุณเหนื่อย ผมอยากให้รู้ว่า คุณไม่เคยต้องเดินคนเดียวเลย\nเพราะทุกก้าวของคุณ มีผมเดินเคียงข้างเสมอ\n\nบางวันโลกอาจดังและวุ่นวาย แต่หัวใจเราจะเบาและเงียบสงบ\nเมื่อคุณมองมาทางนี้—ผมก็ยิ้มแล้ว :)\n\nพักหายใจสักครู่ แล้วไปต่อด้วยกันนะครับ\nผมภูมิใจในตัวคุณมากๆ และจะอยู่ตรงนี้…\nเพื่อบอกคำเดิมซ้ำๆ ว่า “คุณเก่งและน่ารักที่สุดในโลกของผม”\n\nรัก,\nผม`; 

function typeLetter(text, speed = 14) {
  return new Promise((resolve) => {
    if (!letterBody) return resolve();
    letterBody.textContent = '';
    let i = 0;
    const timer = setInterval(() => {
      letterBody.textContent += text[i] || '';
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, speed);
  });
}

if (btnLetter && loveLetter) {
  btnLetter.addEventListener('click', async () => {
    loveLetter.hidden = false;
    requestAnimationFrame(() => loveLetter.classList.add('show'));
    await typeLetter(LETTER_TEXT, 14);
  });
}

if (btnCloseLetter && loveLetter) {
  btnCloseLetter.addEventListener('click', () => {
    loveLetter.classList.remove('show');
    setTimeout(() => { loveLetter.hidden = true; }, 300);
  });
}

if (btnCopyLetter) {
  btnCopyLetter.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(LETTER_TEXT);
      showPickup('คัดลอกจดหมายแล้วนะ ❤');
    } catch {}
  });
}

// One-tap mega show to make it denser and wow
function fireMegaShow() {
  fireConfetti(); setTimeout(fireConfetti, 200); setTimeout(fireConfetti, 400);
  sparkleBurst(); setTimeout(sparkleBurst, 120);
  ringPulse(); setTimeout(ringPulse, 240);
  heartFireworks(); setTimeout(heartFireworks, 300);
  petalShower();
  playChime();
}
