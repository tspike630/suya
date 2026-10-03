import { continueGame, createGame, launch, restore, serialize } from "./engine.js?v=10";
import { items, people, scenes, scripts, startingItems, tracks } from "./story.js?v=10";
import { maps } from "./maps.js?v=10";

const SAVE_KEY = "suya-save";
const MUTE_KEY = "suya-mute";
const SPEED = [68, 30, 10];

const shell = document.querySelector("#shell");
const view = document.querySelector("#view");
const dock = document.querySelector("#dock");
const layer = document.querySelector("#layer");
const panel = document.querySelector("#panel");
const where = document.querySelector("#where");
const menuBtn = document.querySelector("#menu-btn");
const soundBtn = document.querySelector("#sound-btn");
const toast = document.querySelector("#toast");
const sky = document.querySelector("#sky");

const game = createGame();
let overlay = null;
let lineDone = true;
let typeTimer = 0;
let autoTimer = 0;
let waitTimer = 0;
let toastTimer = 0;
let rhythm = null;
let audioReady = false;

const bgm = new Audio();
bgm.loop = true;
bgm.volume = 0.5;
game.muted = localStorage.getItem(MUTE_KEY) === "1";

const stars = Array.from({ length: 70 }, () => ({
  x: Math.random(),
  y: Math.random() * 0.72,
  r: Math.random() * 1.3 + 0.3,
  p: Math.random() * Math.PI * 2,
}));

function mount(id) {
  const tpl = document.querySelector(`#tpl-${id}`);
  view.replaceChildren(tpl.content.cloneNode(true));
}

function hasSave() {
  return Boolean(localStorage.getItem(SAVE_KEY));
}

function persist() {
  if (!scenes[game.scene] || !maps[game.scene]) return;
  const data = serialize(game);
  data.x = player.x;
  data.y = player.y;
  data.dir = player.dir;
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}

function showToast(text) {
  toast.textContent = text;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 1600);
}

function clearTimers() {
  clearTimeout(typeTimer);
  clearTimeout(autoTimer);
  clearTimeout(waitTimer);
  if (rhythm?.raf) cancelAnimationFrame(rhythm.raf);
}

function syncDockSpace() {
  const height = dock.hidden ? 0 : Math.ceil(dock.getBoundingClientRect().height);
  shell.style.setProperty("--dock-space", `${height}px`);
}

function applyAtmosphere() {
  const scene = scenes[game.scene];
  shell.dataset.scene = game.scene;
  let rain = "none";
  if (game.scene === "title") rain = "soft";
  else if (scene) rain = game.scene === "star" && game.weather === "heavy" ? "hard" : scene.rain;
  shell.dataset.rain = rain;
  shell.classList.toggle("is-busy", game.phase !== "idle" || overlay !== null);
  if (game.phase !== "wait") delete shell.dataset.fx;
}

function playMusic(src) {
  if (!src || game.muted) {
    bgm.pause();
    return;
  }
  if (!audioReady) return;
  if (bgm.getAttribute("data-src") === src && !bgm.paused) return;
  bgm.src = src;
  bgm.setAttribute("data-src", src);
  bgm.play().catch(() => {});
}

function syncMusic() {
  const src = tracks[game.scene] || "";
  soundBtn.textContent = game.muted ? "开声音" : "声音";
  playMusic(src);
}

function unlockAudio() {
  audioReady = true;
  syncMusic();
}

const STEP = { down: [0, -1], up: [0, 1], left: [-1, 0], right: [1, 0] };
const ROW = { down: 0, left: 1, right: 2, up: 3 };
const WALK = {
  粟牙: "assets/sprites/suya.png",
  域零: "assets/sprites/yuling.png",
  雪兰: "assets/sprites/xuelan.png",
  林桔: "assets/sprites/linju.png",
};
const STAND = { 兮: "assets/characters/xi.png" };

const player = { x: 0, y: 0, dir: "down", frame: 1, walk: 0 };
const cam = { x: 0, y: 0 };
const held = { up: false, down: false, left: false, right: false };
const pictures = new Map();
let world = null;
let walkTarget = null;
let lastTick = 0;

function picture(src) {
  let img = pictures.get(src);
  if (!img) {
    img = new Image();
    img.src = src.replace(/[^/]+$/, (name) => encodeURIComponent(name));
    pictures.set(src, img);
  }
  return img;
}

