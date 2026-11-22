// RUMAH LELANG: PALU EMAS — konfigurasi dunia, level, dan penyeimbang.
// Satu ruangan lelang besar: panggung di utara, deretan kursi penonton di tengah,
// pintu masuk/keluar di selatan. Semua angka di sini adalah meter dunia (x: timur,
// z: selatan). Penyeimbang dibuat pemaaf: game yang bisa dimenangkan lebih penting
// daripada game yang sulit.
export const STEP = 1 / 60;
export const BEST_KEY = 'palu-emas-best';
export const ROOM = { minX: -14, maxX: 14, minZ: -9.5, maxZ: 9.5 };
export const PLAYER = {
  radius: 0.42,
  walkSpeed: 5.2,
  runSpeed: 7.6,
  // Bergerak cepat (lari) menaikkan kebisingan; jalan biasa nyaris senyap.
  noiseWalk: 0.02,
  noiseRun: 0.11,
};
export const ALARM = {
  max: 100,
  // Alarm naik saat pencuri terlihat, turun saat ia bersembunyi.
  riseGuard: 26,
  riseCamera: 20,
  decay: 7,
  // Alarm penuh = semua penjaga siaga penuh (bukan langsung kalah).
  fullChaseBoost: 1.6,
};
export const STRIKES = 3;
export const LOOT_NAMES = ['Lukisan "Senja Venesia"', 'Vas Dinasti Ming', 'Jam Saku Emas 1889'];
export const LOOT_POINTS = [250, 300, 350];
export const GRADES = [
  { maxTime: 75, maxSeen: 0, grade: 'S' },
  { maxTime: 110, maxSeen: 1, grade: 'A' },
  { maxTime: 150, maxSeen: 2, grade: 'B' },
  { maxTime: 1e9, maxSeen: 99, grade: 'C' },
];

// --- Geometri level -------------------------------------------------------
// Setiap cover adalah AABB {x, z, hx, hz} yang menghalangi gerak DAN pandangan.
export const COVERS = [
  // Panggung lelang (utara) — podium + meja lot.
  { x: 0, z: -8.2, hx: 5.5, hz: 1.1, kind: 'stage' },
  { x: -8.5, z: -8.2, hx: 2.2, hz: 1.1, kind: 'table' },
  { x: 8.5, z: -8.2, hx: 2.2, hz: 1.1, kind: 'table' },
  // Pilar-pilar besar di tengah ruangan.
  { x: -7, z: -3.5, hx: 0.9, hz: 0.9, kind: 'pillar' },
  { x: 7, z: -3.5, hx: 0.9, hz: 0.9, kind: 'pillar' },
  { x: -7, z: 3.5, hx: 0.9, hz: 0.9, kind: 'pillar' },
  { x: 7, z: 3.5, hx: 0.9, hz: 0.9, kind: 'pillar' },
  // Deretan meja penonton (baris kursi) — cover rendah di tengah.
  { x: -4.5, z: -0.5, hx: 2.4, hz: 0.7, kind: 'row' },
  { x: 4.5, z: -0.5, hx: 2.4, hz: 0.7, kind: 'row' },
  { x: -4.5, z: 2.5, hx: 2.4, hz: 0.7, kind: 'row' },
  { x: 4.5, z: 2.5, hx: 2.4, hz: 0.7, kind: 'row' },
  // Etalase kaca di sisi barat & timur.
  { x: -12.6, z: -4.5, hx: 0.8, hz: 1.6, kind: 'case' },
  { x: 12.6, z: -4.5, hx: 0.8, hz: 1.6, kind: 'case' },
  { x: -12.6, z: 4.5, hx: 0.8, hz: 1.6, kind: 'case' },
  { x: 12.6, z: 4.5, hx: 0.8, hz: 1.6, kind: 'case' },
  // Meja katalog dekat pintu masuk.
  { x: -9, z: 7.6, hx: 2.0, hz: 0.8, kind: 'table' },
  { x: 9, z: 7.6, hx: 2.0, hz: 0.8, kind: 'table' },
];

// Lot lelang: posisi, nama, warna sorotan.
export const LOOT_SPOTS = [
  { id: 0, x: -12.6, z: -4.5, name: LOOT_NAMES[0], color: 0xffd34d, kind: 'painting' },
  { id: 1, x: 12.6, z: -4.5, name: LOOT_NAMES[1], color: 0x7fd4ff, kind: 'vase' },
  { id: 2, x: 0, z: -7.4, name: LOOT_NAMES[2], color: 0xff9de2, kind: 'watch' },
];

