const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const sizeInput = document.getElementById("size");
const intervalInput = document.getElementById("interval");
const applyBtn = document.getElementById("apply");

let n = clampInt(parseInt(sizeInput.value, 10), 2, 50);
let rotateInterval = clampInt(parseInt(intervalInput.value, 10), 100, 10000);
let running = true;

let width = 0;
let height = 0;
let cell = 0;
let gridW = 0;
let gridH = 0;
let offsetX = 0;
let offsetY = 0;

let matrix = [];
let borderPositions = [];
let borderSet = new Set();

let fontNum = "16px Segoe UI";
let fontNumBold = "bold 16px Segoe UI";
let fontDate = "16px Segoe UI";
let fontHint = "14px Segoe UI";

const COLORS = {
  bg: "#000000",
  grid: "#505258",
  text: "#dc3232",
  textBorder: "#ffffff",
  glow: "#648cc8",
  date: "#8c8e92",
  hint: "#64666a",
  pattern: "#0c0c0f"
};

let lastRotate = performance.now();
let bgCanvas = document.createElement("canvas");
let bgCtx = bgCanvas.getContext("2d");

function clampInt(v, min, max) {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function rebuildMatrix() {
  matrix = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) {
      row.push(i * n + j + 1);
    }
    matrix.push(row);
  }

  borderPositions = [];
  for (let j = 0; j < n; j++) borderPositions.push([0, j]);
  for (let i = 1; i < n - 1; i++) borderPositions.push([i, n - 1]);
  for (let j = n - 1; j >= 0; j--) borderPositions.push([n - 1, j]);
  for (let i = n - 2; i >= 1; i--) borderPositions.push([i, 0]);

  borderSet = new Set(borderPositions.map(([i, j]) => `${i},${j}`));
}

function resize() {
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = width;
  canvas.height = height;

  const maxCell = Math.min(Math.floor((width - 160) / n), Math.floor((height - 160) / n));
  cell = Math.min(maxCell, 100);
  gridW = n * cell;
  gridH = n * cell;
  offsetX = Math.floor((width - gridW) / 2);
  offsetY = Math.floor((height - gridH) / 2) - 30;

  const numSize = Math.max(10, Math.floor(cell * 0.42));
  const dateSize = Math.max(16, Math.floor(cell * 0.24));
  const hintSize = Math.max(14, Math.floor(cell * 0.20));

  fontNum = `${numSize}px Segoe UI`;
  fontNumBold = `bold ${numSize}px Segoe UI`;
  fontDate = `${dateSize}px Segoe UI`;
  fontHint = `${hintSize}px Segoe UI`;

  buildBackground();
}

function buildBackground() {
  bgCanvas.width = width;
  bgCanvas.height = height;
  bgCtx.fillStyle = COLORS.bg;
  bgCtx.fillRect(0, 0, width, height);

  bgCtx.strokeStyle = COLORS.pattern;
  bgCtx.lineWidth = 1;

  for (let offset = 0; offset < 360; offset += 30) {
    bgCtx.beginPath();
    let first = true;
    for (let t = 0; t <= 360; t += 3) {
      const angle = (t * Math.PI) / 180;
      const x = Math.floor(width / 2 + width * 0.4 * Math.sin(3 * angle + (offset * Math.PI) / 180));
      const y = Math.floor(height / 2 + height * 0.4 * Math.sin(2 * angle));
      if (first) {
        bgCtx.moveTo(x, y);
        first = false;
      } else {
        bgCtx.lineTo(x, y);
      }
    }
    bgCtx.stroke();
  }

  for (const mult of [0.15, 0.25, 0.35]) {
    const radius = Math.floor(Math.min(width, height) * mult);
    bgCtx.beginPath();
    bgCtx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    bgCtx.stroke();
  }
}

function getBorder() {
  const border = [];
  for (let j = 0; j < n; j++) border.push(matrix[0][j]);
  for (let i = 1; i < n - 1; i++) border.push(matrix[i][n - 1]);
  for (let j = n - 1; j >= 0; j--) border.push(matrix[n - 1][j]);
  for (let i = n - 2; i >= 1; i--) border.push(matrix[i][0]);
  return border;
}

function setBorder(border) {
  let idx = 0;
  for (let j = 0; j < n; j++) matrix[0][j] = border[idx++];
  for (let i = 1; i < n - 1; i++) matrix[i][n - 1] = border[idx++];
  for (let j = n - 1; j >= 0; j--) matrix[n - 1][j] = border[idx++];
  for (let i = n - 2; i >= 1; i--) matrix[i][0] = border[idx++];
}

function rotateBorder(clockwise = true) {
  const border = getBorder();
  if (clockwise) {
    border.unshift(border.pop());
  } else {
    border.push(border.shift());
  }
  setBorder(border);
}

function drawMatrix() {
  ctx.drawImage(bgCanvas, 0, 0);

  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.grid;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = offsetX + j * cell;
      const y = offsetY + i * cell;

      ctx.strokeRect(x, y, cell, cell);

      const val = String(matrix[i][j]);
      const isBorder = borderSet.has(`${i},${j}`);

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      if (isBorder) {
        ctx.font = fontNum;
        ctx.fillStyle = COLORS.glow;
        const cx = x + cell / 2;
        const cy = y + cell / 2;
        ctx.fillText(val, cx - 1, cy);
        ctx.fillText(val, cx + 1, cy);
        ctx.fillText(val, cx, cy - 1);
        ctx.fillText(val, cx, cy + 1);

        ctx.fillStyle = COLORS.textBorder;
        ctx.fillText(val, cx, cy);
      } else {
        ctx.font = fontNum;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(val, x + cell / 2, y + cell / 2);
      }
    }
  }

  const now = new Date();
  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];

  const day = days[(now.getDay() + 6) % 7];
  const date = String(now.getDate()).padStart(2, "0");
  const month = months[now.getMonth()];
  const year = now.getFullYear();

  const dateStr = `${day}  ${date}  ${month}  ${year}`;

  ctx.font = fontDate;
  ctx.fillStyle = COLORS.date;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(dateStr, width / 2, height - 40);

  ctx.font = fontHint;
  ctx.fillStyle = COLORS.hint;
  ctx.fillText("R  CW  |  L  CCW  |  Esc  Pause", width / 2, height - 72);
}

function loop(ts) {
  if (running) {
    if (ts - lastRotate >= rotateInterval) {
      rotateBorder(true);
      lastRotate = ts;
    }
    drawMatrix();
  }
  requestAnimationFrame(loop);
}

applyBtn.addEventListener("click", () => {
  n = clampInt(parseInt(sizeInput.value, 10), 2, 50);
  rotateInterval = clampInt(parseInt(intervalInput.value, 10), 100, 10000);
  rebuildMatrix();
  resize();
});

intervalInput.addEventListener("change", () => {
  rotateInterval = clampInt(parseInt(intervalInput.value, 10), 100, 10000);
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    running = !running;
  }
  if (e.key === "r" || e.key === "R") {
    rotateBorder(true);
    lastRotate = performance.now();
  }
  if (e.key === "l" || e.key === "L") {
    rotateBorder(false);
    lastRotate = performance.now();
  }
});

window.addEventListener("resize", resize);

rebuildMatrix();
resize();
requestAnimationFrame(loop);