function preloadMap(map) {
  for (const tile of map.tiles) picture(`assets/map/${tile.file}`);
  for (const src of Object.values(WALK)) picture(src);
  for (const src of Object.values(STAND)) picture(src);
}

function showTitle() {
  clearTimers();
  overlay = null;
  world = null;
  walkTarget = null;
  game.scene = "title";
  game.phase = "idle";
  game.current = null;
  closeLayer();
  mount("title");
  dock.hidden = true;
  menuBtn.hidden = true;
  soundBtn.hidden = false;
  where.textContent = "";
  delete shell.dataset.px;
  delete shell.dataset.py;
  const cont = view.querySelector("#continue-btn");
  if (cont) cont.hidden = !hasSave();
  syncDockSpace();
  applyAtmosphere();
  syncMusic();
  document.title = "粟牙";
}

function viewBounds(map) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const add = (x, y, w = 0, h = 0) => {
    minX = Math.min(minX, x - w / 2);
    maxX = Math.max(maxX, x + w / 2);
    minY = Math.min(minY, y - h / 2);
    maxY = Math.max(maxY, y + h / 2);
  };
  for (const tile of map.tiles) add(tile.x, tile.y, tile.w, tile.h);
  for (const npc of map.npcs) add(npc.x, npc.y, 1, 1);
  const box = limitsOf(map);
  add(box.minX, box.minY);
  add(box.maxX, box.maxY);
  return { minX, maxX, minY, maxY };
}

function limitsOf(map) {
  const start = map.points.startDot;
  const end = map.points.endDot;
  return {
    minX: start.x + 0.25,
    maxX: end.x - 0.25,
    maxY: start.y - 0.25,
    minY: end.y + 0.425,
  };
}

function enterMap(id, tp, face) {
  const map = maps[id];
  if (!map) return;
  clearTimers();
  overlay = null;
  walkTarget = null;
  game.scene = id;
  closeLayer();
  if (!view.querySelector("#world")) mount("play");
  world = view.querySelector("#world");
  dock.hidden = true;
  menuBtn.hidden = false;
  soundBtn.hidden = false;
  shell.style.setProperty("--dock-space", "12px");
  where.textContent = map.name;
  document.title = `粟牙 · ${map.name}`;
  if (tp && map.points[`tp${tp}`]) {
    player.x = map.points[`tp${tp}`].x;
    player.y = map.points[`tp${tp}`].y;
    if (face) player.dir = face;
  } else if (map.spawn) {
    player.x = map.spawn.x;
    player.y = map.spawn.y;
    player.dir = map.spawn.dir || "down";
  }
  cam.x = player.x;
  cam.y = player.y;
  preloadMap(map);
  applyAtmosphere();
  syncMusic();
  refreshAct();
}

function overlap(a, b) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w - 0.004 && Math.abs(a.y - b.y) * 2 < a.h + b.h - 0.004;
}

function footAt(x, y) {
  return { x: x - 0.014, y: y - 0.278, w: 0.29, h: 0.4 };
}

function solidBlocks(box) {
  const map = maps[game.scene];
  if (!map) return false;
  return map.solids.some((solid) => {
    if (!overlap(box, solid)) return false;
    const hiddenNpc = map.npcs.some(
      (npc) => npc.hide && game.hidden[npc.hide] && Math.abs(npc.x - solid.x) < 0.7 && Math.abs(npc.y - solid.y) < 0.7,
    );
    return !hiddenNpc;
  });
}

function clampPlayer() {
  const box = limitsOf(maps[game.scene]);
  if (player.x < box.minX) player.x = box.minX;
  if (player.x > box.maxX) player.x = box.maxX;
  if (player.y > box.maxY) player.y = box.maxY;
  if (player.y < box.minY) player.y = box.minY;
}

function moveBy(dx, dy) {
  if (dx && !solidBlocks(footAt(player.x + dx, player.y))) player.x += dx;
  if (dy && !solidBlocks(footAt(player.x, player.y + dy))) player.y += dy;
  clampPlayer();
}

function contains(spot, x, y) {
  const pad = 0.16;
  return Math.abs(x - spot.x) * 2 <= spot.w + pad * 2 && Math.abs(y - spot.y) * 2 <= spot.h + pad * 2;
}

