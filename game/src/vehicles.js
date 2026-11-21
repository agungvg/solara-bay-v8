// SOLARA BAY — vehicles.js: every car, scooter and helicopter in the city.
// Low-poly box-built vehicles, each with a name, colour and damage state.
import * as THREE from '../vendor/three.module.min.js';

const PALETTE = {
  hero: 0xe84a3f, hero2: 0xf2a541, police: 0xf2f2f2, policeTrim: 0x1c5fb5,
  taxi: 0xf2c230, sedan: 0x7a9bb5, coupe: 0xb5768a, van: 0x8fae7e, truck: 0xd97b5f,
  regent: 0x2c2f38, scooter: 0xe87aa0, boat: 0x3f7fb5,
};

export function buildCar({ color = 0x7a9bb5, kind = 'sedan', dented = 0 } = {}) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x18242e, shininess: 90 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
  const len = kind === 'van' ? 5.6 : kind === 'truck' ? 6.4 : 4.4;
  const wid = kind === 'truck' ? 2.4 : 2.0;
  const body = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.85, len), bodyMat);
  body.position.y = 0.75; body.castShadow = true; g.add(body);
  const cabinH = kind === 'van' ? 1.1 : 0.75;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(wid * 0.86, cabinH, len * 0.48), kind === 'truck' ? bodyMat : glassMat);
  cabin.position.set(0, 1.35 + (kind === 'van' ? 0.15 : 0), kind === 'van' ? -0.4 : -0.2);
  cabin.castShadow = true; g.add(cabin);
  if (kind === 'truck') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(wid, 0.7, len * 0.4), darkMat);
    bed.position.set(0, 1.3, len * 0.28); g.add(bed);
  }
  // wheels
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  for (const [wx, wz] of [[-wid / 2, len / 2 - 0.9], [wid / 2, len / 2 - 0.9], [-wid / 2, -len / 2 + 0.9], [wid / 2, -len / 2 + 0.9]]) {
    const w = new THREE.Mesh(wheelGeo, darkMat);
    w.rotation.z = Math.PI / 2; w.position.set(wx, 0.42, wz); g.add(w);
  }
  // headlights + taillights
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2a1a });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), hl);
    h.position.set(s * 0.65, 0.8, len / 2 + 0.02); g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), tl);
    t.position.set(s * 0.65, 0.8, -len / 2 - 0.02); g.add(t);
  }
  if (kind === 'police') {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(wid + 0.02, 0.3, len + 0.02), new THREE.MeshLambertMaterial({ color: PALETTE.policeTrim }));
    stripe.position.y = 0.95; g.add(stripe);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(-0.3, 1.95, -0.2); g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.4), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar2.position.set(0.3, 1.95, -0.2); g.add(bar2);
    g.userData.lightbar = [bar, bar2];
  }
  if (kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.5), new THREE.MeshBasicMaterial({ color: 0xf2c230 }));
    sign.position.set(0, 1.95, -0.2); g.add(sign);
  }
  // dents: dark crumple patches + a tilted panel when damaged
  if (dented > 0) {
    const dentMat = new THREE.MeshLambertMaterial({ color: 0x3a2e28 });
    for (let i = 0; i < Math.min(4, Math.floor(dented / 20)); i++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.1), dentMat);
      d.position.set((i % 2 ? 0.7 : -0.7), 0.9, len / 2 - 0.6 - i * 0.5);
      d.rotation.z = (i % 2 ? 1 : -1) * 0.25;
      g.add(d);
    }
    if (dented > 50) {
      const smoke = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.55 }));
      smoke.position.set(0.4, 2.2, 1.2); g.add(smoke);
      g.userData.smoke = smoke;
    }
  }
  g.userData.kind = kind;
  return g;
}

export function buildScooter(color = PALETTE.scooter) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 1.7), mat);
  deck.position.y = 0.5; g.add(deck);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 0.7), dark);
  seat.position.set(0, 0.72, -0.5); g.add(seat);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), dark);
  stem.position.set(0, 0.9, 0.75); stem.rotation.x = -0.3; g.add(stem);
  const wg = new THREE.CylinderGeometry(0.32, 0.32, 0.2, 10);
  for (const z of [0.75, -0.75]) {
    const w = new THREE.Mesh(wg, dark);
    w.rotation.z = Math.PI / 2; w.position.set(0, 0.32, z); g.add(w);
  }
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.08), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  hl.position.set(0, 0.75, 0.9); g.add(hl);
  return g;
}

export function buildHelicopter() {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x7fb2d9 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1a1d22 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 4.6), bodyMat);
  body.castShadow = true; g.add(body);
  // white belly stripe so the air unit reads against a night sky
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.4, 4.65), new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }));
  stripe.position.y = -0.4; g.add(stripe);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.0, 1.4), new THREE.MeshPhongMaterial({ color: 0x9fd4e8, shininess: 120 }));
  glass.position.set(0, 0.2, 1.8); g.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.4), bodyMat);
  tail.position.set(0, 0.3, -4.2); g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.6, 1.0), dark);
  fin.position.set(0, 0.9, -6.2); g.add(fin);
  const skidGeo = new THREE.BoxGeometry(0.18, 0.18, 3.6);
  for (const s of [-1, 1]) {
    const skid = new THREE.Mesh(skidGeo, dark);
    skid.position.set(s * 0.9, -1.1, 0.4); g.add(skid);
  }
  // main rotor (spins in the loop)
  const rotor = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(11, 0.08, 0.5), dark);
    blade.position.y = 0; rotor.add(blade);
    const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2; rotor.add(blade2);
  }
  rotor.position.y = 1.15; g.add(rotor);
  g.userData.rotor = rotor;
  // searchlight cone (visible at night / sunset chases) — narrow at the
  // helicopter, widening toward the ground like a real spotlight
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(5.5, 22, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.20, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -11.5; // apex up at the heli, wide end down on the street
  g.add(cone);
  g.userData.searchlight = cone;
  const spot = new THREE.Mesh(new THREE.CircleGeometry(4.5, 20), new THREE.MeshBasicMaterial({ color: 0xfff6c8, transparent: true, opacity: 0.35 }));
  spot.rotation.x = -Math.PI / 2; spot.position.y = -22; g.add(spot);
  g.userData.spotPool = spot;
  return g;
}

export function buildBoat() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 8), new THREE.MeshLambertMaterial({ color: PALETTE.boat }));
  hull.position.y = 0.55; g.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.4, 5.5), new THREE.MeshLambertMaterial({ color: 0xe8e2d4 }));
  deck.position.y = 1.25; g.add(deck);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 2.4), new THREE.MeshPhongMaterial({ color: 0x18242e, shininess: 80 }));
  cabin.position.set(0, 1.9, -0.8); g.add(cabin);
  return g;
}

export { PALETTE };
