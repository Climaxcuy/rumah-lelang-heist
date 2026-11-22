// Dunia: state permainan, loop heist lengkap, meter alarm, strike, skor,
// dan event untuk suara + HUD. Menang = 3/3 loot + mencapai EXIT.
// Kalah = ketahuan 3 kali.
import { ALARM, GRADES, LOOT_POINTS, LOOT_SPOTS, STRIKES } from './config.js';
import { createRandom } from './random.js';
import { createGuards, sendToInvestigate, stepGuard, STATE_ALERT } from './guards.js';
import { createCameras, stepCamera } from './cameras.js';
import { createPlayer, lootInReach, resetPlayer, stepPlayer, throwDistraction } from './player.js';
import { atExit } from './level.js';
import { createCrowd, createSpotlight, inSpotlight, stepCrowd, stepSpotlight } from './crowd.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_LOSE = 16;
export const EVENT_DISTRACT = 32;
export const EVENT_SUSPICIOUS = 64;

export function gradeFor(time, seen) {
  for (const g of GRADES) {
    if (time <= g.maxTime && seen <= g.maxSeen) return g.grade;
  }
  return 'C';
}

export function createWorld(random) {
  const world = {
    random,
    state: null,
    reset,
    step,
  };
  reset();
  return world;

  function reset() {
    world.state = {
      time: 0,
      score: 0,
      lootTaken: [false, false, false],
      lootCount: 0,
      alarm: 0,
      strikes: 0,
      seenCount: 0,
      distractionsUsed: 0,
      over: false,
      won: false,
      grade: null,
      message: '',
      messageTimer: 0,
      player: createPlayer(),
      guards: createGuards(),
      cameras: createCameras(),
      crowd: createCrowd(random),
      spotlight: createSpotlight(),
      distractionPoint: null,
      distractionTimer: 0,
      gavelTimer: 6,
      lotSold: 0,
      best: 0,
    };
  }

  // dt detik; dir = {x, z, run}; interact = tombol E ditekan; distract = Q.
  // attract = pilot / input. Mengembalikan bitmask EVENT_*.
  function step(dt, dir, interact, distract) {
    const s = world.state;
    if (s.over) return EVENT_NONE;
    let events = EVENT_NONE;
    s.time += dt;

    // Palu lelang berdentang berkala — lot "terjual" berganti (flavor).
    s.gavelTimer -= dt;
    if (s.gavelTimer <= 0) {
      s.gavelTimer = 7;
      s.lotSold = (s.lotSold + 1) % 3;
    }

    stepCrowd(s.crowd, s.time);
    stepSpotlight(s.spotlight, s.time);

    // --- Pemain ---
    const stepped = stepPlayer(s.player, dir, dt);
    if (stepped) s._stepSound = true;
    else s._stepSound = false;

    // Sorotan lot membuat pencuri sedikit lebih mudah terlihat.
    const lit = inSpotlight(s.spotlight, s.player.x, s.player.z);

    // --- Pengalih (Q) ---
    if (distract) {
      const point = throwDistraction(s.player);
      if (point) {
        s.distractionsUsed += 1;
        s.distractionPoint = point;
        s.distractionTimer = 2.5;
        sendToInvestigate(s.guards, point.x, point.z);
        events |= EVENT_DISTRACT;
        setMessage(s, 'Koin emas dilempar — petugas menyelidiki bunyinya!');
      } else {
        setMessage(s, 'Koin pengalih habis!');
      }
    }
    if (s.distractionTimer > 0) s.distractionTimer -= dt;

    // --- Ambil loot (E atau otomatis saat menyentuh lot) ---
    const loot = lootInReach(s.player, s.lootTaken);
    s.nearLoot = loot;
    if (loot && (interact || true)) {
      // Ambil otomatis saat menyentuh: ramah untuk autopilot & pemain baru.
      s.lootTaken[loot.id] = true;
      s.lootCount += 1;
      s.score += LOOT_POINTS[loot.id];
      events |= EVENT_LOOT;
      setMessage(s, `Lot dicuri: ${loot.name}! (${s.lootCount}/3)`);
    }

    // --- Deteksi penjaga ---
    let anySeen = false;
    let anySuspicious = false;
    const alarmFull = s.alarm >= ALARM.max;
    for (const g of s.guards) {
      const before = g.state;
      const ev = stepGuard(g, s.player, dt, alarmFull);
      if (g.state === STATE_ALERT) anySeen = true;
      if (g.suspicion > 0.35 && g.state !== STATE_ALERT) anySuspicious = true;
      if (ev === 'spotted') {
        events |= EVENT_SPOTTED;
        s.seenCount += 1;
        setMessage(s, `${g.name} melihatmu! Sembunyi!`);
      }
      if (ev === 'caught') {
        events |= EVENT_CAUGHT;
        handleCaught(s);
      }
      if (before !== STATE_ALERT && g.state === STATE_ALERT) {
        // Baru masuk alert: alarm melonjak.
        s.alarm = Math.min(ALARM.max, s.alarm + 18);
      }
    }
    // Kebisingan tinggi mempercepat curiga penjaga terdekat.
    if (s.player.noise > 70) {
      for (const g of s.guards) {
        const d = Math.hypot(g.x - s.player.x, g.z - s.player.z);
        if (d < 6 && g.state !== STATE_ALERT) {
          g.suspicion = Math.min(1, g.suspicion + 0.25 * dt);
        }
      }
    }

    // --- Deteksi kamera ---
    let camSeen = false;
    for (const cam of s.cameras) {
      const vis = stepCamera(cam, s.player, dt);
      if (vis > 0) camSeen = true;
    }

    // --- Meter alarm ---
    if (anySeen || camSeen) {
      s.alarm = Math.min(ALARM.max, s.alarm + (anySeen ? ALARM.riseGuard : ALARM.riseCamera) * dt);
      if (lit) s.alarm = Math.min(ALARM.max, s.alarm + 4 * dt);
    } else if (!anySuspicious) {
      s.alarm = Math.max(0, s.alarm - ALARM.decay * dt);
    }
    if (anySuspicious && !anySeen && !camSeen) {
      events |= EVENT_SUSPICIOUS;
    }

    // --- Menang: 3 loot + EXIT ---
    if (s.lootCount === 3 && atExit(s.player.x, s.player.z)) {
      s.over = true;
      s.won = true;
      s.score += 500 + Math.max(0, 300 - Math.floor(s.time) * 2);
      s.grade = gradeFor(s.time, s.seenCount);
      events |= EVENT_WIN;
      setMessage(s, 'KABUR! Semua lot aman di tanganmu.');
    }

    if (s.messageTimer > 0) s.messageTimer -= dt;
    return events;
  }

  function handleCaught(s) {
    s.strikes += 1;
    s.alarm = Math.min(ALARM.max, s.alarm + 30);
    if (s.strikes >= STRIKES) {
      s.over = true;
      s.won = false;
      setMessage(s, 'KETAHUAN 3 KALI — lelang bubar, kau ditangkap!');
    } else {
      setMessage(s, `KETAHUAN! Strike ${s.strikes}/${STRIKES} — kau dilempar ke pintu masuk.`);
      // Lempar kembali ke pintu masuk dengan kekebalan singkat (adil).
      resetPlayer(s.player);
      s.player.invulnerable = 2.5;
      for (const g of s.guards) {
        g.state = 'search';
        g.searchTimer = 2.5;
        g.suspicion = 0.4;
      }
    }
  }

  function setMessage(s, text) {
    s.message = text;
    s.messageTimer = 3.2;
  }
}