function facingSpot() {
  const map = maps[game.scene];
  if (!map) return null;
  const [dx, dy] = STEP[player.dir] || [0, 1];
  const probes = [
    [player.x + dx * 0.46, player.y + dy * 0.46],
    [player.x + dx * 0.22, player.y + dy * 0.22],
  ];
  const hits = [];
  for (const spot of map.hotspots) {
    if (spot.hide && game.hidden[spot.hide]) continue;
    if (spot.dirs && spot.dirs.length && !spot.dirs.includes(player.dir)) continue;
    if (!probes.some(([x, y]) => contains(spot, x, y))) continue;
    hits.push(spot);
  }
  hits.sort((a, b) => a.w * a.h - b.w * b.h);
  return hits[0] || null;
}

function refreshAct() {
  const btn = view.querySelector("#act-btn");
  if (!btn) return;
  const spot = game.phase === "idle" && !overlay ? facingSpot() : null;
  btn.textContent = !spot ? "调查" : spot.go ? "进入" : spot.kind === "person" || spot.kind === "echo" ? "对话" : "调查";
}

function interact() {
  if (game.phase !== "idle" || overlay || !maps[game.scene]) return;
  unlockAudio();
  const spot = facingSpot();
  if (!spot) return;
  if (spot.weather) {
    game.weather = spot.weather;
    applyAtmosphere();
    showToast(spot.weather === "heavy" ? "暴雨" : "细雨");
    persist();
    return;
  }
  if (spot.go) {
    enterMap(spot.go, spot.tp, spot.face);
    persist();
    return;
  }
  if (spot.script) openScript(scripts[spot.script]);
}

function canWalk() {
  return Boolean(world) && game.phase === "idle" && !overlay && maps[game.scene];
}

function tickMove(dt) {
  if (!canWalk()) {
    player.walk = 0;
    return;
  }
  let x = 0;
  let y = 0;
  if (held.left) x -= 1;
  if (held.right) x += 1;
  if (held.up) y += 1;
  if (held.down) y -= 1;
  if (x || y) walkTarget = null;
  if (!x && !y && walkTarget) {
    const dx = walkTarget.x - player.x;
    const dy = walkTarget.y - player.y;
    if (Math.hypot(dx, dy) < 0.08) walkTarget = null;
    else if (Math.abs(dx) > Math.abs(dy)) x = Math.sign(dx);
    else y = Math.sign(dy);
  }
  if (x && y) {
    x *= 0.707;
    y *= 0.707;
  }
  if (x || y) {
    const speed = 3.3 * dt;
    moveBy(x * speed, y * speed);
    if (Math.abs(x) > Math.abs(y)) player.dir = x < 0 ? "left" : "right";
    else player.dir = y < 0 ? "down" : "up";
    player.walk += dt;
    if (player.walk > 0.14) {
      player.walk = 0;
      player.frame = (player.frame + 1) % 3;
    }
  } else {
    player.walk = 0;
    player.frame = 1;
  }
  shell.dataset.px = player.x.toFixed(2);
  shell.dataset.py = player.y.toFixed(2);
  refreshAct();
}

