// Kerumunan lelang: penonton duduk yang bergeser-geser di kursi — cover
// bergerak yang meredam deteksi — plus sorotan lot berputar di atas panggung.
// Sorotan menyapu ruangan: bila sorotan menyorot pencuri, ia sedikit lebih
// mudah terlihat (bonus visibilitas kecil untuk penjaga).
import { CROWD_SPOTS, SPOTLIGHT } from './config.js';

export function createCrowd(random) {
  return CROWD_SPOTS.map((s, i) => ({
    id: i,
    baseX: s.x,
    baseZ: s.z,
    x: s.x,
    z: s.z,
    // Penonton mengangguk / bergeser pelan di kursinya.
    phase: random.range(0, Math.PI * 2),
    bobSpeed: random.range(0.4, 0.9),
    suit: random.pick([0x2b2b3a, 0x3a2b2b, 0x2b3a2b, 0x3a3a2b, 0x402a4d]),
    skin: random.pick([0xe8b98a, 0xc98d5f, 0x8a5a3b, 0xf0c8a0]),
  }));
}

export function stepCrowd(crowd, time) {
  for (const person of crowd) {
    person.x = person.baseX + Math.sin(time * person.bobSpeed + person.phase) * 0.12;
    person.z = person.baseZ + Math.cos(time * person.bobSpeed * 0.7 + person.phase) * 0.08;
  }
}

export function createSpotlight() {
  return { angle: 0, x: SPOTLIGHT.x, z: SPOTLIGHT.z, radius: SPOTLIGHT.radius };
}

export function stepSpotlight(spot, time) {
  spot.angle = (time / SPOTLIGHT.period) * Math.PI * 2;
  // Pusat sorotan berputar mengelilingi panggung.
  spot.x = SPOTLIGHT.x + Math.cos(spot.angle) * 4.5;
  spot.z = SPOTLIGHT.z + Math.sin(spot.angle) * 1.8;
}

// Apakah sorotan sedang menyorot titik (x,z)?
export function inSpotlight(spot, x, z) {
  return Math.hypot(x - spot.x, z - spot.z) < spot.radius;
}
