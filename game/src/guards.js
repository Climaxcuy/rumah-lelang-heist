// Penjaga & anjing: mesin state patrol -> suspicious (?) -> alert/chase (!)
// -> search -> patrol. Cone visi bervolume: kuning saat patroli, oranye saat
// curiga, merah saat mengejar. Penjaga hanya bergerak di waypoint jalur
// terbuka, jadi tidak pernah menembus dinding/cover.
import { DOG_DEF, GUARD_DEFS, VISION } from './config.js';
import { hasLineOfSight, resolveCover, clampToRoom } from './level.js';

export const STATE_PATROL = 'patrol';
export const STATE_SUSPICIOUS = 'suspicious';
export const STATE_ALERT = 'alert';
export const STATE_SEARCH = 'search';
export const STATE_INVESTIGATE = 'investigate';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function makeGuard(def, isDog) {
  return {
    name: def.name,
    isDog,
    color: def.color ?? 0x2b3a67,
    x: def.waypoints[0][0],
    z: def.waypoints[0][1],
    angle: 0,
    speed: def.speed,
    chaseSpeed: def.chaseSpeed,
    waypoints: def.waypoints,
    wpIndex: 1,
    state: STATE_PATROL,
    suspicion: 0,
    waitTimer: 0,
    searchTimer: 0,
    investigateX: 0,
    investigateZ: 0,
    investigateTimer: 0,
    lastSeenX: 0,
    lastSeenZ: 0,
    seenPlayer: false,
    // Sudut pandang saat ini (untuk render cone).
    viewAngle: 0,
    range: isDog ? VISION.dogRange : VISION.guardRange,
    halfAngle: isDog ? VISION.dogHalfAngle : VISION.guardHalfAngle,
  };
}

export function createGuards() {
  const guards = GUARD_DEFS.map((d) => makeGuard(d, false));
  guards.push(makeGuard(DOG_DEF, true));
  return guards;
}

// Apakah pengamat di (ox,oz) menghadap angle bisa melihat pemain?
export function canSee(observer, px, pz, crowdCover) {
  const dx = px - observer.x;
  const dz = pz - observer.z;
  const dist = Math.hypot(dx, dz);
  if (dist > observer.range) return 0;
  const ang = Math.atan2(dz, dx);
  const diff = Math.abs(angleDiff(ang, observer.viewAngle));
  if (diff > observer.halfAngle) return 0;
  if (!hasLineOfSight(observer.x, observer.z, px, pz)) return 0;
  // Visibilitas: penuh saat dekat, melemah saat jauh; kerumunan meredamnya.
  let vis = 1 - (dist / observer.range) * 0.55;
  if (crowdCover) vis *= 0.45;
  return Math.max(0.08, vis);
}

function moveToward(g, tx, tz, speed, dt) {
  const dx = tx - g.x;
  const dz = tz - g.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.05) return true;
  const step = Math.min(d, speed * dt);
  const nx = g.x + (dx / d) * step;
  const nz = g.z + (dz / d) * step;
  const fixed = resolveCover(nx, nz, 0.4);
  const clamped = clampToRoom(fixed.x, fixed.z, 0.4);
  g.x = clamped.x;
  g.z = clamped.z;
  g.viewAngle = Math.atan2(dz, dx);
  g.angle = g.viewAngle;
  return d <= step + 0.05;
}