function drawField() {
  if (!world || !maps[game.scene]) return;
  const width = world.clientWidth;
  const height = world.clientHeight;
  if (!width || !height) return;
  const ratio = window.devicePixelRatio || 1;
  if (world.width !== Math.floor(width * ratio) || world.height !== Math.floor(height * ratio)) {
    world.width = Math.floor(width * ratio);
    world.height = Math.floor(height * ratio);
  }
  const ctx = world.getContext("2d");
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const zoom = height / 6.4;
  const map = maps[game.scene];
  cam.x += (player.x - cam.x) * 0.18;
  cam.y += (player.y - cam.y) * 0.18;
  const frame = viewBounds(map);
  const halfW = width / zoom / 2;
  const halfH = height / zoom / 2;
  if (frame.maxX - frame.minX <= halfW * 2) cam.x = (frame.minX + frame.maxX) / 2;
  else cam.x = Math.min(frame.maxX - halfW, Math.max(frame.minX + halfW, cam.x));
  if (frame.maxY - frame.minY <= halfH * 2) cam.y = (frame.minY + frame.maxY) / 2;
  else cam.y = Math.min(frame.maxY - halfH, Math.max(frame.minY + halfH, cam.y));
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = game.scene === "star" ? "rgba(7, 8, 16, 0.35)" : "#17191f";
  ctx.fillRect(0, 0, width, height);
  const pieces = [];
  for (const tile of map.tiles) {
    const hidden = map.hotspots.some(
      (spot) => spot.hide && game.hidden[spot.hide] && Math.abs(spot.x - tile.x) < 0.35 && Math.abs(spot.y - tile.y) < 0.35,
    );
    if (!hidden) pieces.push({ kind: "tile", z: tile.z || 0, y: tile.y, tile });
  }
  for (const npc of map.npcs) {
    if (npc.hide && game.hidden[npc.hide]) continue;
    pieces.push({ kind: "chara", z: 3, y: npc.y, who: npc.who, x: npc.x, dir: npc.dir, scale: npc.scale || 2 });
  }
  pieces.push({ kind: "chara", z: 3, y: player.y, who: "粟牙", x: player.x, dir: player.dir, scale: 2, frame: player.frame });
  pieces.sort((a, b) => a.z - b.z || b.y - a.y);
  for (const piece of pieces) {
    if (piece.kind === "tile") drawTile(ctx, piece.tile, zoom, width, height);
    else drawChara(ctx, piece, zoom, width, height);
  }
}

function screenOf(x, y, zoom, width, height) {
  return [(x - cam.x) * zoom + width / 2, (cam.y - y) * zoom + height / 2];
}

function drawTile(ctx, tile, zoom, width, height) {
  const img = picture(`assets/map/${tile.file}`);
  if (!img.complete || !img.naturalWidth) return;
  const dw = tile.w * zoom;
  const dh = tile.h * zoom;
  const [sx, sy] = screenOf(tile.x, tile.y, zoom, width, height);
  const cropX = tile.sx || 0;
  const cropY = tile.sy || 0;
  const cropW = tile.sw || img.naturalWidth;
  const cropH = tile.sh || img.naturalHeight;
  ctx.save();
  ctx.globalAlpha = tile.a == null ? 1 : tile.a;
  ctx.translate(sx, sy);
  if (tile.rot) ctx.rotate(-tile.rot);
  ctx.scale(tile.fx ? -1 : 1, tile.fy ? -1 : 1);
  ctx.translate(-sx, -sy);
  const left = sx - dw / 2;
  const top = sy - dh / 2;
  if (tile.mode === "tile") {
    const cols = Math.max(1, Math.round(tile.w / (cropW / 100)));
    const rows = Math.max(1, Math.round(tile.h / (cropH / 100)));
    const cw = dw / cols;
    const rh = dh / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        ctx.drawImage(img, cropX, cropY, cropW, cropH, left + col * cw, top + row * rh, cw + 0.6, rh + 0.6);
      }
    }
  } else {
    ctx.drawImage(img, cropX, cropY, cropW, cropH, left, top, dw, dh);
  }
  ctx.restore();
}

function drawChara(ctx, piece, zoom, width, height) {
  const stand = STAND[piece.who];
  const [sx, sy] = screenOf(piece.x, piece.y, zoom, width, height);
  if (stand) {
    const img = picture(stand);
    if (!img.complete || !img.naturalWidth) return;
    const dh = 1.35 * zoom;
    const dw = dh * (img.naturalWidth / img.naturalHeight);
    ctx.drawImage(img, sx - dw / 2, sy - dh * 0.72, dw, dh);
    return;
  }
  const img = picture(WALK[piece.who] || WALK.粟牙);
  if (!img.complete || !img.naturalWidth) return;
  const frame = piece.frame == null ? 1 : piece.frame;
  const row = ROW[piece.dir] || 0;
  const size = 0.48 * (piece.scale || 2) * zoom;
  ctx.drawImage(img, frame * 48, row * 48, 48, 48, sx - size / 2, sy - size / 2, size, size);
}

function pointWorld(event) {
  const rect = world.getBoundingClientRect();
  const zoom = rect.height / 6.4;
  const x = ((event.clientX - rect.left) / rect.width) * rect.width;
  const y = ((event.clientY - rect.top) / rect.height) * rect.height;
  return [(x - rect.width / 2) / zoom + cam.x, (rect.height / 2 - y) / zoom + cam.y];
}

