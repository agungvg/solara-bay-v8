// SOLARA BAY — world.js: builds the city, beach, ocean and night market.
// One clear job: turn data into Three.js meshes. No gameplay logic here.
import * as THREE from '../vendor/three.module.min.js';

export function makeMaterials() {
  return {
    asphalt: new THREE.MeshLambertMaterial({ color: 0x2e3138 }),
    asphaltWet: new THREE.MeshLambertMaterial({ color: 0x23262e }),
    sidewalk: new THREE.MeshLambertMaterial({ color: 0x9a8f80 }),
    sand: new THREE.MeshLambertMaterial({ color: 0xe8d3a0 }),
    ocean: new THREE.MeshPhongMaterial({ color: 0x1e6f8e, shininess: 120, transparent: true, opacity: 0.92 }),
    grass: new THREE.MeshLambertMaterial({ color: 0x5d8a4a }),
    plaza: new THREE.MeshLambertMaterial({ color: 0xb9a98c }),
    laneWhite: new THREE.MeshBasicMaterial({ color: 0xf5f2e8 }),
    laneYellow: new THREE.MeshBasicMaterial({ color: 0xf2c230 }),
    curb: new THREE.MeshLambertMaterial({ color: 0x6b655c }),
  };
}

const BUILDING_COLORS = [0xc96f4a, 0xd9a441, 0x7a9bb5, 0xb5768a, 0x8fae7e, 0xd97b5f, 0x6f8f9e, 0xe0b56a, 0x9a7fb0, 0x5f7d6a];
const AWNING_COLORS = [0xe84a3f, 0xf2a541, 0x3fa7a0, 0xe87aa0, 0x7a5fd0, 0x4a90d9];

