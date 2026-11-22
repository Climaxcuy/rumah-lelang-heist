// Kamera CCTV: terpasang di dinding, menyapu ruangan dengan cone yang
// berayun. Terlihat kamera = alarm naik (tanpa strike langsung).
import { CAMERA_DEFS, VISION } from './config.js';
import { canSee } from './guards.js';
import { hasLineOfSight } from './level.js';

export function createCameras() {
  return CAMERA_DEFS.map((d) => ({
    x: d.x,
    z: d.z,
    baseAngle: d.baseAngle,
    sweep: d.sweep,
    speed: d.speed,
    phase: d.phase,
    angle: d.baseAngle,
    viewAngle: d.baseAngle,
    range: VISION.cameraRange,
    halfAngle: VISION.cameraHalfAngle,
    seeing: false,
    time: d.phase,
  }));
}

export function stepCamera(cam, player, dt) {
  cam.time += dt;
  cam.angle = cam.baseAngle + Math.sin(cam.time * cam.speed) * cam.sweep;
  cam.viewAngle = cam.angle;
  // Kamera butuh garis pandang bersih; kerumunan juga meredamnya.
  const vis = canSee(cam, player.x, player.z, player.inCrowd);
  cam.seeing = vis > 0;
  return cam.seeing ? vis : 0;
}

export function cameraSees(cam, px, pz) {
  const dx = px - cam.x;
  const dz = pz - cam.z;
  const dist = Math.hypot(dx, dz);
  if (dist > cam.range) return false;
  let diff = Math.atan2(dz, dx) - cam.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > cam.halfAngle) return false;
  return hasLineOfSight(cam.x, cam.z, px, pz);
}
