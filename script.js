const TARGET_CODE = [2, 0, 1, 1, 4, 6];
// Responsive/device capability flags
const isCoarsePointer = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(pointer: coarse)').matches : ('ontouchstart' in window);
const isFinePointer = (typeof window !== 'undefined' && window.matchMedia) ? window.matchMedia('(pointer: fine) and (hover: hover)').matches : !isCoarsePointer;

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
const letterToast = document.getElementById("letterToast");
const letterPhoto = document.getElementById('letterPhoto');
const scratchCanvas = document.getElementById('scratchCanvas');
const photoCaption = document.getElementById('photoCaption');
const signatureWrap = document.getElementById("signatureWrap");
const signatureName = document.getElementById("signatureName");
const sealInitials = document.getElementById("sealInitials");
const letterMonogram = document.getElementById("letterMonogram");
const letterDate = document.getElementById("letterDate");

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

  // Optional signature override via ?sign=
  const sign = params.get("sign");
  const defaultSign = 'มายด์';
  if (signatureName) {
    signatureName.textContent = sign ? decodeURIComponent(sign) : defaultSign;
  }
  // Wax seal initials from first character(s)
  if (sealInitials) {
    const s = (signatureName && signatureName.textContent) || "♡";
    // Use first glyph only, fallback to heart if empty
    const first = s.trim().charAt(0);
    sealInitials.textContent = first || "♡";
  }
  // Monogram (first letter) and date (today)
  if (letterMonogram) {
    const s = (signatureName && signatureName.textContent) || defaultSign;
    letterMonogram.textContent = s.trim().charAt(0) || 'M';
  }
  if (letterDate) {
    try {
      const d = new Date();
      const day = d.getDate().toString().padStart(2, '0');
      const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      const month = monthNames[d.getMonth()];
      const year = d.getFullYear();
      letterDate.textContent = `${day} ${month} ${year}`;
    } catch {}
  }

  // Optional letter photo via ?photo=
  const photo = params.get('photo');
  if (letterPhoto) {
    if (photo) {
      try { letterPhoto.src = decodeURIComponent(photo); } catch { letterPhoto.src = photo; }
    } else {
      // fallback sample image
      letterPhoto.src = './img/bambi.jpg';
    }
  }
  const caption = params.get('caption');
  if (photoCaption) {
    photoCaption.textContent = caption ? decodeURIComponent(caption) : 'ความน่ารักของคุณ อิอิ ✨';
  }
}


// Mouse parallax (pointer-fine only)
const scene = document.getElementById("scene");
if (scene && isFinePointer) {
  scene.addEventListener("mousemove", (e) => {
    const rect = lockCard.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    lockCard.style.transform = `rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 12).toFixed(2)}deg)`;
  });
  scene.addEventListener("mouseleave", () => {
    lockCard.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
}

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
// Predeclare heart targets to avoid TDZ in resize handlers
let heartTargets = [];

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
  heartTargets = buildHeartTargets();
  render();
});
// Keep fitting when mobile UI/keyboard changes visual viewport
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    fitCanvas(confettiCanvas);
    fitCanvas(heartsCanvas);
    fitCanvas(morphCanvas);
    fitCanvas(fxCanvas);
    heartTargets = buildHeartTargets();
  });
}

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