export const colliders = [];

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function buildCity(scene, mats, opts = {}) {
  const group = new THREE.Group();
  const night = !!opts.night;
  const rng = mulberry(opts.seed ?? 7);

  // --- ground: sand base, then a street grid of asphalt with sidewalks ---
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), mats.sand);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true;
  group.add(ground);

  // Ocean to the south (negative z is the beachfront in our map)
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(700, 260), mats.ocean);
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(0, 0.02, -330);
  group.add(ocean);
  // wet sand strip
  const wet = new THREE.Mesh(new THREE.PlaneGeometry(700, 26), new THREE.MeshLambertMaterial({ color: 0xd9c08a }));
  wet.rotation.x = -Math.PI / 2; wet.position.set(0, 0.03, -215); group.add(wet);

  // Street grid: avenues every 60 units, streets every 60, each 14 wide with lane markings.
  const roads = [];
  for (let x = -180; x <= 180; x += 60) roads.push({ x, z: 0, vertical: true });
  for (let z = -180; z <= 200; z += 60) roads.push({ x: 0, z, vertical: false });
  for (const r of roads) {
    const len = r.vertical ? 420 : 420;
    const road = new THREE.Mesh(new THREE.PlaneGeometry(14, len), night ? mats.asphaltWet : mats.asphalt);
    road.rotation.x = -Math.PI / 2;
    road.position.set(r.vertical ? r.x : 0, 0.06, r.vertical ? 10 : r.z);
    if (!r.vertical) road.rotation.z = Math.PI / 2;
    road.receiveShadow = true;
    group.add(road);
    // sidewalks
    for (const side of [-9, 9]) {
      const walk = new THREE.Mesh(new THREE.PlaneGeometry(4, len), mats.sidewalk);
      walk.rotation.x = -Math.PI / 2;
      walk.position.set(r.vertical ? r.x + side : (r.vertical ? 0 : side * 0 + 0), 0.05, r.vertical ? 10 : r.z);
      if (!r.vertical) { walk.rotation.z = Math.PI / 2; walk.position.set(0, 0.05, r.z + side); }
      group.add(walk);
    }
    // centre dashes / double yellow
    for (let d = -200; d < 220; d += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), mats.laneYellow);
      dash.rotation.x = -Math.PI / 2;
      if (r.vertical) dash.position.set(r.x - 0.6, 0.08, d);
      else { dash.rotation.z = Math.PI / 2; dash.position.set(d, 0.08, r.z - 0.6); }
      group.add(dash);
      const dash2 = dash.clone();
      if (r.vertical) dash2.position.set(r.x + 0.6, 0.08, d);
      else dash2.position.set(d, 0.08, r.z + 0.6);
      group.add(dash2);
    }
    // edge lines
    for (const side of [-6, 6]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.35, len), mats.laneWhite);
      edge.rotation.x = -Math.PI / 2;
      if (r.vertical) edge.position.set(r.x + side, 0.08, 10);
      else { edge.rotation.z = Math.PI / 2; edge.position.set(10, 0.08, r.z + side); }
      group.add(edge);
    }
  }

  // Crosswalks at the big intersections
  for (const cx of [-120, -60, 0, 60, 120]) {
    for (const cz of [-120, -60, 0, 60, 120, 180]) {
      for (let i = -3; i <= 3; i++) {
        const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 5), mats.laneWhite);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(cx + i * 2.2, 0.09, cz - 8.5);
        group.add(stripe);
      }
    }
  }

  // --- buildings: blocks between roads, varied heights, lit windows at night ---
  const windowMat = new THREE.MeshBasicMaterial({ color: night ? 0xffd27a : 0x2c3a4a });
  const windowDark = new THREE.MeshBasicMaterial({ color: 0x1d2733 });
  for (let bx = -180; bx <= 150; bx += 60) {
    for (let bz = -180; bz <= 180; bz += 60) {
      if (bz < -200) continue;
      if ((bx === -60 || bx === 0) && bz === 120) continue; // Lantern Market plaza stays open
      if (rng() < 0.18) continue; // empty lot / plaza
      const w = 26 + rng() * 14, d = 26 + rng() * 14, h = 10 + rng() * 34;
      const col = BUILDING_COLORS[Math.floor(rng() * BUILDING_COLORS.length)];
      const b = box(w, h, d, new THREE.MeshLambertMaterial({ color: col }), bx + 30, h / 2, bz + 30);
      group.add(b);
      colliders.push({ x: bx + 30, z: bz + 30, hw: w / 2 + 1, hd: d / 2 + 1 });
      // roof rim
      group.add(box(w + 1, 0.8, d + 1, new THREE.MeshLambertMaterial({ color: 0x3a3f47 }), bx + 30, h + 0.4, bz + 30));
      // windows
      const floors = Math.max(1, Math.floor(h / 6));
      const cols = Math.max(2, Math.floor(w / 7));
      for (let f = 0; f < floors; f++) {
        for (let c = 0; c < cols; c++) {
          const lit = night ? rng() < 0.55 : rng() < 0.25;
          const win = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.4), lit ? windowMat : windowDark);
          win.position.set(bx + 30 - w / 2 + 4 + c * 7, 4 + f * 6, bz + 30 + d / 2 + 0.06);
          group.add(win);
        }
      }
      // shop sign strip on ground floor for street-facing blocks
      if (rng() < 0.5) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.7, 2), new THREE.MeshBasicMaterial({ color: AWNING_COLORS[Math.floor(rng() * AWNING_COLORS.length)] }));
        sign.position.set(bx + 30, 5.2, bz + 30 + d / 2 + 0.08);
        group.add(sign);
      }
    }
  }

  // --- palms along the beachfront road ---
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const leafMat = new THREE.MeshLambertMaterial({ color: night ? 0x2e6b34 : 0x3f9e4d });
  for (let x = -190; x <= 190; x += 16) {
    if (rng() < 0.15) continue;
    const px = x + (rng() - 0.5) * 4, pz = -206 + (rng() - 0.5) * 4;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), trunkMat);
    trunk.position.set(px, 4.5, pz); trunk.rotation.z = (rng() - 0.5) * 0.15;
    trunk.castShadow = true; group.add(trunk);
    for (let l = 0; l < 6; l++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5.5, 4), leafMat);
      const a = (l / 6) * Math.PI * 2;
      leaf.position.set(px + Math.cos(a) * 2.2, 9.6, pz + Math.sin(a) * 2.2);
      leaf.rotation.z = Math.cos(a) * 1.1; leaf.rotation.x = -Math.sin(a) * 1.1;
      group.add(leaf);
    }
  }
  // a few palms inland too
  for (let i = 0; i < 24; i++) {
    const px = -180 + rng() * 360, pz = -180 + rng() * 360;
    if (Math.abs(px % 60) < 12 || Math.abs(pz % 60) < 12) continue;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 8, 6), trunkMat);
    trunk.position.set(px, 4, pz); group.add(trunk);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.4, 6), leafMat);
    top.position.set(px, 9.2, pz); group.add(top);
  }

  // --- street lamps ---
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x333a44 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: night ? 0xffe9a8 : 0xcfd6de });
  for (let x = -180; x <= 180; x += 60) {
    for (let z = -180; z <= 180; z += 120) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 7, 6), lampMat);
      pole.position.set(x + 8, 3.5, z + 8); group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), bulbMat);
      bulb.position.set(x + 8, 7.2, z + 8); group.add(bulb);
      if (night) {
        const glow = new THREE.PointLight(0xffc46a, 12, 26, 1.6);
        glow.position.set(x + 8, 7, z + 8); group.add(glow);
      }
    }
  }

  // --- night market: stalls with awnings, crates, string lights ---
  const market = new THREE.Group();
  // warm plaza slab under the market so it reads as one square
  const plazaSlab = new THREE.Mesh(new THREE.PlaneGeometry(140, 84), new THREE.MeshLambertMaterial({ color: 0x9a7f5e }));
  plazaSlab.rotation.x = -Math.PI / 2; plazaSlab.position.set(4, 0.04, 152);
  market.add(plazaSlab);
  for (let i = 0; i < 16; i++) {
    const sx = -48 + (i % 8) * 14 + (rng() - 0.5) * 3;
    const sz = 138 + Math.floor(i / 8) * 26 + (rng() - 0.5) * 3;
    const awn = AWNING_COLORS[i % AWNING_COLORS.length];
    const stall = new THREE.Group();
    const counter = box(7, 1.1, 3.4, new THREE.MeshLambertMaterial({ color: 0x8a6a45 }), 0, 0.55, 0);
    stall.add(counter);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.2, 4), new THREE.MeshLambertMaterial({ color: awn }));
    roof.position.y = 3.6; roof.rotation.y = Math.PI / 4; roof.castShadow = true; stall.add(roof);
    // bright striped canopy panel — reads as a market awning even at night
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.18, 4.4), new THREE.MeshBasicMaterial({ color: awn }));
    canopy.position.y = 2.7; canopy.rotation.z = 0.08; stall.add(canopy);
    const canopyStripe = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.2, 1.1), new THREE.MeshBasicMaterial({ color: 0xfff2d8 }));
    canopyStripe.position.y = 2.72; canopyStripe.rotation.z = 0.08; stall.add(canopyStripe);
    for (const [px, pz] of [[-3, -1.4], [3, -1.4], [-3, 1.4], [3, 1.4]]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 5), lampMat);
      post.position.set(px, 1.3, pz); stall.add(post);
    }
    // goods on the counter
    for (let g = 0; g < 5; g++) {
      const good = box(0.7 + rng() * 0.5, 0.5 + rng() * 0.6, 0.7, new THREE.MeshLambertMaterial({ color: AWNING_COLORS[Math.floor(rng() * AWNING_COLORS.length)] }), -2.6 + g * 1.3, 1.4, (rng() - 0.5) * 1.6);
      stall.add(good);
    }
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), bulbMat);
    bulb.position.set(0, 2.9, 0); stall.add(bulb);
    if (night) {
      const glow = new THREE.PointLight(0xffb45e, 8, 16, 1.8);
      glow.position.set(0, 3, 0); stall.add(glow);
    }
    stall.position.set(sx, 0, sz);
    market.add(stall);
    // crates beside
    market.add(box(1.4, 1.4, 1.4, new THREE.MeshLambertMaterial({ color: 0x9a7a4e }), sx + 5, 0.7, sz + 2));
  }
  // string lights across the market
  for (let s = 0; s < 6; s++) {
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 46, 4), lampMat);
    line.rotation.z = Math.PI / 2; line.position.set(-30, 6.5, 138 + s * 14);
    market.add(line);
    for (let b = 0; b < 8; b++) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), new THREE.MeshBasicMaterial({ color: night ? 0xffd27a : 0xffe9a8 }));
      bulb.position.set(-50 + b * 6, 6.3, 138 + s * 14);
      market.add(bulb);
    }
  }
  group.add(market);

  // --- harbor: containers + workshop lift pad ---
  const contCols = [0xd95f3b, 0x3f7fb5, 0x4a9e5f, 0xe0a83b];
  for (let i = 0; i < 10; i++) {
    const c = box(10, 3, 3, new THREE.MeshLambertMaterial({ color: contCols[i % 4] }), -185 + (i % 5) * 13, 1.5 + Math.floor(i / 5) * 3.1, 60 + (i % 3) * 8);
    group.add(c);
  }
  // workshop pad (Dockside Customs)
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.3, 24), new THREE.MeshLambertMaterial({ color: 0x22262e }));
  pad.position.set(-160, 0.15, 90); group.add(pad);
  const padRing = new THREE.Mesh(new THREE.TorusGeometry(8.4, 0.25, 8, 32), new THREE.MeshBasicMaterial({ color: 0xf2c230 }));
  padRing.rotation.x = Math.PI / 2; padRing.position.set(-160, 0.32, 90); group.add(padRing);

  // --- pier into the ocean ---
  const pier = box(10, 1, 90, new THREE.MeshLambertMaterial({ color: 0x8a6a45 }), -90, 0.6, -260);
  group.add(pier);
  for (let p = 0; p < 8; p++) {
    group.add(box(0.8, 2.4, 0.8, lampMat, -95, 1.8, -225 - p * 10));
    group.add(box(0.8, 2.4, 0.8, lampMat, -85, 1.8, -225 - p * 10));
  }

  // --- distant skyline silhouette + sun/moon ---
  for (let i = 0; i < 18; i++) {
    const h = 30 + rng() * 60;
    const sil = box(14 + rng() * 10, h, 10, new THREE.MeshLambertMaterial({ color: night ? 0x1c2230 : 0x8a7a68 }), -320 + i * 38, h / 2, -300 - rng() * 40);
    group.add(sil);
  }

  scene.add(group);
  return group;
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
