// SOLARA BAY — people.js: pedestrians, the player on foot, rivals and the downed.
// Blocky figures with initials, never drawn faces — Lyso's eye-test rule.
import * as THREE from '../vendor/three.module.min.js';

const SHIRTS = [0xe84a3f, 0x3fa7a0, 0xf2a541, 0x7a5fd0, 0xe87aa0, 0x4a90d9, 0x8fae7e, 0xd97b5f];
const PANTS = [0x2c3a4a, 0x3a3f47, 0x5a4a3a, 0x22262e];

export function buildPerson({ shirt = 0xe84a3f, pants = 0x2c3a4a, skin = 0xc98d64, scale = 1, armsOut = false } = {}) {
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: pants });
  const skinMat = new THREE.MeshLambertMaterial({ color: skin });
  const hairMat = new THREE.MeshLambertMaterial({ color: 0x1d1a16 });
  // legs
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.8, 0.32), pantsMat);
    leg.position.set(s * 0.2, 0.4, 0); leg.castShadow = true; g.add(leg);
  }
  // torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.5), shirtMat);
  torso.position.y = 1.28; torso.castShadow = true; g.add(torso);
  // arms
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.85, 0.26), armsOut ? shirtMat : skinMat);
    if (armsOut) { arm.rotation.z = s * Math.PI / 2.2; arm.position.set(s * 0.62, 1.5, 0); }
    else { arm.position.set(s * 0.62, 1.25, 0); }
    arm.castShadow = true; g.add(arm);
  }
  // head: plain block, hair cap, NO face drawn
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skinMat);
  head.position.y = 2.05; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.6), hairMat);
  hair.position.y = 2.36; g.add(hair);
  g.scale.setScalar(scale);
  g.userData.head = head;
  return g;
}

export function buildDownedEnemy({ shirt = 0xf2a541 } = {}) {
  // Lying flat on the ground, arms out — the market squeeze aftermath.
  const g = new THREE.Group();
  const shirtMat = new THREE.MeshLambertMaterial({ color: shirt });
  const pantsMat = new THREE.MeshLambertMaterial({ color: 0x2c3a4a });
  const skinMat = new THREE.MeshLambertMaterial({ color: 0xc98d64 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 1.5), shirtMat);
  torso.position.y = 0.3; torso.castShadow = true; g.add(torso);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 1.0), pantsMat);
    leg.position.set(s * 0.2, 0.18, -1.2); g.add(leg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.9), skinMat);
    arm.position.set(s * 0.7, 0.18, 0.3); arm.rotation.y = s * 0.5; g.add(arm);
  }
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.55), skinMat);
  head.position.set(0.15, 0.25, 1.05); g.add(head);
  // a dropped weapon beside the body
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), new THREE.MeshLambertMaterial({ color: 0x1a1d22 }));
  gun.position.set(1.3, 0.1, 0.6); gun.rotation.y = 0.7; g.add(gun);
  return g;
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Crowd of pedestrians wandering the sidewalks and the market.
export function spawnCrowd(scene, count, area, seed = 11) {
  const rng = mulberry(seed);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = buildPerson({ shirt: SHIRTS[i % SHIRTS.length], pants: PANTS[Math.floor(rng() * PANTS.length)], skin: [0xc98d64, 0x8a5f3c, 0xe8b98a][i % 3] });
    p.position.set(area.x + (rng() - 0.5) * area.w, 0, area.z + (rng() - 0.5) * area.h);
    p.rotation.y = rng() * Math.PI * 2;
    scene.add(p);
    peds.push({ mesh: p, speed: 0.6 + rng() * 1.1, dir: rng() * Math.PI * 2, area, phase: rng() * 10 });
  }
  return peds;
}

export function updateCrowd(peds, dt, t) {
  for (const p of peds) {
    p.phase += dt;
    p.mesh.position.x += Math.cos(p.dir) * p.speed * dt;
    p.mesh.position.z += Math.sin(p.dir) * p.speed * dt;
    // gentle bob while walking
    p.mesh.position.y = Math.abs(Math.sin(p.phase * 6)) * 0.06;
    p.mesh.rotation.y = -p.dir + Math.PI / 2;
    // stay inside the area, turn around at the edges
    const a = p.area;
    if (Math.abs(p.mesh.position.x - a.x) > a.w / 2 || Math.abs(p.mesh.position.z - a.z) > a.h / 2) p.dir += Math.PI;
  }
}