const CONFETTI_BURST = isCoarsePointer ? 110 : 160;
function fireConfetti() {
  spawnConfetti(CONFETTI_BURST);
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
const PARTICLE_COUNT = (() => {
  const w = Math.max(320, Math.min(window.innerWidth, 1200));
  const h = Math.max(480, Math.min(window.innerHeight, 1200));
  const area = (w * h) / (DPR * DPR);
  const base = isCoarsePointer ? 0.00045 : 0.0007; // density
  return Math.max(300, Math.min(600, Math.round(area * base)));
})();

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

heartTargets = buildHeartTargets();
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
  // Advanced layered FX for WOW effect
  startOrbits();
  spawnBokehLayer();
  startRibbons();
  startTwinkles();
  
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
    } else if (it.kind === 'bokeh') {
      // Draw behind using destination-over
      ctx.save();
      ctx.globalCompositeOperation = 'destination-over';
      it.x += it.vx; it.y += it.vy;
      if (it.x < -50 || it.x > w + 50) it.vx *= -1;
      if (it.y < -50 || it.y > h + 50) it.vy *= -1;
      const r = it.r * DPR;
      const grd = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, r);
      grd.addColorStop(0, `hsla(${it.hue}deg, 80%, 85%, ${it.alpha * 0.8})`);
      grd.addColorStop(1, `hsla(${it.hue}deg, 80%, 85%, 0)`);
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(it.x, it.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else if (it.kind === 'orbit') {
      it.a += it.av;
      const ox = it.cx + Math.cos(it.a) * it.r * DPR;
      const oy = it.cy + Math.sin(it.a) * it.r * DPR * 0.9;
      ctx.fillStyle = `hsla(${it.hue}deg, 95%, 70%, 0.9)`;
      ctx.shadowColor = `hsla(${it.hue}deg, 95%, 70%, 0.6)`;
      ctx.shadowBlur = 10 * DPR;
      ctx.beginPath(); ctx.arc(ox, oy, it.size * DPR, 0, Math.PI * 2); ctx.fill();
      // faint orbit path
      ctx.shadowBlur = 0; ctx.globalAlpha = 0.25;
      ctx.strokeStyle = `hsla(${it.hue}deg, 85%, 70%, 0.5)`;
      ctx.lineWidth = 0.8 * DPR;
      ctx.beginPath(); ctx.ellipse(it.cx, it.cy, it.r * DPR, it.r * 0.9 * DPR, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (it.kind === 'ribbon') {
      // Update ribbon tail
      it.t += it.vt;
      const angle = it.baseA + Math.sin(it.t * 0.8) * 0.4;
      const rad = it.baseR + Math.sin(it.t * 0.6) * 12 * DPR;
      const px = it.cx + Math.cos(angle) * rad;
      const py = it.cy + Math.sin(angle) * rad * 0.9;
      it.points.push({ x: px, y: py });
      if (it.points.length > it.max) it.points.shift();
      // Draw ribbon path
      ctx.save();
      ctx.strokeStyle = `hsla(${it.hue}deg, 90%, 70%, 0.55)`;
      ctx.lineWidth = 2 * DPR;
      ctx.shadowColor = `hsla(${it.hue}deg, 90%, 70%, 0.6)`;
      ctx.shadowBlur = 12 * DPR;
      ctx.beginPath();
      for (let i = 0; i < it.points.length; i++) {
        const p = it.points[i];
        if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.restore();
    } else if (it.kind === 'twinkle') {
      it.t += 0.1;
      const s = (0.6 + 0.4 * Math.sin(it.t * it.speed));
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(it.rot);
      ctx.scale(s * DPR, s * DPR);
      ctx.fillStyle = `hsla(${it.hue}deg, 100%, 90%, ${0.6 * s})`;
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const r1 = 2.2, r2 = 1.0;
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a + Math.PI / 5) * r2, Math.sin(a + Math.PI / 5) * r2);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
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
คุณ Baby Bambi ที่น่ารักของผม,\n\nเวลาที่คุณเหนื่อย ผมอยากให้รู้ว่า คุณไม่เคยต้องเดินคนเดียวเลย\nเพราะทุกก้าวของคุณ มีผมเดินเคียงข้างเสมอ\n\nบางวันโลกอาจดังและวุ่นวาย แต่หัวใจเราจะเบาและเงียบสงบ\nเมื่อคุณมองมาทางนี้—ผมก็ยิ้มแล้ว :)\n\nพักหายใจสักครู่ แล้วไปต่อด้วยกันนะครับ\nผมภูมิใจในตัวคุณมากๆ และจะอยู่ตรงนี้…\nเพื่อบอกคำเดิมซ้ำๆ ว่า “คุณเก่งและน่ารักที่สุดในโลกของผม”`;

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
    // init scratch mask lazily when opening
    try { initScratch(); } catch {}
    await typeLetter(LETTER_TEXT, 14);
    // Animate signature entrance
    if (signatureWrap) {
      signatureWrap.classList.remove('show');
      // slight delay to allow reflow
      setTimeout(() => signatureWrap.classList.add('show'), 50);
    }
    // Ensure actions are visible and focused for accessibility
    try { btnCloseLetter && btnCloseLetter.focus(); } catch {}
  });
}

if (btnCloseLetter && loveLetter) {
  btnCloseLetter.addEventListener('click', () => {
    loveLetter.classList.remove('show');
    // scroll to top to avoid stuck position on next open (mobile)
    try { const paper = loveLetter.querySelector('.paper'); paper && (paper.scrollTop = 0); } catch {}
    setTimeout(() => { loveLetter.hidden = true; }, 300);
  });
}

if (btnCopyLetter) {
  btnCopyLetter.addEventListener('click', async () => {
    try {
      const sign = (signatureName && signatureName.textContent) ? signatureName.textContent : 'ผม';
      const full = `${LETTER_TEXT}\n\nรัก,\n${sign}`;
      // robust copy with fallback for iOS Safari
      let copied = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(full); copied = true; } catch {}
      }
      if (!copied) {
        const ta = document.createElement('textarea');
        ta.value = full; ta.setAttribute('readonly', ''); ta.style.position = 'absolute'; ta.style.left = '-9999px';
        document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, ta.value.length);
        try { copied = document.execCommand('copy'); } catch {}
        document.body.removeChild(ta);
      }
      if (copied) {
        showLetterToast('คัดลอกจดหมายแล้วนะ ❤');
      } else {
        showLetterToast('คัดลอกไม่สำเร็จ ลองอีกครั้งนะ');
      }
    } catch {}
  });
}

// Tap outside paper to close on mobile
if (loveLetter) {
  loveLetter.addEventListener('pointerdown', (e) => {
    const paper = loveLetter.querySelector('.paper');
    if (!paper) return;
    if (!paper.contains(e.target)) {
      btnCloseLetter && btnCloseLetter.click();
    }
  });
}

function showLetterToast(text) {
  if (!letterToast) return;
  letterToast.textContent = text;
  letterToast.hidden = false;
  requestAnimationFrame(() => {
    letterToast.classList.add('show');
    setTimeout(() => {
      letterToast.classList.remove('show');
      setTimeout(() => { letterToast.hidden = true; }, 300);
    }, 1600);
  });
}

// =============== Scratch-to-reveal photo ===============
function initScratch() {
  if (!scratchCanvas || !letterPhoto) return;
  const ctx = scratchCanvas.getContext('2d');
  const DPR2 = Math.min(2, window.devicePixelRatio || 1);
  // Ensure interactive again if previously revealed
  scratchCanvas.style.pointerEvents = 'auto';
  const drawCover = () => {
    const rect = scratchCanvas.getBoundingClientRect();
    ctx.save();
    ctx.scale(DPR2, DPR2);
    const grd = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    grd.addColorStop(0, 'rgba(255, 182, 193, 0.9)');
    grd.addColorStop(0.5, 'rgba(255, 113, 155, 0.92)');
    grd.addColorStop(1, 'rgba(255, 90, 140, 0.9)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, rect.width, rect.height);
    // add speckles for texture
    ctx.globalAlpha = 0.15;
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const r = Math.random() * 2 + 0.5;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  };
  const resize = () => {
    const rect = scratchCanvas.getBoundingClientRect();
    scratchCanvas.width = Math.floor(rect.width * DPR2);
    scratchCanvas.height = Math.floor(rect.height * DPR2);
    drawCover();
  };
  resize();
  let scratching = false;
  const revealThreshold = 0.5; // 50%
  const scratchRadius = isCoarsePointer ? 28 : 20; // bigger on touch
  const eraseAt = (x, y) => {
    const rect = scratchCanvas.getBoundingClientRect();
    const px = (x - rect.left) * DPR2;
    const py = (y - rect.top) * DPR2;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    // soft brush stroke
    const g = ctx.createRadialGradient(px, py, 0, px, py, scratchRadius * DPR2);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(px, py, scratchRadius * DPR2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  };
  const measureCleared = () => {
    try {
      const img = ctx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height).data;
      let transparent = 0;
      for (let i = 3; i < img.length; i += 4) { if (img[i] === 0) transparent++; }
      const ratio = transparent / (img.length / 4);
      return ratio;
    } catch { return 0; }
  };
  const hint = scratchCanvas.parentElement && scratchCanvas.parentElement.querySelector('.scratch-hint');
  const start = (e) => {
    scratching = true;
    hint && (hint.style.opacity = '0');
    // Pointer capture for consistent drawing outside bounds
    try { if (e.pointerId != null && scratchCanvas.setPointerCapture) scratchCanvas.setPointerCapture(e.pointerId); } catch {}
    draw(e);
  };
  const end = () => {
    scratching = false;
    const r = measureCleared();
    if (r >= revealThreshold) {
      // clear all and remove canvas for perf
      ctx.clearRect(0, 0, scratchCanvas.width, scratchCanvas.height);
      scratchCanvas.style.pointerEvents = 'none';
      if (hint) hint.remove();
      // Celebrate reveal with extra sweetness
      try { sparkleBurst(); ringPulse(); heartFireworks(); } catch {}
    }
  };
  const draw = (e) => {
    if (!scratching) return;
    const touches = e.touches || e.changedTouches;
    if (touches && touches.length) {
      for (let i = 0; i < touches.length; i++) { eraseAt(touches[i].clientX, touches[i].clientY); }
    } else if (e.clientX != null && e.clientY != null) {
      eraseAt(e.clientX, e.clientY);
    }
  };
  const onMove = (e) => { e.preventDefault && e.preventDefault(); draw(e); };
  const onDown = (e) => { e.preventDefault && e.preventDefault(); start(e); };
  const onUp = (e) => { e.preventDefault && e.preventDefault(); end(); };
  const supportsPointer = typeof window !== 'undefined' && 'PointerEvent' in window;
  if (supportsPointer) {
    scratchCanvas.addEventListener('pointerdown', onDown, { passive: false });
    scratchCanvas.addEventListener('pointermove', onMove, { passive: false });
    scratchCanvas.addEventListener('pointerup', onUp, { passive: false });
    scratchCanvas.addEventListener('pointercancel', onUp, { passive: false });
    scratchCanvas.addEventListener('pointerleave', onUp, { passive: false });
  } else {
    // Touch fallback
    scratchCanvas.addEventListener('touchstart', onDown, { passive: false });
    scratchCanvas.addEventListener('touchmove', onMove, { passive: false });
    scratchCanvas.addEventListener('touchend', onUp, { passive: false });
    scratchCanvas.addEventListener('touchcancel', onUp, { passive: false });
    // Mouse fallback
    scratchCanvas.addEventListener('mousedown', onDown, { passive: false });
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp, { passive: false });
  }
  window.addEventListener('resize', resize);
}

// One-tap mega show to make it denser and wow
function fireMegaShow() {
  fireConfetti(); setTimeout(fireConfetti, 200); setTimeout(fireConfetti, 400);
  sparkleBurst(); setTimeout(sparkleBurst, 120);
  ringPulse(); setTimeout(ringPulse, 240);
  heartFireworks(); setTimeout(heartFireworks, 300);
  petalShower();
  playChime();
  // extra layers
  startOrbits();
  startRibbons();
  startTwinkles();
}

// =============== Advanced WOW Layers ===============
function startOrbits() {
  const w = fxCanvas.width, h = fxCanvas.height;
  const cx = w / 2, cy = h * 0.38;
  const radii = [48, 86, 124].map(r => r * DPR);
  for (let i = 0; i < radii.length; i++) {
    const count = 6 + i * 3;
    for (let j = 0; j < count; j++) {
      fxItems.push({
        kind: 'orbit',
        cx, cy,
        r: radii[i],
        a: (j / count) * Math.PI * 2,
        av: (0.003 + i * 0.001) * (j % 2 ? 1 : -1),
        hue: 330 + (i * 10) + (j % 6) * 3,
        size: 1.4 + i * 0.4,
        life: 1200
      });
    }
  }
}

function spawnBokehLayer() {
  const w = fxCanvas.width, h = fxCanvas.height;
  for (let i = 0; i < 18; i++) {
    fxItems.push({
      kind: 'bokeh',
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.15 * DPR,
      vy: (Math.random() - 0.5) * 0.12 * DPR,
      r: 40 + Math.random() * 90,
      hue: 320 + Math.random() * 30,
      alpha: 0.15 + Math.random() * 0.15,
      life: 1600
    });
  }
}

function startRibbons() {
  const w = fxCanvas.width, h = fxCanvas.height;
  const cx = w / 2, cy = h * 0.38;
  for (let i = 0; i < 4; i++) {
    fxItems.push({
      kind: 'ribbon',
      cx, cy,
      baseR: (70 + i * 20) * DPR,
      baseA: Math.random() * Math.PI * 2,
      vt: 0.03 + Math.random() * 0.02,
      hue: 335 + i * 5,
      points: [],
      max: 60 + i * 14,
      t: Math.random() * 100,
      life: 1200
    });
  }
}

function startTwinkles() {
  const w = fxCanvas.width, h = fxCanvas.height;
  const cx = w / 2, cy = h * 0.38;
  for (let i = 0; i < 30; i++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = (40 + Math.random() * 140) * DPR;
    fxItems.push({
      kind: 'twinkle',
      x: cx + Math.cos(ang) * rad,
      y: cy + Math.sin(ang) * rad * 0.9,
      rot: Math.random() * Math.PI,
      hue: 330 + Math.random() * 30,
      speed: 0.6 + Math.random() * 1.2,
      t: Math.random() * Math.PI * 2,
      life: 600 + Math.random() * 600
    });
  }
}
