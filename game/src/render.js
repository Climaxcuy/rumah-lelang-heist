// Renderer: scene Three.js (ruang lelang 3D oblique), HUD DOM, dan minimap 2D.
// Cone visi digambar sebagai kipas transparan di lantai; warna mengikuti state.
import * as THREE from 'three';
import { COVERS, EXIT_SPOT, LOOT_SPOTS, ROOM } from './config.js';
import { coneColor, STATE_ALERT, STATE_SEARCH, STATE_SUSPICIOUS } from './guards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';
export const SCREEN_PAUSED = 'paused';

// Kipas sektor lingkaran (cone visi) yang terbaring di lantai.
function makeConeFan(range, halfAngle, color) {
  const segments = 24;
  const positions = [0, 0, 0];
  for (let i = 0; i <= segments; i += 1) {
    const a = -halfAngle + (2 * halfAngle * i) / segments;
    positions.push(Math.cos(a) * range, 0, Math.sin(a) * range);
  }
  const indices = [];
  for (let i = 1; i <= segments; i += 1) indices.push(0, i, i + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.34,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = 0;
  return mesh;
}

function box(w, h, d, color, x, y, z, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.85,
    metalness: opts.metalness ?? 0.05,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinder(rt, rb, h, color, x, y, z, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.8,
    metalness: opts.metalness ?? 0.1,
    emissive: opts.emissive ?? 0x000000,
  });
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, opts.seg ?? 16), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.shadow !== false;
  mesh.receiveShadow = true;
  return mesh;
}

