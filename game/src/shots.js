// Scene screenshot di balik ?shot=start|play|climax|end. Semuanya memainkan
// aturan asli dari state segar dengan autopilot yang sama seperti pemain:
// - start: dunia berjalan pelan di balik layar judul;
// - play: autopilot bermain ~22 detik di tengah heist;
// - climax: autopilot bermain sampai 1 lot dicuri dan alarm mulai naik —
//   frame klimaks dengan pencuri + penjaga + cone + kamera + loot + alarm;
// - end: autopilot bermain sampai WIN (atau LOSE bila gagal) — layar akhir
//   menampilkan grade + statistik ASLI.
import { STEP } from './config.js';
import { createAutopilot } from './autopilot.js';
import { EVENT_WIN, EVENT_LOSE } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN, SCREEN_LOSE } from './render.js';

const SAMPLE = STEP;
const START_SECONDS = 6;
const PLAY_SECONDS = 14;
const END_LIMIT_SECONDS = 420;

function playFor(world, pilot, seconds, stopAt) {
  const state = world.state;
  let elapsed = 0;
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    const dir = pilot.decide(state, SAMPLE);
    const events = world.step(SAMPLE, dir, false, dir.distract);
    elapsed += SAMPLE;
    if (stopAt && stopAt(state, events, elapsed)) break;
    if (state.over) break;
  }
  return elapsed;
}

export function stageShot(name, world) {
  world.reset();
  const pilot = createAutopilot();
  const state = world.state;

  if (name === 'start') {
    // Dunia hidup di balik judul: penjaga patroli, sorotan berputar.
    playFor(world, pilot, START_SECONDS, null);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    playFor(world, pilot, PLAY_SECONDS, null);
    return { screen: SCREEN_PLAY, best: state.score };
  }
  if (name === 'climax') {
    // Klimaks: main sampai lot pertama dicuri DAN (alarm mulai naik atau
    // penjaga mulai curiga), supaya frame penuh ketegangan; batas 60 detik.
    playFor(world, pilot, 60, (s) => s.lootCount >= 1 && (s.alarm > 2 || s.guards.some((g) => g.suspicion > 0.25)));
    return { screen: SCREEN_PLAY, best: state.score };
  }
  // end: autopilot sampai tamat.
  playFor(world, pilot, END_LIMIT_SECONDS, null);
  const over = state.over;
  return {
    screen: over ? (state.won ? SCREEN_WIN : SCREEN_LOSE) : SCREEN_PLAY,
    best: state.score,
  };
}

// Dipakai main.js untuk mencatat hasil autopilot end ke konsol (verifikasi).
export function runAutopilotToEnd(world) {
  world.reset();
  const pilot = createAutopilot();
  const state = world.state;
  let elapsed = 0;
  for (let i = 0; i < END_LIMIT_SECONDS / SAMPLE; i += 1) {
    const dir = pilot.decide(state, SAMPLE);
    world.step(SAMPLE, dir, false, dir.distract);
    elapsed += SAMPLE;
    if (state.over) break;
  }
  return {
    won: state.won,
    grade: state.grade,
    time: state.time,
    seen: state.seenCount,
    strikes: state.strikes,
    loot: state.lootCount,
    score: state.score,
    elapsed,
  };
}
