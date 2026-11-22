// Autopilot: memainkan aturan ASLI (bukan script kemenangan).
// Rute berbasis TARGET LOOT: tiap leg berakhir di lot yang harus dicuri —
// leg tidak pernah dilewati sebelum lotnya terkumpul. Di antara leg ada
// waypoint transit di lorong terbuka. Perilaku:
//  - penjaga ALERT / curiga berat -> lari ke kerumunan terdekat, diam sampai aman;
//  - waypoint berikutnya disapu cone PENJAGA -> tunggu sebentar, lalu KOMIT
//    bergerak (bukan merangkak 1 frame per 2,5 detik);
//  - kamera CCTV saja tidak pernah menghentikan gerak (ia hanya menaikkan alarm);
//  - macet terdeteksi hanya saat diperintah bergerak tapi tidak berpindah;
//  - bila penjaga ALERT sudah sangat dekat, lempar koin pengalih (Q).
import { canSee, STATE_ALERT } from './guards.js';

// Leg: transit (jalan) -> goal. goal loot hanya lolos bila lotnya terkumpul.
const LEGS = [
  {
    goal: { x: -11.3, z: -4.5, kind: 'loot', id: 0 },
    transit: [[-2.5, 6.0], [-11, 6.0]],
  },
  {
    goal: { x: 0, z: -6.55, kind: 'loot', id: 2 },
    transit: [[-8, -6.3], [-2.5, -5.8]],
  },
  {
    goal: { x: 11.3, z: -4.5, kind: 'loot', id: 1 },
    transit: [[2.5, -5.8], [8, -6.3]],
  },
  {
    goal: { x: 0, z: 8.9, kind: 'exit', id: -1 },
    transit: [[11, 6.0], [2.5, 6.0]],
  },
];