function tick(now) {
  const dt = Math.min(0.05, lastTick ? (now - lastTick) / 1000 : 0.016);
  lastTick = now;
  tickMove(dt);
  drawField();
  requestAnimationFrame(tick);
}

function openLayer() {
  layer.hidden = false;
  shell.classList.add("is-busy");
}

function closeLayer() {
  layer.hidden = true;
  panel.replaceChildren();
  panel.className = "";
  delete shell.dataset.fx;
  shell.classList.remove("is-busy");
  highlight("");
}

function highlight(who) {
  const scene = view.querySelector(".scene");
  if (!scene) return;
  const known = Boolean(who && people[who]);
  scene.classList.toggle("is-talking", known);
  for (const fig of scene.querySelectorAll(".cast-fig")) {
    fig.classList.toggle("is-on", known && fig.dataset.who === who);
  }
}

function openScript(commands) {
  launch(game, commands);
  renderPhase();
}

function renderPhase() {
  if (game.phase === "go") {
    const cmd = game.current;
    game.phase = "idle";
    game.current = null;
    enterMap(cmd.to, cmd.tp, cmd.face);
    if (cmd.boot && scripts[cmd.boot]) openScript(scripts[cmd.boot]);
    return;
  }
  if (game.phase === "ending") {
    game.endingSeen = true;
    game.phase = "idle";
    game.current = null;
    overlay = "ending";
    renderEnding();
    persist();
    return;
  }
  if (game.phase === "idle") {
    overlay = null;
    closeLayer();
    if (scenes[game.scene]) {
      refreshAct();
      persist();
    }
    applyAtmosphere();
    return;
  }
  openLayer();
  applyAtmosphere();
  switch (game.phase) {
    case "line":
      renderLine();
      break;
    case "choice":
      renderChoice();
      break;
    case "wait":
      renderWait();
      break;
    case "doc":
      renderDoc();
      break;
    case "item":
      renderItem();
      break;
    case "rhythm":
      renderRhythm();
      break;
    default: {
      const unknown = game.phase;
      throw new Error("unknown phase: " + unknown);
    }
  }
}

function renderLine() {
  clearTimers();
  const cmd = game.current;
  const mode = cmd.mode || "box";
  panel.className = `dialog-wrap mode-${mode}`;
  highlight(cmd.who);
  const article = document.createElement("article");
  article.className = "dialog";
  const speech = document.createElement("div");
  speech.className = "speech";
  const who = cmd.who || (mode === "spy" ? "调查" : "旁白");
  speech.append(element("h2", "name", who));
  const line = element("p", "", "");
  line.id = "line";
  speech.append(line);
  const caret = document.createElement("img");
  caret.className = "cont";
  caret.alt = "";
  caret.src = "assets/ui/continue.png";
  caret.hidden = true;
  speech.append(caret);
  article.append(speech);
  panel.replaceChildren(article);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const full = cmd.text;
  if (reduce) {
    line.textContent = full;
    lineDone = true;
    caret.hidden = false;
    scheduleAuto();
    return;
  }
  lineDone = false;
  let index = 0;
  const step = () => {
    index += 1;
    line.textContent = full.slice(0, index);
    if (index >= full.length) {
      lineDone = true;
      caret.hidden = false;
      scheduleAuto();
      return;
    }
    typeTimer = setTimeout(step, SPEED[game.textSpeed]);
  };
  typeTimer = setTimeout(step, SPEED[game.textSpeed]);
}

function finishLine() {
  const line = panel.querySelector("#line");
  const caret = panel.querySelector(".cont");
  if (line && game.current) line.textContent = game.current.text;
  if (caret) caret.hidden = false;
  lineDone = true;
  clearTimeout(typeTimer);
  scheduleAuto();
}

function scheduleAuto() {
  if (!game.auto || game.phase !== "line" || overlay) return;
  const length = game.current?.text?.length || 0;
  autoTimer = setTimeout(onAdvance, Math.min(4200, 700 + length * 45));
}