function sphere(r, color, x, y, z, opts = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.7,
    metalness: opts.metalness ?? 0.1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 0,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 14), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = opts.shadow !== false;
  return mesh;
}

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x140d08);
  scene.fog = new THREE.Fog(0x140d08, 46, 78);

  const camera = new THREE.PerspectiveCamera(55, 1280 / 800, 0.1, 120);
  camera.position.set(0, 19.5, 14.2);
  camera.lookAt(0, 0, -0.6);

  // --- Cahaya: ambient + matahari lewat jendela + lampu gantung + sorotan ---
  scene.add(new THREE.AmbientLight(0xffe6c0, 0.75));
  const sun = new THREE.DirectionalLight(0xffe0b0, 1.7);
  sun.position.set(10, 20, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -18;
  sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 14;
  sun.shadow.camera.bottom = -14;
  scene.add(sun);
  const chandelier = new THREE.PointLight(0xffd27a, 900, 30, 1.8);
  chandelier.position.set(0, 7, 0);
  scene.add(chandelier);
  const stageLight = new THREE.PointLight(0xffc44d, 500, 22, 1.8);
  stageLight.position.set(0, 5, -7);
  scene.add(stageLight);
  const doorLight = new THREE.PointLight(0x9fd4ff, 220, 16, 1.8);
  doorLight.position.set(0, 4, 8.5);
  scene.add(doorLight);

  // --- Lantai kayu + karpet burgundy + trim emas ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM.maxX - ROOM.minX + 2, ROOM.maxZ - ROOM.minZ + 2),
    new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  // Papan lantai: garis-garis kayu.
  for (let x = -13; x <= 13; x += 2) {
    const plank = box(0.08, 0.02, 21, 0x3a2617, x, 0.01, 0, { shadow: false });
    scene.add(plank);
  }
  const carpet = new THREE.Mesh(
    new THREE.PlaneGeometry(5.4, 17.5),
    new THREE.MeshStandardMaterial({ color: 0x6e1423, roughness: 1 }),
  );
  carpet.rotation.x = -Math.PI / 2;
  carpet.position.set(0, 0.02, 0.4);
  carpet.receiveShadow = true;
  scene.add(carpet);
  // Trim emas di tepi karpet.
  scene.add(box(0.12, 0.03, 17.5, 0xd4af37, -2.75, 0.03, 0.4, { shadow: false, metalness: 0.7 }));
  scene.add(box(0.12, 0.03, 17.5, 0xd4af37, 2.75, 0.03, 0.4, { shadow: false, metalness: 0.7 }));

  // --- Dinding keliling (rendah, supaya kamera oblique tetap melihat dalam) ---
  const wallMat = 0x2e1d12;
  scene.add(box(30, 2.4, 0.6, wallMat, 0, 1.2, ROOM.minZ - 0.3));
  scene.add(box(30, 2.4, 0.6, wallMat, 0, 1.2, ROOM.maxZ + 0.3));
  scene.add(box(0.6, 2.4, 20.6, wallMat, ROOM.minX - 0.3, 1.2, 0));
  scene.add(box(0.6, 2.4, 20.6, wallMat, ROOM.maxX + 0.3, 1.2, 0));
  // Hiasan dinding emas di utara.
  scene.add(box(20, 0.18, 0.1, 0xd4af37, 0, 2.2, ROOM.minZ + 0.05, { shadow: false, metalness: 0.7 }));

  // --- Panggung + podium lelang ---
  scene.add(box(11, 0.5, 2.4, 0x5a3a22, 0, 0.25, -8.2));
  scene.add(box(11, 0.08, 2.4, 0xd4af37, 0, 0.52, -8.2, { shadow: false, metalness: 0.7 }));
  scene.add(box(1.2, 1.3, 0.7, 0x3a2412, 0, 1.15, -8.6));
  scene.add(sphere(0.22, 0xd4af37, 0, 1.95, -8.6, { metalness: 0.8, roughness: 0.3 }));
  // Palu lelang raksasa di podium (simbol).
  const gavelHead = box(0.9, 0.35, 0.35, 0x8a5a2b, 0, 2.35, -8.6);
  gavelHead.rotation.z = 0.5;
  scene.add(gavelHead);

  // --- Cover: pilar, meja, etalase, deret kursi ---
  for (const c of COVERS) {
    if (c.kind === 'pillar') {
      scene.add(cylinder(0.75, 0.9, 3.4, 0x8a6d3b, c.x, 1.7, c.z, { metalness: 0.25 }));
      scene.add(cylinder(1.0, 1.0, 0.25, 0xd4af37, c.x, 3.4, c.z, { metalness: 0.7 }));
    } else if (c.kind === 'stage' || c.kind === 'table') {
      scene.add(box(c.hx * 2, 1.0, c.hz * 2, 0x3a2412, c.x, 0.5, c.z));
      scene.add(box(c.hx * 2 + 0.2, 0.12, c.hz * 2 + 0.2, 0x6b4a2a, c.x, 1.05, c.z));
    } else if (c.kind === 'case') {
      scene.add(box(c.hx * 2, 0.9, c.hz * 2, 0x2a1a0e, c.x, 0.45, c.z));
      const glass = box(c.hx * 2 - 0.2, 1.1, c.hz * 2 - 0.2, 0x9fd4ff, c.x, 1.45, c.z, {
        transparent: true, opacity: 0.28, roughness: 0.1, metalness: 0.1, shadow: false,
      });
      scene.add(glass);
      scene.add(box(c.hx * 2, 0.1, c.hz * 2, 0xd4af37, c.x, 2.05, c.z, { shadow: false, metalness: 0.7 }));
    } else if (c.kind === 'row') {
      scene.add(box(c.hx * 2, 0.55, c.hz * 2, 0x4a2c17, c.x, 0.28, c.z));
      scene.add(box(c.hx * 2, 0.1, c.hz * 2, 0x7a1f2b, c.x, 0.6, c.z, { shadow: false }));
    }
  }

  // --- EXIT: pintu selatan bercahaya hijau ---
  const exitGroup = new THREE.Group();
  exitGroup.position.set(EXIT_SPOT.x, 0, EXIT_SPOT.z);
  const exitPad = new THREE.Mesh(
    new THREE.CircleGeometry(EXIT_SPOT.radius, 32),
    new THREE.MeshBasicMaterial({ color: 0x2aff7a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
  );
  exitPad.rotation.x = -Math.PI / 2;
  exitPad.position.y = 0.04;
  exitGroup.add(exitPad);
  const exitRing = new THREE.Mesh(
    new THREE.RingGeometry(EXIT_SPOT.radius - 0.15, EXIT_SPOT.radius, 32),
    new THREE.MeshBasicMaterial({ color: 0x2aff7a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
  );
  exitRing.rotation.x = -Math.PI / 2;
  exitRing.position.y = 0.05;
  exitGroup.add(exitRing);
  exitGroup.add(box(2.6, 2.6, 0.3, 0x1e5c34, 0, 1.3, 0.9));
  scene.add(exitGroup);

  // --- Lot lelang (menyala, berdenyut) ---
  const lotMeshes = [];
  for (const spot of LOOT_SPOTS) {
    const group = new THREE.Group();
    group.position.set(spot.x, 0, spot.z);
    const glow = new THREE.PointLight(spot.color, 28, 6, 1.6);
    glow.position.set(0, 1.6, 0);
    group.add(glow);
    const beacon = cylinder(0.5, 0.7, 2.6, spot.color, 0, 1.3, 0, {
      transparent: true, opacity: 0.1, shadow: false, emissive: spot.color, emissiveIntensity: 0.25,
    });
    beacon.material.transparent = true;
    group.add(beacon);
    if (spot.kind === 'painting') {
      group.add(box(0.25, 1.5, 1.9, 0xd4af37, 0, 1.5, 0, { metalness: 0.7 }));
      const art = box(0.3, 1.25, 1.6, 0xc96a1e, 0, 1.5, 0, { shadow: false });
      group.add(art);
      group.add(sphere(0.3, 0xffd34d, 0, 2.6, 0, { emissive: 0xffd34d, emissiveIntensity: 0.9, shadow: false }));
    } else if (spot.kind === 'vase') {
      group.add(cylinder(0.32, 0.22, 1.0, 0x7fd4ff, 0, 1.4, 0, { roughness: 0.25, metalness: 0.3 }));
      group.add(cylinder(0.42, 0.42, 0.18, 0xd4af37, 0, 0.95, 0, { metalness: 0.7 }));
      group.add(sphere(0.3, 0x7fd4ff, 0, 2.5, 0, { emissive: 0x7fd4ff, emissiveIntensity: 0.9, shadow: false }));
    } else {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.12, 12, 24),
        new THREE.MeshStandardMaterial({ color: 0xffd34d, metalness: 0.9, roughness: 0.25, emissive: 0x442200 }));
      ring.position.set(0, 1.5, 0);
      ring.castShadow = true;
      group.add(ring);
      group.add(sphere(0.3, 0xff9de2, 0, 2.5, 0, { emissive: 0xff9de2, emissiveIntensity: 0.9, shadow: false }));
    }
    scene.add(group);
    lotMeshes.push({ group, glow, beacon, spot });
  }

  // --- Lampu gantung (chandelier) ---
  const chand = new THREE.Group();
  chand.position.set(0, 5.6, 0);
  chand.add(cylinder(0.08, 0.08, 1.6, 0x2a1a0e, 0, 0.8, 0, { shadow: false }));
  chand.add(cylinder(1.1, 0.7, 0.35, 0xd4af37, 0, 0, 0, { metalness: 0.8 }));
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    chand.add(sphere(0.14, 0xffe9a8, Math.cos(a) * 0.95, 0.15, Math.sin(a) * 0.95, { emissive: 0xffd34d, emissiveIntensity: 1, shadow: false }));
  }
  scene.add(chand);

  // --- Sorotan lot berputar (kerucut cahaya terlihat) ---
  const spotCone = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, 6, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  spotCone.position.set(0, 3, -6.5);
  scene.add(spotCone);
  const spotLight = new THREE.SpotLight(0xffe9a8, 800, 18, 0.5, 0.5, 1.4);
  spotLight.position.set(0, 6, -6.5);
  scene.add(spotLight);
  scene.add(spotLight.target);

  // --- Entitas dinamis: pemain, penjaga, anjing, kamera, kerumunan ---
  function makePerson(bodyColor, hatColor) {
    const g = new THREE.Group();
    const body = cylinder(0.34, 0.42, 1.0, bodyColor, 0, 0.85, 0);
    g.add(body);
    const head = sphere(0.26, 0xe8b98a, 0, 1.55, 0);
    g.add(head);
    const hat = cylinder(0.3, 0.34, 0.16, hatColor, 0, 1.78, 0);
    g.add(hat);
    return g;
  }
  const playerGroup = new THREE.Group();
  const pBody = cylinder(0.32, 0.4, 1.0, 0x0fb5a6, 0, 0.85, 0);
  playerGroup.add(pBody);
  const pHead = sphere(0.26, 0xf0c8a0, 0, 1.55, 0);
  playerGroup.add(pHead);
  const pMask = box(0.4, 0.12, 0.1, 0x111111, 0, 1.58, 0.22, { shadow: false });
  playerGroup.add(pMask);
  const pHat = cylinder(0.3, 0.34, 0.18, 0x111111, 0, 1.8, 0);
  playerGroup.add(pHat);
  // Cincin hijau terang di bawah pemain + panah di atas kepala.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.72, 32),
    new THREE.MeshBasicMaterial({ color: 0x2aff7a, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  playerGroup.add(ring);
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.5, 4),
    new THREE.MeshBasicMaterial({ color: 0x2aff7a }),
  );
  arrow.position.y = 2.35;
  arrow.rotation.x = Math.PI;
  playerGroup.add(arrow);
  scene.add(playerGroup);

  const guardGroups = [];
  function buildGuardMesh(isDog, color) {
    const g = new THREE.Group();
    if (isDog) {
      g.add(box(0.9, 0.45, 0.45, 0x3a2a1a, 0, 0.55, 0));
      g.add(box(0.35, 0.35, 0.35, 0x3a2a1a, 0.55, 0.75, 0));
      g.add(box(0.2, 0.35, 0.12, 0x2a1a0e, -0.55, 0.5, 0));
      const eye = sphere(0.05, 0xff2222, 0.68, 0.82, 0.14, { emissive: 0xff2222, emissiveIntensity: 1, shadow: false });
      g.add(eye);
    } else {
      const person = makePerson(color, 0x111111);
      g.add(person);
      const badge = sphere(0.07, 0xffd34d, 0, 1.15, 0.38, { metalness: 0.8, shadow: false });
      g.add(badge);
    }
    // Tanda ? / ! melayang di atas kepala (sprite teks via canvas).
    const mark = makeMarkSprite();
    mark.position.y = isDog ? 1.5 : 2.5;
    g.add(mark);
    scene.add(g);
    return { group: g, mark };
  }
  function makeMarkSprite() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const tex = new THREE.CanvasTexture(c);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(0.9, 0.9, 1);
    sprite.userData = { canvas: c, tex };
    return sprite;
  }
  function setMark(sprite, text, color) {
    const { canvas, tex } = sprite.userData;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    if (text) {
      ctx.font = 'bold 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#000';
      ctx.strokeText(text, 32, 34);
      ctx.fillStyle = color;
      ctx.fillText(text, 32, 34);
    }
    tex.needsUpdate = true;
  }

  const cameraMeshes = [];
  function buildCameraMesh() {
    const g = new THREE.Group();
    g.add(box(0.5, 0.35, 0.35, 0x222831, 0, 0, 0));
    const lens = cylinder(0.12, 0.16, 0.3, 0x111111, 0.3, 0, 0, { shadow: false });
    lens.rotation.z = Math.PI / 2;
    g.add(lens);
    const dot = sphere(0.06, 0xff2222, 0.1, 0.2, 0, { emissive: 0xff2222, emissiveIntensity: 1, shadow: false });
    g.add(dot);
    scene.add(g);
    return g;
  }

  const crowdMeshes = [];
  function buildCrowdMesh(person) {
    const g = new THREE.Group();
    g.add(cylinder(0.3, 0.36, 0.7, person.suit, 0, 0.55, 0));
    g.add(sphere(0.22, person.skin, 0, 1.1, 0));
    scene.add(g);
    return g;
  }

  // --- HUD DOM ---
  const hud = {
    loot: document.getElementById('hud-loot'),
    time: document.getElementById('hud-time'),
    noise: document.getElementById('hud-noise'),
    noiseBar: document.getElementById('hud-noise-bar'),
    alarm: document.getElementById('hud-alarm'),
    alarmBar: document.getElementById('hud-alarm-bar'),
    alarmLabel: document.getElementById('hud-alarm-label'),
    strikes: document.getElementById('hud-strikes'),
    tools: document.getElementById('hud-tools'),
    guards: document.getElementById('hud-guards'),
    banner: document.getElementById('hud-banner'),
    prompt: document.getElementById('hud-prompt'),
    minimap: document.getElementById('minimap'),
    title: document.getElementById('screen-title'),
    win: document.getElementById('screen-win'),
    lose: document.getElementById('screen-lose'),
    paused: document.getElementById('screen-paused'),
    winStats: document.getElementById('win-stats'),
    loseStats: document.getElementById('lose-stats'),
    crowdNote: document.getElementById('hud-crowd'),
  };
  const mmCtx = hud.minimap ? hud.minimap.getContext('2d') : null;

  function drawMinimap(state) {
    if (!mmCtx) return;
    const W = 220;
    const H = 150;
    mmCtx.clearRect(0, 0, W, H);
    mmCtx.fillStyle = 'rgba(10,8,14,0.85)';
    mmCtx.fillRect(0, 0, W, H);
    const sx = (x) => ((x - ROOM.minX) / (ROOM.maxX - ROOM.minX)) * W;
    const sz = (z) => ((z - ROOM.minZ) / (ROOM.maxZ - ROOM.minZ)) * H;
    mmCtx.fillStyle = '#4a3220';
    mmCtx.fillRect(sx(ROOM.minX), sz(ROOM.minZ), W, H);
    mmCtx.fillStyle = '#6e1423';
    mmCtx.fillRect(sx(-2.7), sz(-8.3), sx(2.7) - sx(-2.7), sz(9.2) - sz(-8.3));
    mmCtx.fillStyle = '#2e1d12';
    for (const c of COVERS) mmCtx.fillRect(sx(c.x - c.hx), sz(c.z - c.hz), sx(c.x + c.hx) - sx(c.x - c.hx), sz(c.z + c.hz) - sz(c.z - c.hz));
    // EXIT hijau.
    mmCtx.fillStyle = '#2aff7a';
    mmCtx.beginPath();
    mmCtx.arc(sx(EXIT_SPOT.x), sz(EXIT_SPOT.z), 7, 0, Math.PI * 2);
    mmCtx.fill();
    // Loot.
    for (const spot of LOOT_SPOTS) {
      if (state.lootTaken[spot.id]) continue;
      mmCtx.fillStyle = '#ffd34d';
      mmCtx.beginPath();
      mmCtx.arc(sx(spot.x), sz(spot.z), 4.5, 0, Math.PI * 2);
      mmCtx.fill();
    }
    // Cone penjaga (segitiga) + titik penjaga.
    for (const g of state.guards) {
      mmCtx.fillStyle = g.state === STATE_ALERT ? 'rgba(255,46,46,0.4)' : 'rgba(255,211,77,0.35)';
      mmCtx.beginPath();
      mmCtx.moveTo(sx(g.x), sz(g.z));
      const a1 = g.viewAngle - g.halfAngle;
      const a2 = g.viewAngle + g.halfAngle;
      mmCtx.lineTo(sx(g.x + Math.cos(a1) * g.range), sz(g.z + Math.sin(a1) * g.range));
      mmCtx.lineTo(sx(g.x + Math.cos(a2) * g.range), sz(g.z + Math.sin(a2) * g.range));
      mmCtx.closePath();
      mmCtx.fill();
      mmCtx.fillStyle = g.isDog ? '#8a5a2b' : '#ff5a5a';
      mmCtx.beginPath();
      mmCtx.arc(sx(g.x), sz(g.z), 3.5, 0, Math.PI * 2);
      mmCtx.fill();
    }
    // Kamera.
    mmCtx.fillStyle = '#9fd4ff';
    for (const cam of state.cameras) {
      mmCtx.beginPath();
      mmCtx.arc(sx(cam.x), sz(cam.z), 3, 0, Math.PI * 2);
      mmCtx.fill();
    }
    // Pemain: titik putih bercincin hijau.
    mmCtx.strokeStyle = '#2aff7a';
    mmCtx.lineWidth = 2;
    mmCtx.beginPath();
    mmCtx.arc(sx(state.player.x), sz(state.player.z), 5, 0, Math.PI * 2);
    mmCtx.stroke();
    mmCtx.fillStyle = '#fff';
    mmCtx.beginPath();
    mmCtx.arc(sx(state.player.x), sz(state.player.z), 3, 0, Math.PI * 2);
    mmCtx.fill();
  }

  function fmtTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  let guardMeshInit = false;
  let cameraMeshInit = false;
  let crowdMeshInit = false;

  function ensureMeshes(state) {
    if (!guardMeshInit) {
      for (const g of state.guards) {
        const built = buildGuardMesh(g.isDog, g.color);
        const cone = makeConeFan(g.range, g.halfAngle, 0xffd34d);
        cone.position.y = 0.07;
        scene.add(cone);
        guardGroups.push({ ...built, cone, guard: g });
      }
      guardMeshInit = true;
    }
    if (!cameraMeshInit) {
      for (const cam of state.cameras) {
        const mesh = buildCameraMesh();
        const cone = makeConeFan(cam.range, cam.halfAngle, 0x9fd4ff);
        cone.material.opacity = 0.28;
        cone.position.y = 0.07;
        scene.add(cone);
        cameraMeshes.push({ mesh, cone, cam });
      }
      cameraMeshInit = true;
    }
    if (!crowdMeshInit) {
      for (const person of state.crowd) crowdMeshes.push(buildCrowdMesh(person));
      crowdMeshInit = true;
    }
  }

  function draw(state, screen, best) {
    ensureMeshes(state);
    const t = state.time;
    // --- Pemain ---
    playerGroup.position.set(state.player.x, 0, state.player.z);
    playerGroup.rotation.y = -state.player.angle + Math.PI / 2;
    const blink = state.player.invulnerable > 0 && Math.floor(t * 8) % 2 === 0;
    playerGroup.visible = !blink;
    ring.material.opacity = 0.6 + Math.sin(t * 5) * 0.3;
    arrow.position.y = 2.35 + Math.sin(t * 3) * 0.12;

    // --- Penjaga + cone ---
    for (const entry of guardGroups) {
      const g = entry.guard;
      entry.group.position.set(g.x, 0, g.z);
      entry.group.rotation.y = g.isDog ? -g.viewAngle : -g.viewAngle + Math.PI / 2;
      entry.cone.position.set(g.x, 0.07, g.z);
      entry.cone.rotation.y = -g.viewAngle;
      const col = coneColor(g);
      entry.cone.material.color.setHex(col);
      entry.cone.material.opacity = g.state === STATE_ALERT ? 0.5 : 0.42;
      const mark = g.state === STATE_ALERT ? '!' : g.state === STATE_SUSPICIOUS || g.state === STATE_SEARCH ? '?' : '';
      const markColor = g.state === STATE_ALERT ? '#ff2e2e' : '#ff9a1f';
      setMark(entry.mark, mark, markColor);
    }

    // --- Kamera ---
    for (const entry of cameraMeshes) {
      const cam = entry.cam;
      entry.mesh.position.set(cam.x, 2.6, cam.z);
      entry.mesh.rotation.y = -cam.angle;
      entry.mesh.rotation.x = 0.5;
      entry.cone.position.set(cam.x, 0.07, cam.z);
      entry.cone.rotation.y = -cam.angle;
      entry.cone.material.opacity = cam.seeing ? 0.48 : 0.28;
    }

    // --- Kerumunan ---
    state.crowd.forEach((person, i) => {
      const mesh = crowdMeshes[i];
      if (!mesh) return;
      mesh.position.set(person.x, 0, person.z);
      mesh.rotation.y = Math.sin(person.phase) * 0.4;
    });

    // --- Lot: hilang saat diambil, berdenyut saat masih ada ---
    for (const lot of lotMeshes) {
      const taken = state.lootTaken[lot.spot.id];
      lot.group.visible = !taken;
      if (!taken) {
        const pulse = 1 + Math.sin(t * 3 + lot.spot.id * 2) * 0.12;
        lot.group.scale.set(pulse, 1, pulse);
        lot.glow.intensity = 24 + Math.sin(t * 3) * 8;
      }
    }

    // --- Sorotan berputar ---
    spotCone.position.set(state.spotlight.x, 3, state.spotlight.z);
    spotLight.position.set(state.spotlight.x, 6, state.spotlight.z);
    spotLight.target.position.set(state.spotlight.x, 0, state.spotlight.z);
    spotLight.target.updateMatrixWorld();

    // --- EXIT berdenyut saat semua lot didapat ---
    exitGroup.children[0].material.opacity = state.lootCount === 3 ? 0.35 + Math.sin(t * 4) * 0.12 : 0.16;

    // --- HUD ---
    if (hud.loot) hud.loot.textContent = `◆ ${state.lootCount}/3 Lot  ·  Skor ${state.score}`;
    if (hud.time) hud.time.textContent = fmtTime(state.time);
    if (hud.noise) {
      hud.noise.textContent = state.player.noise > 70 ? '🔊 Bising!' : state.player.noise > 30 ? '🔈 Berisik' : '🤫 Senyap';
      if (hud.noiseBar) hud.noiseBar.style.width = `${Math.round(state.player.noise)}%`;
    }
    if (hud.alarm) {
      hud.alarm.textContent = `ALARM ${Math.round(state.alarm)}%`;
      if (hud.alarmBar) {
        hud.alarmBar.style.width = `${Math.round(state.alarm)}%`;
        hud.alarmBar.style.background = state.alarm > 70 ? '#ff2e2e' : state.alarm > 35 ? '#ff9a1f' : '#2aff7a';
      }
      if (hud.alarmLabel) {
        hud.alarmLabel.textContent = state.alarm >= 100 ? 'SIAGA PENUH!' : state.alarm > 35 ? 'WASPADA' : 'AMAN';
      }
    }
    if (hud.strikes) hud.strikes.textContent = `✖ Strike ${state.strikes}/${3}`;
    if (hud.tools) hud.tools.textContent = `🪙 Koin pengalih (Q): ${state.player.distractions}  ·  E: ambil  ·  Shift: lari  ·  M: suara`;
    if (hud.guards) {
      const parts = state.guards.map((g) => {
        const icon = g.state === STATE_ALERT ? '!' : g.state === STATE_SUSPICIOUS || g.state === STATE_SEARCH ? '?' : '·';
        return `${g.name} ${icon}`;
      });
      hud.guards.textContent = parts.join('  ·  ');
      hud.guards.style.color = state.guards.some((g) => g.state === STATE_ALERT) ? '#ff6b6b' : '#e8d9a0';
    }
    if (hud.banner) {
      if (state.messageTimer > 0 && state.message) {
        hud.banner.textContent = state.message;
        hud.banner.style.opacity = '1';
      } else {
        hud.banner.style.opacity = '0';
      }
    }
    if (hud.prompt) {
      if (state.nearLoot && !state.over) {
        hud.prompt.textContent = `Tekan E — ambil ${state.nearLoot.name}`;
        hud.prompt.style.opacity = '1';
      } else if (state.lootCount === 3 && !state.over) {
        hud.prompt.textContent = 'Semua lot didapat — KABUR ke pintu hijau selatan!';
        hud.prompt.style.opacity = '1';
      } else {
        hud.prompt.style.opacity = '0';
      }
    }
    if (hud.crowdNote) {
      hud.crowdNote.textContent = state.player.inCrowd ? '👥 Bersembunyi di kerumunan — deteksi melambat' : '';
    }
    drawMinimap(state);

    // --- Layar overlay ---
    const show = (el, on) => {
      if (el) el.style.display = on ? 'flex' : 'none';
    };
    show(hud.title, screen === SCREEN_TITLE);
    show(hud.win, screen === SCREEN_WIN);
    show(hud.lose, screen === SCREEN_LOSE);
    show(hud.paused, screen === SCREEN_PAUSED);
    if (screen === SCREEN_WIN && hud.winStats) {
      hud.winStats.textContent = `Grade ${state.grade}  ·  Waktu ${fmtTime(state.time)}  ·  Ketahuan ${state.seenCount}x  ·  Strike ${state.strikes}/3  ·  Skor ${state.score}`;
    }
    if (screen === SCREEN_LOSE && hud.loseStats) {
      hud.loseStats.textContent = `Loot ${state.lootCount}/3  ·  Waktu ${fmtTime(state.time)}  ·  Strike ${state.strikes}/3  ·  Skor ${state.score}`;
    }

    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  return { draw };
}