export const EXIT_SPOT = { x: 0, z: 8.9, radius: 1.6 };
export const ENTRY_SPOT = { x: 0, z: 8.2 };

// --- Penjaga --------------------------------------------------------------
// Waypoint hanya di jalur terbuka (lorong karpet & koridor samping) supaya
// penjaga tidak pernah menembus dinding/cover.
export const GUARD_DEFS = [
  {
    name: 'Petugas Bram', color: 0x2b3a67, speed: 2.1, chaseSpeed: 3.6,
    waypoints: [[-10, -6.5], [-10, 5.9], [-8.5, 5.9], [-8.5, -6.5]],
  },
  {
    name: 'Petugas Sari', color: 0x5b2b3a, speed: 2.0, chaseSpeed: 3.5,
    waypoints: [[10, 5.9], [10, -6.5], [8.5, -6.5], [8.5, 5.9]],
  },
  {
    name: 'Petugas Dedi', color: 0x2b4d33, speed: 2.2, chaseSpeed: 3.7,
    waypoints: [[-1.2, -6], [1.2, -6], [1.2, 0.5], [-1.2, 0.5]],
  },
  {
    name: 'Petugas Lina', color: 0x4d3a1e, speed: 1.9, chaseSpeed: 3.4,
    waypoints: [[-11, 0.9], [-1.2, 0.9], [-1.2, 5.5], [-11, 5.5]],
  },
];
export const DOG_DEF = {
  name: 'Anjing K-9 Rex', speed: 3.0, chaseSpeed: 4.6,
  waypoints: [[-3, -6.4], [3, -6.4], [3, -5.2], [-3, -5.2]],
};
// Jarak & sudut pandang penjaga; anjing mencium lebih jauh tapi cone lebih sempit.
export const VISION = {
  guardRange: 8.5,
  guardHalfAngle: 0.62,
  dogRange: 7.0,
  dogHalfAngle: 0.45,
  cameraRange: 9.5,
  cameraHalfAngle: 0.5,
  // Curiga terisi penuh dalam ~1,4 detik terlihat dekat; lebih lambat dari jauh.
  suspicionRate: 0.75,
  suspicionDecay: 0.5,
};

export const CAMERA_DEFS = [
  { x: -13.4, z: -9.0, baseAngle: Math.PI / 2, sweep: 0.85, speed: 0.45, phase: 0 },
  { x: 13.4, z: -9.0, baseAngle: Math.PI / 2, sweep: 0.85, speed: 0.45, phase: Math.PI },
  { x: 0, z: 9.0, baseAngle: -Math.PI / 2, sweep: 0.7, speed: 0.35, phase: Math.PI / 2 },
];

// Kerumunan lelang: penonton duduk yang menjadi cover bergerak. Berdiri di
// tengah kerumunan membuat deteksi dua kali lebih lambat.
export const CROWD_SPOTS = [
  { x: -4.5, z: -1.6 }, { x: -3.2, z: -1.6 }, { x: -5.8, z: -1.6 },
  { x: 4.5, z: -1.6 }, { x: 3.2, z: -1.6 }, { x: 5.8, z: -1.6 },
  { x: -4.5, z: 1.4 }, { x: -3.2, z: 1.4 }, { x: -5.8, z: 1.4 },
  { x: 4.5, z: 1.4 }, { x: 3.2, z: 1.4 }, { x: 5.8, z: 1.4 },
  { x: -1.5, z: -1.6 }, { x: 1.5, z: -1.6 }, { x: -1.5, z: 1.4 }, { x: 1.5, z: 1.4 },
];
export const CROWD_RADIUS = 1.7;
export const CROWD_COVER_FACTOR = 0.45;

// Pengalih: koin emas yang dilempar (Q) — penjaga menyelidiki titik jatuhnya.
export const DISTRACTION = { count: 3, radius: 2.2, investigateTime: 4.0, throwRange: 6.0 };

// Sorotan lot berputar di atas panggung (mekanik khas: sorotan menyapu ruangan).
export const SPOTLIGHT = { x: 0, z: -6.5, radius: 3.2, period: 9 };

// Rute aman autopilot: titik-titik jalan di lorong terbuka.
export const SAFE_ROUTE = [
  [0, 8.2], [-2.5, 6.0], [-11, 6.0], [-11, -4.5],
  [-8, -6.5], [-2.5, -6.0], [0, -7.4],
  [2.5, -6.0], [8, -6.5], [11, -4.5],
  [11, 6.0], [2.5, 6.0], [0, 8.2],
];