function renderChoice() {
  clearTimers();
  const cmd = game.current;
  panel.className = "dialog-wrap mode-box";
  highlight(cmd.who);
  const article = document.createElement("article");
  article.className = "dialog";
  const speech = document.createElement("div");
  speech.className = "speech";
  speech.append(element("h2", "name", cmd.who || "选择"));
  speech.append(element("p", "", cmd.prompt));
  const choices = document.createElement("div");
  choices.className = "choices";
  cmd.options.forEach((option, index) => {
    const btn = element("button", "", option.label);
    btn.type = "button";
    btn.dataset.action = "choice";
    btn.dataset.index = String(index);
    choices.append(btn);
  });
  speech.append(choices);
  article.append(speech);
  panel.replaceChildren(article);
}

function renderWait() {
  clearTimers();
  panel.className = "dialog-wrap mode-spy";
  const article = document.createElement("article");
  article.className = "dialog";
  article.append(element("p", "wait-line", "……"));
  panel.replaceChildren(article);
  shell.dataset.fx = game.current.fx || "";
  waitTimer = setTimeout(onAdvance, game.current.ms || 1000);
}

function renderDoc() {
  clearTimers();
  panel.className = "sheet";
  const card = document.createElement("article");
  card.className = "paper";
  card.append(element("h2", "paper-title", game.current.title));
  for (const line of game.current.lines) card.append(element("p", "", line));
  const btn = element("button", "text-btn", "合上");
  btn.type = "button";
  btn.dataset.action = "advance";
  card.append(btn);
  panel.replaceChildren(card);
}

function renderItem() {
  clearTimers();
  panel.className = "sheet";
  const info = items[game.current.id];
  const card = document.createElement("article");
  card.className = "item-card";
  card.append(element("h2", "", info ? info.name : "东西"));
  card.append(element("p", "", info ? info.text : ""));
  const btn = element("button", "text-btn", "收起");
  btn.type = "button";
  btn.dataset.action = "advance";
  card.append(btn);
  panel.replaceChildren(card);
}

function renderRhythm() {
  clearTimers();
  panel.className = "rhythm-wrap";
  const box = document.createElement("div");
  box.className = "rhythm";
  box.append(element("p", "", "圆圈走到左侧红线时按下"));
  const track = document.createElement("div");
  track.className = "track";
  track.append(element("i", "bar", ""));
  const bead = element("i", "bead", "");
  track.append(bead);
  box.append(track);
  const hit = element("button", "hit-btn", "踩点");
  hit.type = "button";
  hit.dataset.action = "hit";
  box.append(hit);
  const score = element("p", "rhythm-score", "0 / 8");
  box.append(score);
  panel.replaceChildren(box);
  rhythm = { index: 0, hits: 0, start: 0, duration: 1700, raf: 0, bead, score, hit, done: false };
  nextNote();
}

function nextNote() {
  if (!rhythm || rhythm.done) return;
  if (rhythm.index >= 8) {
    rhythm.done = true;
    rhythm.score.textContent = `对准 ${rhythm.hits} / 8`;
    rhythm.hit.textContent = "回来";
    rhythm.hit.dataset.action = "advance";
    return;
  }
  rhythm.duration = Math.max(1100, 1700 - rhythm.index * 70);
  rhythm.start = performance.now();
  rhythm.raf = requestAnimationFrame(tickNote);
}

function tickNote(now) {
  if (!rhythm || rhythm.done) return;
  const progress = Math.min(1, (now - rhythm.start) / rhythm.duration);
  rhythm.bead.style.left = `${92 - progress * 78}%`;
  if (progress >= 1) {
    markHit(false);
    return;
  }
  rhythm.raf = requestAnimationFrame(tickNote);
}

function judgeHit() {
  if (!rhythm || rhythm.done) return;
  cancelAnimationFrame(rhythm.raf);
  const left = Number.parseFloat(rhythm.bead.style.left);
  const diff = Math.abs(left - 14);
  markHit(diff < 12);
}

function markHit(ok) {
  if (!rhythm || rhythm.done) return;
  if (ok) rhythm.hits += 1;
  rhythm.hit.classList.toggle("ok", ok);
  rhythm.hit.classList.toggle("bad", !ok);
  rhythm.index += 1;
  rhythm.score.textContent = `${rhythm.hits} / 8`;
  setTimeout(() => {
    if (!rhythm) return;
    rhythm.hit.classList.remove("ok", "bad");
    nextNote();
  }, 280);
}

