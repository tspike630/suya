import assert from "node:assert/strict";
import test from "node:test";
import { continueGame, createGame, launch } from "../js/engine.js";
import { scenes, scripts } from "../js/story.js";

function texts(node) {
  const found = [];
  const walk = (value) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (typeof value.text === "string") found.push(value.text);
    if (typeof value.prompt === "string") found.push(value.prompt);
    if (typeof value.title === "string") found.push(value.title);
    if (Array.isArray(value.lines)) found.push(...value.lines);
    for (const key of Object.keys(value)) walk(value[key]);
  };
  walk(node);
  return found;
}

function play(name, choose) {
  const game = createGame();
  launch(game, scripts[name]);
  let guard = 0;
  const seen = [];
  while (game.phase !== "idle" && guard++ < 400) {
    if (game.phase === "go") {
      seen.push(`go:${game.current.to}`);
      game.phase = "idle";
      break;
    }
    if (game.phase === "ending" || game.phase === "exit") {
      seen.push(game.phase);
      game.phase = "idle";
      break;
    }
    if (game.phase === "line" || game.phase === "choice") seen.push(game.current.text || game.current.prompt);
    if (game.phase === "choice") continueGame(game, { choice: choose(game) });
    else continueGame(game);
  }
  assert.ok(guard < 400, `${name} did not finish`);
  return { game, seen };
}

test("story text uses the renamed protagonist and title", () => {
  const all = texts(scripts).join("\n");
  for (const word of ["奥伦", "奥医", "世原", "拾落", "Starvior", "医生"]) {
    assert.equal(all.includes(word), false, word);
  }
  assert.match(all, /粟牙/);
  assert.match(all, /物理/);
  assert.match(all, /八尺戒尺/);
  assert.match(all, /和天下/);
});

test("spots point at real scripts, rooms, and weather", () => {
  for (const scene of Object.values(scenes)) {
    assert.ok(scene.name);
    for (const spot of scene.spots) {
      if (spot.script) assert.ok(scripts[spot.script], spot.script);
      if (spot.go) assert.ok(scenes[spot.go], spot.go);
      if (spot.weather) assert.ok(spot.weather === "mild" || spot.weather === "heavy");
    }
  }
});

test("waking alternates the contract and the unfinished bugs", () => {
  const first = play("wake", () => 0);
  assert.match(first.seen.join("\n"), /三个月/);
  assert.equal(first.game.flags.test, true);
  launch(first.game, scripts.wake);
  let guard = 0;
  const second = [];
  while (first.game.phase !== "idle" && guard++ < 50) {
    if (first.game.phase === "line") second.push(first.game.current.text);
    continueGame(first.game);
  }
  assert.match(second.join("\n"), /卷子/);
  assert.equal(first.game.flags.test, false);
});

test("the painting can open the star world or turn away", () => {
  const entered = play("painting", () => 0);
  assert.ok(entered.seen.includes("go:star"));
  const stayed = play("painting", () => 1);
  assert.match(stayed.seen.join("\n"), /下次再来/);
});

test("both answers still reach the far stars", () => {
  for (const pick of [0, 1]) {
    const result = play("yushit", () => pick);
    assert.match(result.seen.join("\n"), /近在咫尺/);
  }
});

test("the key is picked up once and the last green light ends", () => {
  const found = play("yardKey", () => 0);
  assert.deepEqual(found.game.items, ["key"]);
  assert.equal(found.game.hidden.key, true);
  const end = play("yustar10", () => 0);
  assert.ok(end.seen.includes("ending"));
});

test("the original opening enters a map or closes the game", () => {
  const entered = play("obe", (state) => {
    const labels = state.current.options.map((option) => option.label);
    if (labels.includes("选我")) return labels.indexOf("选我");
    if (labels.includes("我是正确选项")) return labels.indexOf("我是正确选项");
    if (labels.includes("键盘鼠标")) return labels.indexOf("键盘鼠标");
    if (labels.includes("后院")) return labels.indexOf("后院");
    return 0;
  });
  assert.ok(entered.seen.includes("go:yard"));
  const crashed = play("obe", (state) => {
    const labels = state.current.options.map((option) => option.label);
    if (labels.includes("选这个药丸")) return labels.indexOf("选这个药丸");
    return 0;
  });
  assert.ok(crashed.seen.includes("exit"));
});

test("every script can be walked", () => {
  for (const name of Object.keys(scripts)) play(name, () => 0);
});