export function createAutopilot() {
  let legIndex = 0;
  let wpIndex = 0;
  let waitTimer = 0;
  let goTimer = 0;
  let hideTimer = 0;
  let hiding = false;
  let stuckTimer = 0;
  let slideTimer = 0;
  let slideSide = 1;
  let lastX = 0;
  let lastZ = 0;
  let moving = false;

  function guardDangerAt(state, x, z) {
    let danger = 0;
    for (const g of state.guards) {
      const vis = canSee(g, x, z, false);
      if (vis > 0) danger = Math.max(danger, vis);
      if (g.state === STATE_ALERT) {
        const d = Math.hypot(g.x - x, g.z - z);
        if (d < 4) danger = Math.max(danger, 0.95);
      }
    }
    return danger;
  }

  function nearestCrowdSpot(state) {
    let best = null;
    let bestD = Infinity;
    const p = state.player;
    for (const person of state.crowd) {
      const d = Math.hypot(person.baseX - p.x, person.baseZ - p.z);
      if (d < bestD) {
        bestD = d;
        best = person;
      }
    }
    return best;
  }

  function currentTarget(state) {
    // Lewati leg yang lotnya sudah terkumpul.
    while (legIndex < LEGS.length) {
      const leg = LEGS[legIndex];
      if (leg.goal.kind === 'loot' && state.lootTaken[leg.goal.id]) {
        legIndex += 1;
        wpIndex = 0;
        continue;
      }
      break;
    }
    if (legIndex >= LEGS.length) return { x: 0, z: 8.9 };
    const leg = LEGS[legIndex];
    // Waypoint transit yang sudah dekat dilewati; goal tidak dilewati
    // sebelum lotnya terkumpul (dijaga oleh while di atas).
    while (wpIndex < leg.transit.length) {
      const wp = leg.transit[wpIndex];
      if (Math.hypot(wp[0] - state.player.x, wp[1] - state.player.z) < 0.8) wpIndex += 1;
      else break;
    }
    if (wpIndex < leg.transit.length) return { x: leg.transit[wpIndex][0], z: leg.transit[wpIndex][1] };
    return leg.goal;
  }

  // Mengembalikan {x, z, run, distract} untuk satu langkah dunia.
  function decide(state, dt) {
    const p = state.player;
    if (state.over) return { x: 0, z: 0, run: false, distract: false };

    // Pengaman: bila berdiri di EXIT tanpa 3 lot, kembali ke lot terdekat.
    if (state.lootCount < 3 && Math.hypot(p.x - 0, p.z - 8.9) < 1.7) {
      legIndex = 0;
      wpIndex = 0;
      // Cari leg pertama yang lotnya belum terkumpul.
      while (legIndex < LEGS.length && LEGS[legIndex].goal.kind === 'loot' && state.lootTaken[LEGS[legIndex].goal.id]) {
        legIndex += 1;
      }
      if (legIndex >= LEGS.length) legIndex = 0;
    }

    const anyAlert = state.guards.some((g) => g.state === STATE_ALERT);
    const maxSuspicion = Math.max(0, ...state.guards.map((g) => g.suspicion));
    const myGuardDanger = guardDangerAt(state, p.x, p.z);

    // --- Sembunyi di kerumunan bila dikejar / sangat dicurigai ---
    if (anyAlert || myGuardDanger > 0.6) {
      hiding = true;
      hideTimer = 0;
    }
    if (hiding) {
      hideTimer += dt;
      const safeNow = !anyAlert && maxSuspicion < 0.4 && myGuardDanger < 0.3;
      if (safeNow && hideTimer > 1.0) {
        hiding = false;
        hideTimer = 0;
      } else {
        const spot = nearestCrowdSpot(state);
        if (spot) {
          const dx = spot.baseX - p.x;
          const dz = spot.baseZ - p.z;
          const d = Math.hypot(dx, dz);
          if (d > 0.6) return { x: dx / d, z: dz / d, run: false, distract: false };
        }
        return { x: 0, z: 0, run: false, distract: false };
      }
    }

    // --- Koin pengalih bila penjaga ALERT sudah sangat dekat ---
    let distract = false;
    if (anyAlert && p.distractions > 0) {
      const nearest = Math.min(...state.guards.map((g) => Math.hypot(g.x - p.x, g.z - p.z)));
      if (nearest < 4) distract = true;
    }

    const target = currentTarget(state);
    const targetDanger = guardDangerAt(state, target.x, target.z);

    // --- Tunggu cone penjaga, lalu KOMIT bergerak ---
    if (goTimer > 0) {
      goTimer -= dt;
    } else if (targetDanger > 0.35 && waitTimer < 1.2) {
      waitTimer += dt;
      return { x: 0, z: 0, run: false, distract: false };
    } else {
      if (waitTimer >= 1.2) goTimer = 1.5;
      waitTimer = 0;
    }

    // --- Deteksi macet: hanya saat diperintah bergerak ---
    let dx = target.x - p.x;
    let dz = target.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) return { x: 0, z: 0, run: false, distract };
    dx /= d;
    dz /= d;
    if (moving) {
      const moved = Math.hypot(p.x - lastX, p.z - lastZ);
      if (moved < 0.02) stuckTimer += dt;
      else stuckTimer = 0;
    }
    moving = true;
    lastX = p.x;
    lastZ = p.z;
    if (stuckTimer > 0.5 && slideTimer <= 0) {
      slideTimer = 0.5;
      slideSide = -slideSide;
      stuckTimer = 0;
    }
    if (slideTimer > 0) {
      slideTimer -= dt;
      return { x: -dz * slideSide, z: dx * slideSide, run: false, distract };
    }
    return { x: dx, z: dz, run: false, distract };
  }

  function reset() {
    legIndex = 0;
    wpIndex = 0;
    waitTimer = 0;
    goTimer = 0;
    hideTimer = 0;
    hiding = false;
    stuckTimer = 0;
    slideTimer = 0;
    lastX = 0;
    lastZ = 0;
    moving = false;
  }

  return { decide, reset };
}