function renderEnding() {
  openLayer();
  panel.className = "sheet";
  const card = document.createElement("article");
  card.className = "ending";
  card.append(element("h2", "", game.flags.crossed ? "对岸" : "绿灯"));
  card.append(element("p", "", game.flags.crossed ? "雨停在身后。课还没有结束。" : "即便这只是一场终会醒来的梦..."));
  const row = document.createElement("div");
  row.className = "row";
  const leave = element("button", "primary", "离开");
  leave.type = "button";
  leave.dataset.action = "leave";
  const stay = element("button", "text-btn", "留在画里");
  stay.type = "button";
  stay.dataset.action = "stay";
  row.append(leave, stay);
  card.append(row);
  panel.replaceChildren(card);
  applyAtmosphere();
}

function openMenu() {
  clearTimers();
  overlay = "menu";
  openLayer();
  panel.className = "sheet";
  const card = document.createElement("article");
  card.className = "menu";
  card.append(element("h2", "", "菜单"));
  card.append(element("p", "", "进度记在这台浏览器里。"));
  const speeds = document.createElement("div");
  speeds.className = "row";
  ["慢", "中", "快"].forEach((label, index) => {
    const btn = element("button", "text-btn", label);
    btn.type = "button";
    btn.dataset.action = "speed";
    btn.dataset.index = String(index);
    if (game.textSpeed === index) btn.classList.add("primary");
    speeds.append(btn);
  });
  card.append(speeds);
  const row = document.createElement("div");
  row.className = "row";
  const auto = element("button", "text-btn", game.auto ? "自动：开" : "自动：关");
  auto.type = "button";
  auto.dataset.action = "auto";
  const title = element("button", "text-btn", "回到标题");
  title.type = "button";
  title.dataset.action = "title";
  const wipe = element("button", "text-btn", "清除进度");
  wipe.type = "button";
  wipe.dataset.action = "wipe";
  const close = element("button", "primary", "继续");
  close.type = "button";
  close.dataset.action = "close-menu";
  row.append(auto, title, wipe, close);
  card.append(row);
  const owned = game.items.map((id) => items[id]?.name).filter(Boolean);
  card.append(element("p", "", owned.length ? `带着：${owned.join("、")}` : "什么都没拿着。"));
  const log = document.createElement("ol");
  log.className = "log";
  for (const entry of game.log.slice(-40).reverse()) {
    const li = document.createElement("li");
    const name = entry.mode === "spy" ? "调查" : entry.who || "旁白";
    li.append(element("b", "", name));
    li.append(document.createTextNode(entry.text));
    log.append(li);
  }
  card.append(log);
  panel.replaceChildren(card);
}

function closeMenu() {
  overlay = null;
  renderPhase();
}

function onAdvance() {
  if (overlay === "menu" || overlay === "ending") return;
  if (game.phase === "rhythm" && !rhythm?.done) return;
  if (game.phase === "choice") return;
  if (game.phase === "line" && !lineDone) {
    finishLine();
    return;
  }
  clearTimers();
  rhythm = null;
  continueGame(game);
  renderPhase();
}

function startNew() {
  const speed = game.textSpeed;
  const auto = game.auto;
  const muted = game.muted;
  const fresh = createGame();
  fresh.textSpeed = speed;
  fresh.auto = auto;
  fresh.muted = muted;
  for (const key of Object.keys(game)) delete game[key];
  Object.assign(game, fresh);
  giveKit(game);
  unlockAudio();
  enterMap("ward");
  persist();
}

function continueSave() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(SAVE_KEY) || "");
    if (!restore(game, data) || !scenes[game.scene] || !maps[game.scene]) throw new Error("bad save");
  } catch {
    localStorage.removeItem(SAVE_KEY);
    showTitle();
    return;
  }
  game.muted = localStorage.getItem(MUTE_KEY) === "1";
  giveKit(game);
  unlockAudio();
  enterMap(game.scene, null, null, false);
  if (typeof data.x === "number" && typeof data.y === "number") {
    player.x = data.x;
    player.y = data.y;
    player.dir = data.dir || player.dir;
    cam.x = player.x;
    cam.y = player.y;
  }
}

function giveKit(state) {
  const missing = startingItems.filter((id) => !state.items.includes(id));
  state.items = missing.concat(state.items);
}

