// Boot + loop utama: layar judul -> bermain -> menang/kalah -> mulai ulang.
// ?seed=N menetapkan seed dunia. ?shot=start|play|climax|end menampilkan scene
// itu (deterministik) dan menandai window.__shotReady untuk screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_DISTRACT, EVENT_LOOT, EVENT_LOSE, EVENT_SPOTTED, EVENT_SUSPICIOUS, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_DISTRACT, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_LOSE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261122;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Penyimpanan bisa mati (jendela privat): skor terbaik lalu hanya seumur kunjungan.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      window.__shotResult = {
        shot: name,
        won: world.state.won,
        grade: world.state.grade,
        time: world.state.time,
        seen: world.state.seenCount,
        strikes: world.state.strikes,
        loot: world.state.lootCount,
        score: world.state.score,
        alarm: world.state.alarm,
      };
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let muted = false;
  let pendingInteract = false;
  let pendingDistract = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce('Bermain. Curi 3 lot lelang, lalu kabur ke pintu hijau.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_LOSE;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.win();
    else audio.lose();
    announce(won ? `Menang! Grade ${world.state.grade}. Skor ${world.state.score}.` : `Kalah. Skor ${world.state.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_INTERACT) pendingInteract = true;
    if (actions & ACTION_DISTRACT) pendingDistract = true;
    if (actions & ACTION_MUTE) {
      muted = audio.setMuted(!muted);
      announce(muted ? 'Suara mati.' : 'Suara hidup.');
    }
    if (actions & ACTION_RESTART && (screen === SCREEN_PLAY || screen === SCREEN_WIN || screen === SCREEN_LOSE)) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Bermain.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // Dunia hidup di balik judul.
      world.step(STEP, { x: 0, z: 0, run: false }, false, false);
      return;
    }
    const dir = input.direction();
    const interact = pendingInteract;
    const distract = pendingDistract;
    pendingInteract = false;
    pendingDistract = false;
    const events = world.step(STEP, dir, interact, distract);
    if (world.state._stepSound) audio.step(dir.run);
    if (events & EVENT_LOOT) audio.loot();
    if (events & EVENT_SUSPICIOUS) audio.suspicious();
    if (events & EVENT_SPOTTED) audio.alarm();
    if (events & EVENT_CAUGHT) audio.caught();
    if (events & EVENT_DISTRACT) audio.gavel();
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_LOSE) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Rumah Lelang: Palu Emas. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