// Satu langkah AI untuk satu penjaga. Mengembalikan 'caught' bila menyentuh
// pemain saat mengejar, 'spotted' bila baru saja melihat pemain.
export function stepGuard(g, player, dt, alarmFull) {
  const vis = canSee(g, player.x, player.z, player.inCrowd);
  const spottedNow = vis > 0;
  if (spottedNow) {
    g.lastSeenX = player.x;
    g.lastSeenZ = player.z;
    g.seenPlayer = true;
  }
  const boost = alarmFull ? 1.6 : 1;
  let event = null;

  if (g.state === STATE_PATROL || g.state === STATE_SUSPICIOUS) {
    if (spottedNow) {
      const before = g.suspicion;
      g.suspicion += VISION.suspicionRate * vis * boost * dt;
      if (before < 0.35 && g.suspicion >= 0.35) g.state = STATE_SUSPICIOUS;
      if (g.suspicion >= 1) {
        g.state = STATE_ALERT;
        event = 'spotted';
      }
    } else {
      g.suspicion = Math.max(0, g.suspicion - VISION.suspicionDecay * dt);
      if (g.suspicion < 0.35 && g.state === STATE_SUSPICIOUS) g.state = STATE_PATROL;
    }
    if (g.state !== STATE_ALERT) {
      // Patroli: jalan ke waypoint berikut, berhenti sejenak di tiap titik.
      if (g.waitTimer > 0) {
        g.waitTimer -= dt;
        g.viewAngle += Math.sin(g.waitTimer * 2.2) * 0.35 * dt;
      } else {
        const wp = g.waypoints[g.wpIndex];
        if (moveToward(g, wp[0], wp[1], g.speed, dt)) {
          g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
          g.waitTimer = 0.9;
        }
      }
    }
  } else if (g.state === STATE_ALERT) {
    // Mengejar posisi terakhir terlihat; bila masih terlihat, kejar pemain.
    const tx = spottedNow ? player.x : g.lastSeenX;
    const tz = spottedNow ? player.z : g.lastSeenZ;
    moveToward(g, tx, tz, g.chaseSpeed, dt);
    const dPlayer = Math.hypot(player.x - g.x, player.z - g.z);
    if (dPlayer < 0.85) {
      event = 'caught';
      g.state = STATE_SEARCH;
      g.searchTimer = 3;
      g.suspicion = 0.5;
    } else if (!spottedNow) {
      const dSeen = Math.hypot(g.lastSeenX - g.x, g.lastSeenZ - g.z);
      if (dSeen < 0.6) {
        g.state = STATE_SEARCH;
        g.searchTimer = 3.5;
      }
    }
  } else if (g.state === STATE_SEARCH) {
    // Mengendus sekitar titik terakhir terlihat, lalu kembali patroli.
    g.searchTimer -= dt;
    g.viewAngle += 1.6 * dt;
    if (spottedNow) {
      g.suspicion = Math.min(1, g.suspicion + VISION.suspicionRate * vis * dt);
      if (g.suspicion >= 1) {
        g.state = STATE_ALERT;
        event = 'spotted';
      }
    }
    if (g.searchTimer <= 0) {
      g.state = STATE_PATROL;
      g.suspicion = 0;
      // Kembali ke waypoint terdekat.
      let best = 0;
      let bestD = Infinity;
      g.waypoints.forEach((wp, i) => {
        const d = Math.hypot(wp[0] - g.x, wp[1] - g.z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      g.wpIndex = best;
    }
  } else if (g.state === STATE_INVESTIGATE) {
    // Menyelidiki titik pengalih (koin Q), lalu kembali patroli.
    g.investigateTimer -= dt;
    if (moveToward(g, g.investigateX, g.investigateZ, g.speed * 1.15, dt) || g.investigateTimer <= 0) {
      if (g.investigateTimer <= 0) {
        g.state = STATE_PATROL;
        g.suspicion = 0;
      } else {
        g.waitTimer = 1.2;
        g.investigateTimer = 0;
        g.state = STATE_PATROL;
      }
    }
    if (spottedNow && vis > 0.6) {
      g.suspicion += VISION.suspicionRate * vis * dt;
      if (g.suspicion >= 1) {
        g.state = STATE_ALERT;
        event = 'spotted';
      }
    }
  }
  return event;
}

// Warna cone menurut state: kuning patroli, oranye curiga, merah kejar.
export function coneColor(g) {
  if (g.state === STATE_ALERT) return 0xff2e2e;
  if (g.state === STATE_SUSPICIOUS || g.state === STATE_SEARCH) return 0xff9a1f;
  return 0xffd34d;
}

export function sendToInvestigate(guards, x, z) {
  for (const g of guards) {
    if (g.state === STATE_ALERT) continue;
    g.state = STATE_INVESTIGATE;
    g.investigateX = x;
    g.investigateZ = z;
    g.investigateTimer = 4.0;
    g.suspicion = Math.max(0, g.suspicion - 0.3);
  }
}
