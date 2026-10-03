const OPS = new Set([
  "say",
  "choice",
  "flag",
  "if",
  "hide",
  "mark",
  "weather",
  "wait",
  "doc",
  "item",
  "rhythm",
  "go",
  "ending",
  "label",
  "goto",
  "exit",
]);

export function createGame() {
  return {
    scene: "title",
    flags: {},
    hidden: {},
    seen: {},
    items: [],
    weather: "mild",
    log: [],
    endingSeen: false,
    queue: [],
    phase: "idle",
    current: null,
    textSpeed: 1,
    auto: false,
  };
}

export function serialize(game) {
  return {
    v: 1,
    scene: game.scene,
    flags: game.flags,
    hidden: game.hidden,
    seen: game.seen,
    items: game.items,
    weather: game.weather,
    log: game.log.slice(-80),
    endingSeen: game.endingSeen,
    textSpeed: game.textSpeed,
    auto: game.auto,
  };
}

export function restore(game, data) {
  if (!data || data.v !== 1 || typeof data.scene !== "string") return false;
  game.scene = data.scene;
  game.flags = { ...data.flags };
  game.hidden = { ...data.hidden };
  game.seen = { ...data.seen };
  game.items = Array.isArray(data.items) ? data.items.slice() : [];
  game.weather = data.weather === "heavy" ? "heavy" : "mild";
  game.log = Array.isArray(data.log) ? data.log.slice(-80) : [];
  game.endingSeen = Boolean(data.endingSeen);
  game.textSpeed = data.textSpeed === 0 || data.textSpeed === 2 ? data.textSpeed : 1;
  game.auto = Boolean(data.auto);
  game.queue = [];
  game.phase = "idle";
  game.current = null;
  return true;
}

function indexLabels(commands, labels = {}) {
  for (let i = 0; i < commands.length; i += 1) {
    const cmd = commands[i];
    if (!cmd || typeof cmd !== "object") continue;
    if (cmd.op === "label") labels[cmd.name] = commands.slice(i + 1);
    if (cmd.then) indexLabels(cmd.then, labels);
    if (cmd.else) indexLabels(cmd.else, labels);
    if (cmd.options) {
      for (const option of cmd.options) {
        if (option.then) indexLabels(option.then, labels);
      }
    }
  }
  return labels;
}

export function launch(game, commands) {
  game.labels = indexLabels(commands, game.labels || {});
  game.queue = commands.concat(game.queue);
  if (game.phase === "idle") pump(game);
}

export function continueGame(game, input = {}) {
  if (game.phase === "idle") return false;
  if (game.phase === "go" || game.phase === "ending" || game.phase === "exit") return false;
  if (game.phase === "choice") {
    const index = input.choice;
    const options = game.current.options;
    if (!Number.isInteger(index) || index < 0 || index >= options.length) return false;
    game.queue = (options[index].then || []).concat(game.queue);
  }
  game.phase = "idle";
  game.current = null;
  pump(game);
  return true;
}

function pump(game) {
  while (game.queue.length > 0) {
    const cmd = game.queue.shift();
    if (!OPS.has(cmd.op)) {
      const unknown = cmd.op;
      throw new Error("unknown op: " + unknown);
    }
    switch (cmd.op) {
      case "flag":
        game.flags[cmd.key] = cmd.value;
        break;
      case "hide":
        game.hidden[cmd.id] = true;
        break;
      case "mark":
        game.seen[cmd.id] = true;
        break;
      case "weather":
        game.weather = cmd.value;
        break;
      case "if": {
        const branch = (game.flags[cmd.key] === cmd.equals ? cmd.then : cmd.else) || [];
        game.queue = branch.concat(game.queue);
        break;
      }
      case "say":
        game.log.push({ who: cmd.who, text: cmd.text, mode: cmd.mode || "box" });
        if (game.log.length > 300) game.log.shift();
        game.phase = "line";
        game.current = cmd;
        return;
      case "choice":
        game.log.push({ who: cmd.who, text: cmd.prompt, mode: "box" });
        if (game.log.length > 300) game.log.shift();
        game.phase = "choice";
        game.current = cmd;
        return;
      case "wait":
        game.phase = "wait";
        game.current = cmd;
        return;
      case "doc":
        game.phase = "doc";
        game.current = cmd;
        return;
      case "item":
        if (!game.items.includes(cmd.id)) game.items.push(cmd.id);
        game.phase = "item";
        game.current = cmd;
        return;
      case "rhythm":
        game.phase = "rhythm";
        game.current = cmd;
        return;
      case "go":
        game.phase = "go";
        game.current = cmd;
        return;
      case "label":
        break;
      case "goto": {
        const rest = game.labels && game.labels[cmd.name];
        if (rest) game.queue = rest.slice();
        break;
      }
      case "exit":
        game.phase = "exit";
        game.current = cmd;
        return;
      case "ending":
        game.phase = "ending";
        game.current = cmd;
        return;
      default: {
        const unknown = cmd.op;
        throw new Error("unknown op: " + unknown);
      }
    }
  }
  game.phase = "idle";
  game.current = null;
}