function onAction(action, node) {
  if (action === "start") startNew();
  else if (action === "continue") continueSave();
  else if (action === "menu") openMenu();
  else if (action === "close-menu") closeMenu();
  else if (action === "advance") onAdvance();
  else if (action === "act") interact();
  else if (action === "hit") judgeHit();
  else if (action === "choice") {
    clearTimers();
    continueGame(game, { choice: Number(node.dataset.index) });
    renderPhase();
  } else if (action === "leave") showTitle();
  else if (action === "stay") {
    overlay = null;
    closeLayer();
    applyAtmosphere();
  } else if (action === "title") {
    if (game.scene !== "title" && scenes[game.scene] && game.phase === "idle") persist();
    showTitle();
  } else if (action === "wipe") {
    localStorage.removeItem(SAVE_KEY);
    showTitle();
  } else if (action === "auto") {
    game.auto = !game.auto;
    openMenu();
  } else if (action === "speed") {
    game.textSpeed = Number(node.dataset.index);
    openMenu();
  } else if (action === "mute") {
    unlockAudio();
    game.muted = !game.muted;
    localStorage.setItem(MUTE_KEY, game.muted ? "1" : "0");
    syncMusic();
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function drawSky(time) {
  const width = sky.clientWidth;
  const height = sky.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  if (sky.width !== Math.floor(width * ratio) || sky.height !== Math.floor(height * ratio)) {
    sky.width = Math.floor(width * ratio);
    sky.height = Math.floor(height * ratio);
  }
  const ctx = sky.getContext("2d");
  ctx.clearRect(0, 0, sky.width, sky.height);
  for (const star of stars) {
    const alpha = 0.35 + Math.sin(time / 700 + star.p) * 0.25;
    ctx.fillStyle = `rgba(244, 236, 220, ${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x * sky.width, star.y * sky.height, star.r * ratio, 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(drawSky);
}

shell.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]");
  if (action) onAction(action.dataset.action, action);
});

shell.addEventListener("pointerdown", (event) => {
  const dir = event.target.closest("[data-dir]");
  if (dir) {
    event.preventDefault();
    held[dir.dataset.dir] = true;
    dir.setPointerCapture(event.pointerId);
    return;
  }
  if (!world || !event.target.closest("#world") || !canWalk()) return;
  const [x, y] = pointWorld(event);
  walkTarget = { x, y };
});

shell.addEventListener("pointerup", (event) => {
  const dir = event.target.closest("[data-dir]");
  if (dir) held[dir.dataset.dir] = false;
});

shell.addEventListener("pointercancel", () => {
  for (const key of Object.keys(held)) held[key] = false;
});

const MOVE_KEY = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  a: "left",
  A: "left",
  s: "down",
  S: "down",
  d: "right",
  D: "right",
};

document.addEventListener("keydown", (event) => {
  const tag = event.target.tagName;
  const move = MOVE_KEY[event.key];
  if (move && canWalk()) {
    event.preventDefault();
    held[move] = true;
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    if (overlay === "menu") closeMenu();
    else if (game.scene !== "title") openMenu();
    return;
  }
  if (event.key === "x" || event.key === "X") {
    event.preventDefault();
    if (game.phase === "line" && !lineDone) finishLine();
    return;
  }
  if (event.key === "z" || event.key === "Z" || event.key === "Enter" || event.key === " ") {
    const buttonFocused = (event.key === "Enter" || event.key === " ") && tag === "BUTTON";
    const reading = game.phase === "line" || game.phase === "doc" || game.phase === "item" || game.phase === "wait";
    if (buttonFocused && !reading) return;
    event.preventDefault();
    if (game.scene === "title" && game.phase === "idle" && !overlay) {
      startNew();
      return;
    }
    if (game.phase === "rhythm" && !rhythm?.done) {
      judgeHit();
      return;
    }
    if (game.phase === "idle" && maps[game.scene] && !overlay) {
      interact();
      return;
    }
    onAdvance();
  }
});

document.addEventListener("keyup", (event) => {
  const move = MOVE_KEY[event.key];
  if (move) held[move] = false;
});

window.addEventListener("resize", syncDockSpace);
window.addEventListener("blur", () => {
  for (const key of Object.keys(held)) held[key] = false;
});
requestAnimationFrame(drawSky);
requestAnimationFrame(tick);
showTitle();
