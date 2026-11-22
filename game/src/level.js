// Geometri level: tabrakan circle-vs-AABB, garis pandang (line-of-sight) yang
// terhalang cover, dan query posisi (di dalam kerumunan? dekat lot? di EXIT?).
import { COVERS, CROWD_SPOTS, CROWD_RADIUS, EXIT_SPOT, LOOT_SPOTS, ROOM } from './config.js';

// Apakah titik (x,z) bertabrakan dengan cover mana pun (dengan radius r)?
export function hitsCover(x, z, r) {
  for (const c of COVERS) {
    const cx = Math.max(c.x - c.hx, Math.min(x, c.x + c.hx));
    const cz = Math.max(c.z - c.hz, Math.min(z, c.z + c.hz));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < r * r) return c;
  }
  return null;
}

// Geser posisi lingkaran keluar dari cover (dipakai sesudah gerak).
export function resolveCover(x, z, r) {
  for (const c of COVERS) {
    const cx = Math.max(c.x - c.hx, Math.min(x, c.x + c.hx));
    const cz = Math.max(c.z - c.hz, Math.min(z, c.z + c.hz));
    let dx = x - cx;
    let dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 < 1e-8) {
        // Tepat di tengah cover: dorong ke sisi terdekat.
        const pushX = c.hx + r - Math.abs(x - c.x);
        const pushZ = c.hz + r - Math.abs(z - c.z);
        if (pushX < pushZ) x = c.x + (x >= c.x ? c.hx + r : -(c.hx + r));
        else z = c.z + (z >= c.z ? c.hz + r : -(c.hz + r));
      } else {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        z = cz + (dz / d) * r;
      }
    }
  }
  return { x, z };
}

// Apakah segmen (x1,z1)->(x2,z2) memotong AABB cover? (slab test 2D)
function segmentHitsBox(x1, z1, x2, z2, c) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  let tmin = 0;
  let tmax = 1;
  const minX = c.x - c.hx;
  const maxX = c.x + c.hx;
  const minZ = c.z - c.hz;
  const maxZ = c.z + c.hz;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < minX || x1 > maxX) return false;
  } else {
    let t1 = (minX - x1) / dx;
    let t2 = (maxX - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dz) < 1e-9) {
    if (z1 < minZ || z1 > maxZ) return false;
  } else {
    let t1 = (minZ - z1) / dz;
    let t2 = (maxZ - z1) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

// Garis pandang bersih? False bila ada cover di antara kedua titik.
export function hasLineOfSight(x1, z1, x2, z2) {
  for (const c of COVERS) {
    if (segmentHitsBox(x1, z1, x2, z2, c)) return false;
  }
  return true;
}

// Apakah (x,z) berada di tengah kerumunan penonton (cover bergerak)?
export function inCrowd(x, z) {
  for (const s of CROWD_SPOTS) {
    const dx = x - s.x;
    const dz = z - s.z;
    if (dx * dx + dz * dz < CROWD_RADIUS * CROWD_RADIUS) return true;
  }
  return false;
}

// Lot terdekat yang belum diambil dalam jangkauan ambil.
export function nearestLoot(x, z, taken, range) {
  let best = null;
  let bestD = range;
  for (const spot of LOOT_SPOTS) {
    if (taken[spot.id]) continue;
    const d = Math.hypot(x - spot.x, z - spot.z);
    if (d < bestD) {
      bestD = d;
      best = spot;
    }
  }
  return best;
}

export function atExit(x, z) {
  return Math.hypot(x - EXIT_SPOT.x, z - EXIT_SPOT.z) < EXIT_SPOT.radius;
}

export function clampToRoom(x, z, r) {
  return {
    x: Math.max(ROOM.minX + r, Math.min(ROOM.maxX - r, x)),
    z: Math.max(ROOM.minZ + r, Math.min(ROOM.maxZ - r, z)),
  };
}
