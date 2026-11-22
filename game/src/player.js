// Pencuri: gerak + tabrakan, meter kebisingan, ambil loot, lempar pengalih.
// Lari (Shift) cepat tapi berisik: penjaga di dekatmu lebih cepat curiga.
import { DISTRACTION, ENTRY_SPOT, PLAYER } from './config.js';
import { clampToRoom, inCrowd, nearestLoot, resolveCover } from './level.js';

export function createPlayer() {
  return {
    x: ENTRY_SPOT.x,
    z: ENTRY_SPOT.z,
    angle: Math.PI,
    radius: PLAYER.radius,
    noise: 0,
    moving: false,
    running: false,
    inCrowd: false,
    stepTimer: 0,
    invulnerable: 0,
    distractions: DISTRACTION.count,
  };
}

export function resetPlayer(p) {
  p.x = ENTRY_SPOT.x;
  p.z = ENTRY_SPOT.z;
  p.angle = Math.PI;
  p.noise = 0;
  p.moving = false;
  p.running = false;
  p.invulnerable = 0;
  p.distractions = DISTRACTION.count;
}

// Gerakkan pemain; kembalikan true bila langkah kaki terdengar (untuk suara).
export function stepPlayer(p, dir, dt) {
  p.moving = dir.x !== 0 || dir.z !== 0;
  p.running = p.moving && dir.run;
  const speed = p.running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (p.moving) {
    p.angle = Math.atan2(dir.z, dir.x);
    const nx = p.x + dir.x * speed * dt;
    const nz = p.z + dir.z * speed * dt;
    const fixed = resolveCover(nx, nz, p.radius);
    const clamped = clampToRoom(fixed.x, fixed.z, p.radius);
    p.x = clamped.x;
    p.z = clamped.z;
  }
  // Kebisingan: lari menaikkannya cepat, jalan pelan, diam menurunkannya.
  const target = p.running ? 100 : p.moving ? 18 : 0;
  const rate = p.running ? 55 : p.moving ? 25 : 40;
  p.noise += Math.sign(target - p.noise) * Math.min(Math.abs(target - p.noise), rate * dt);
  p.inCrowd = inCrowd(p.x, p.z);
  if (p.invulnerable > 0) p.invulnerable -= dt;
  // Detak langkah untuk suara.
  let stepped = false;
  if (p.moving) {
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = p.running ? 0.26 : 0.42;
      stepped = true;
    }
  }
  return stepped;
}

// Lot yang bisa diambil sekarang (dalam jangkauan), atau null.
export function lootInReach(p, taken) {
  return nearestLoot(p.x, p.z, taken, 1.5);
}

// Lempar koin pengalih ke arah hadap pemain; kembalikan titik jatuhnya.
export function throwDistraction(p) {
  if (p.distractions <= 0) return null;
  p.distractions -= 1;
  const d = DISTRACTION.throwRange;
  let x = p.x + Math.cos(p.angle) * d;
  let z = p.z + Math.sin(p.angle) * d;
  const clamped = clampToRoom(x, z, 0.5);
  x = clamped.x;
  z = clamped.z;
  return { x, z };
}
