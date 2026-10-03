import { continueGame, createGame, launch, restore, serialize } from "./engine.js?v=8";
import { items, people, scenes, scripts, startingItems, tracks } from "./story.js?v=8";

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
  if (!scenes[game.scene]) return;
  localStorage.setItem(SAVE_KEY, JSON.stringify(serialize(game)));
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

function showTitle() {
  clearTimers();
  overlay = null;
  game.scene = "title";
  game.phase = "idle";
  game.current = null;
  closeLayer();
  mount("title");
  dock.hidden = true;
  menuBtn.hidden = true;
  soundBtn.hidden = false;
  where.textContent = "";
  const cont = view.querySelector("#continue-btn");
  if (cont) cont.hidden = !hasSave();
  syncDockSpace();
  applyAtmosphere();
  syncMusic();
  document.title = "粟牙";
}

function goScene(id, opts = {}) {
  clearTimers();
  overlay = null;
  game.scene = id;
  closeLayer();
  mount(id);
  menuBtn.hidden = false;
  soundBtn.hidden = false;
  dock.hidden = false;
  where.textContent = scenes[id].name;
  document.title = `粟牙 · ${scenes[id].name}`;
  applyAtmosphere();
  renderSpots();
  syncMusic();
  if (opts.boot) openScript(scripts[opts.boot]);
  else if (opts.save !== false) persist();
}

function renderSpots() {
  const scene = scenes[game.scene];
  const host = view.querySelector(".spots");
  if (!scene || !host) return;
  host.replaceChildren();
  dock.replaceChildren();
  const visible = scene.spots.filter((spot) => !spot.hide || !game.hidden[spot.hide]);
  for (const spot of visible) {
    const fig = view.querySelector(`.cast-fig[data-spot="${spot.id}"]`);
    if (fig) {
      fig.hidden = false;
      fig.classList.toggle("is-seen", Boolean(spot.seen && game.seen[spot.seen]));
    }
    dock.append(spotButton(spot, false));
  }
  for (const fig of view.querySelectorAll(".cast-fig[data-spot]")) {
    const spot = scene.spots.find((item) => item.id === fig.dataset.spot);
    if (spot?.hide && game.hidden[spot.hide]) fig.hidden = true;
  }
  syncDockSpace();
}

function spotButton(spot, placed) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.spot = spot.id;
  const seen = spot.seen && game.seen[spot.seen];
  if (placed) {
    btn.className = `spot kind-${spot.kind}${seen ? " is-seen" : ""}`;
    btn.style.left = `${spot.x}%`;
    btn.style.top = `${spot.y}%`;
    const person = people[spot.who];
    if (spot.kind === "person" && person?.sprite) {
      const icon = document.createElement("i");
      icon.className = "chibi";
      icon.style.backgroundImage = `url("${person.sprite}")`;
      btn.append(icon);
    } else if (spot.kind === "echo" && person?.portrait) {
      const face = document.createElement("img");
      face.className = "echo-face";
      face.src = person.portrait;
      face.alt = "";
      btn.append(face);
    } else if (spot.kind === "echo") {
      const lamp = document.createElement("i");
      lamp.className = "lantern";
      btn.append(lamp);
    }
    const name = document.createElement("em");
    name.textContent = spot.label;
    btn.append(name);
  } else {
    btn.textContent = spot.label;
    if (seen) btn.classList.add("is-seen");
  }
  return btn;
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
    const to = game.current.to;
    game.phase = "idle";
    game.current = null;
    goScene(to);
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
      renderSpots();
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
  const caret = panel.querySelector(".caret");
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
  card.append(element("h2", "", "绿灯"));
  card.append(element("p", "", "即便这只是一场终会醒来的梦..."));
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

function onSpot(id) {
  if (game.phase !== "idle" || overlay) return;
  unlockAudio();
  const spot = scenes[game.scene].spots.find((item) => item.id === id);
  if (!spot || (spot.hide && game.hidden[spot.hide])) return;
  if (spot.weather) {
    game.weather = spot.weather;
    applyAtmosphere();
    showToast(spot.weather === "heavy" ? "暴雨" : "细雨");
    persist();
    return;
  }
  if (spot.go) {
    goScene(spot.go);
    return;
  }
  if (spot.script) openScript(scripts[spot.script]);
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
  goScene("ward", { save: false, boot: "wake" });
}

function continueSave() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY) || "");
    if (!restore(game, data) || !scenes[game.scene]) throw new Error("bad save");
  } catch {
    localStorage.removeItem(SAVE_KEY);
    showTitle();
    return;
  }
  game.muted = localStorage.getItem(MUTE_KEY) === "1";
  giveKit(game);
  unlockAudio();
  goScene(game.scene, { save: false });
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
  if (action) {
    onAction(action.dataset.action, action);
    return;
  }
  const spot = event.target.closest("[data-spot]");
  if (spot) onSpot(spot.dataset.spot);
});

document.addEventListener("keydown", (event) => {
  const tag = event.target.tagName;
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
    onAdvance();
  }
});

window.addEventListener("resize", syncDockSpace);
requestAnimationFrame(drawSky);
showTitle();
