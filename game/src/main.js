// SOLARA BAY — main.js: the game itself. Driving, walking, police, missions,
// wanted level, saves, screenshots. Everything else is a module it wires up.
import * as THREE from '../vendor/three.module.min.js';
import { buildCity, makeMaterials, mulberry, colliders } from './world.js';
import { buildCar, buildScooter, buildHelicopter, buildBoat, PALETTE } from './vehicles.js';
import { buildPerson, buildDownedEnemy, spawnCrowd, updateCrowd } from './people.js';
import { DISTRICTS, MISSIONS, CREW, RADIO, POLICE_NAMES, POLICE_ROLES } from './data.js';
import { buildHUD, updateHUD, setDialogue, toast, showScreen } from './hud.js';
import { buildMeta, renderMetaBody, setMetaTab } from './meta.js';
import { AudioEngine } from './audio.js';
import { initInput, pressed, edgePressed, isMouseDown } from './input.js';
import { SHOTS, parseShot } from './shots.js';

const WORLD = { min: -260, max: 260 };
const SAVE_KEY = 'solara-bay-v8-save';

export const S = {
  mode: 'title', // title | play | meta | busted
  time: 'sunset', clock: '16:00',
  cash: 2450, wanted: 0, rank: 1, rankName: 'ROOKIE', xp: 120, xpMax: 800,
  health: 100, armour: 40, condition: 98, speedKmh: 0,
  inCar: false, carName: 'ON FOOT', carColor: 0xe84a3f, dented: 0,
  missionIndex: 0, stageIndex: 0, stageProgress: 0, stageLabel: '', timerText: '',
  objective: null, objectiveOnScreen: true,
  police: [], feed: 'SBP: all quiet on the bay',
  district: DISTRICTS[1], radio: RADIO[0], radioIndex: 0,
  crewChips: null, missionsDone: 0, startedAt: Date.now(),
  player: { x: 0, z: 0, heading: 0 },
  playlog: [],
};

function logPlay(msg) {
  const line = `[${((Date.now() - S.startedAt) / 1000).toFixed(1)}s] ${msg}`;
  S.playlog.push(line);
  console.log('[PLAYTEST]', line);
  window.__playlog = S.playlog;
}

function currentMission() { return MISSIONS[S.missionIndex]; }
function districtAt(x, z) {
  for (const d of DISTRICTS) if (Math.abs(x - d.x) <= d.w / 2 && Math.abs(z - d.z) <= d.h / 2) return d;
  return DISTRICTS[1];
}

// ---------- three setup ----------
let renderer, scene, camera, sunLight, ambLight;
let heroCar, playerMesh, heli, boat, objectiveBeacon, objectiveRing;
let traffic = [], policeCars = [], peds = [], rivals = [], downedMesh = null, scooterMesh = null;
let targetCar = null; // mission 4 Regent
const audio = new AudioEngine();
const edgeBag = {};
const camPos = new THREE.Vector3(0, 8, 16);
const camLook = new THREE.Vector3();

function setupLights(time) {
  scene.background = new THREE.Color(time === 'night' ? 0x0d1420 : time === 'sunset' ? 0xf7b06a : 0x87bfe8);
  scene.fog = new THREE.Fog(time === 'night' ? 0x0d1420 : time === 'sunset' ? 0xf7b06a : 0x9fc8e8, 120, 520);
  if (time === 'night') {
    ambLight = new THREE.AmbientLight(0x4455aa, 0.55);
    sunLight = new THREE.DirectionalLight(0x8fa8ff, 0.5);
    sunLight.position.set(-80, 120, 40);
  } else if (time === 'sunset') {
    ambLight = new THREE.AmbientLight(0xffb070, 0.75);
    sunLight = new THREE.DirectionalLight(0xff8a3c, 1.6);
    sunLight.position.set(-140, 55, -60);
  } else {
    ambLight = new THREE.AmbientLight(0xfff2dd, 0.9);
    sunLight = new THREE.DirectionalLight(0xfff6e0, 1.8);
    sunLight.position.set(100, 160, 60);
  }
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -160; sunLight.shadow.camera.right = 160;
  sunLight.shadow.camera.top = 160; sunLight.shadow.camera.bottom = -160;
  scene.add(ambLight); scene.add(sunLight);
}

function makeObjectiveBeacon() {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 60, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf2c230, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = 30; g.add(beam);
  const dia = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), new THREE.MeshBasicMaterial({ color: 0xf2c230 }));
  dia.position.y = 6; g.add(dia);
  g.userData.diamond = dia;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.35, 8, 32), new THREE.MeshBasicMaterial({ color: 0xf2c230 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
  objectiveRing = ring;
  return g;
}

function spawnTraffic(n, seed) {
  const rng = mulberry(seed);
  const kinds = ['sedan', 'coupe', 'taxi', 'van', 'truck'];
  const colors = [0x7a9bb5, 0xb5768a, 0xf2c230, 0x8fae7e, 0xd97b5f, 0x9a7fb0, 0xe0e0e0];
  for (let i = 0; i < n; i++) {
    const vertical = rng() < 0.5;
    const road = -180 + Math.floor(rng() * 7) * 60;
    const car = buildCar({ color: colors[Math.floor(rng() * colors.length)], kind: kinds[Math.floor(rng() * kinds.length)] });
    car.position.set(vertical ? road : -200 + rng() * 400, 0, vertical ? -200 + rng() * 400 : road);
    scene.add(car);
    traffic.push({ mesh: car, vertical, road, dir: rng() < 0.5 ? 1 : -1, speed: 7 + rng() * 7, lane: (rng() - 0.5) * 4 });
  }
}

function spawnPolice(n, seed) {
  const rng = mulberry(seed + 31);
  for (let i = 0; i < n; i++) {
    const car = buildCar({ color: PALETTE.police, kind: 'police' });
    const a = (i / Math.max(1, n)) * Math.PI * 2;
    car.position.set(S.player.x + Math.cos(a) * (30 + rng() * 40), 0, S.player.z + Math.sin(a) * (30 + rng() * 40));
    scene.add(car);
    policeCars.push({ mesh: car, name: POLICE_NAMES[i % POLICE_NAMES.length], role: POLICE_ROLES[i % POLICE_ROLES.length], speed: 0, dist: 40, color: '#3f7fb5' });
  }
}

function syncPoliceState() {
  S.police = policeCars.map((u) => ({ name: u.name, role: u.role, dist: u.dist, color: u.color }));
}

// ---------- missions ----------
function spawnRivals(spots) {
  for (const r of rivals) scene.remove(r.mesh);
  rivals = [];
  for (const [x, z] of spots) {
    const mesh = buildPerson({ shirt: 0x8a2f2f, pants: 0x22262e });
    mesh.position.set(x, 0, z);
    scene.add(mesh);
    rivals.push({ mesh, hp: 2, dead: false, phase: Math.random() * 6 });
  }
}

function startMission(i) {
  S.missionIndex = i; S.stageIndex = 0; S.stageProgress = 0;
  const m = currentMission();
  S.stageLabel = stageLabel(m.stages[0]);
  setObjective(m.stages[0]);
  // mission-specific actors for real play (shots stage their own)
  if (!window.__shotMode) {
    if (m.id === 2) spawnRivals([[-10, 160], [30, 165], [50, 150]]);
    if (m.id === 7) spawnRivals([[130, -130], [142, -140]]);
    if (m.id === 4 && !targetCar) {
      targetCar = buildCar({ color: PALETTE.regent, kind: 'sedan', dented: 30 });
      targetCar.position.set(-40, 0, -180);
      targetCar.rotation.y = Math.PI / 2;
      scene.add(targetCar);
    }
  }
  setDialogue(m.dialogue.who, m.dialogue.name, m.dialogue.role, m.dialogue.text);
  logPlay(`Mission ${m.id} started: ${m.title}`);
  toast(`MISSION ${m.id} · ${m.title}`);
}

function stageLabel(stage) {
  if (!stage) return '';
  return stage.label;
}

function setObjective(stage) {
  if (!stage || !stage.target) { S.objective = null; objectiveBeacon.visible = false; return; }
  S.objective = { x: stage.target.x, z: stage.target.z };
  objectiveBeacon.position.set(stage.target.x, 0, stage.target.z);
  objectiveBeacon.visible = true;
}

function advanceStage() {
  const m = currentMission();
  S.stageIndex++;
  S.stageProgress = 0;
  if (S.stageIndex >= m.stages.length) { completeMission(); return; }
  const st = m.stages[S.stageIndex];
  S.stageLabel = stageLabel(st);
  setObjective(st);
  if (st.type === 'survive') S.timerText = `0:${String(st.seconds).padStart(2, '0')}`;
  audio.blip(990, 0.12, 'sine', 0.06);
  logPlay(`Stage ${S.stageIndex + 1}/${m.stages.length}: ${st.label}`);
}

function completeMission() {
  const m = currentMission();
  S.cash += m.cash; S.xp += 450; S.missionsDone++;
  if (S.xp >= S.xpMax) { S.rank++; S.xp -= S.xpMax; S.xpMax = Math.round(S.xpMax * 1.35); S.rankName = ['ROOKIE', 'HUSTLER', 'WHEELMAN', 'FIXER', 'SHOT CALLER', 'TIDE BOSS'][Math.min(5, S.rank - 1)]; toast(`RANK UP — RANK ${S.rank} · ${S.rankName}`); }
  audio.cash();
  toast(`MISSION COMPLETE · ${m.title} · +$${m.cash.toLocaleString()}`);
  logPlay(`MISSION COMPLETE: ${m.title} +$${m.cash} (cash $${S.cash})`);
  saveGame();
  if (S.missionIndex + 1 < MISSIONS.length) startMission(S.missionIndex + 1);
  else { toast('STORY COMPLETE — SOLARA BAY IS YOURS'); logPlay('STORY COMPLETE — all 8 missions done'); }
}

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ cash: S.cash, xp: S.xp, rank: S.rank, missionsDone: S.missionsDone, missionIndex: S.missionIndex, condition: S.condition }));
  } catch { /* private mode */ }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    S.cash = d.cash ?? S.cash; S.xp = d.xp ?? S.xp; S.rank = d.rank ?? S.rank;
    S.missionsDone = d.missionsDone ?? 0; S.missionIndex = Math.min(d.missionIndex ?? 0, MISSIONS.length - 1);
  } catch { /* ignore */ }
}

// ---------- driving / walking ----------
const car = { speed: 0, steer: 0, heading: 0, x: 0, z: 0 };
const walk = { speed: 0, heading: 0 };

function collideBuildings(x, z, r) {
  for (const c of colliders) {
    if (Math.abs(x - c.x) < c.hw + r && Math.abs(z - c.z) < c.hd + r) {
      const dx = x - c.x, dz = z - c.z;
      const px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz);
      if (px < pz) x = c.x + Math.sign(dx || 1) * (c.hw + r);
      else z = c.z + Math.sign(dz || 1) * (c.hd + r);
      return { x, z, hit: true };
    }
  }
  return { x, z, hit: false };
}

function updateDriving(dt, input) {
  const maxSpeed = 42; // ~150 km/h
  const accel = input.forward ? 26 : 0;
  const brake = input.back ? 34 : 0;
  car.speed += (accel - brake) * dt;
  if (!input.forward && !input.back) car.speed -= Math.sign(car.speed) * 10 * dt;
  if (Math.abs(car.speed) < 0.2 && !input.forward) car.speed = 0;
  car.speed = Math.max(-10, Math.min(maxSpeed, car.speed));
  const steerTarget = input.left ? 1 : input.right ? -1 : 0;
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  const spd = Math.abs(car.speed) / maxSpeed;
  car.heading += car.steer * (car.speed >= 0 ? 1 : -1) * dt * (1.6 + spd * 1.1);
  let nx = car.x + Math.sin(car.heading) * car.speed * dt;
  let nz = car.z + Math.cos(car.heading) * car.speed * dt;
  nx = Math.max(WORLD.min, Math.min(WORLD.max, nx));
  nz = Math.max(WORLD.min, Math.min(WORLD.max, nz));
  const col = collideBuildings(nx, nz, 1.6);
  if (col.hit && Math.abs(car.speed) > 6) { audio.crash(); S.condition = Math.max(0, S.condition - 1.5); car.speed *= 0.55; }
  car.x = col.x; car.z = col.z;
  heroCar.position.set(car.x, 0, car.z);
  heroCar.rotation.y = car.heading;
  S.speedKmh = Math.abs(car.speed) * 3.6;
  S.player.x = car.x; S.player.z = car.z; S.player.heading = car.heading;
  audio.setEngine(Math.abs(car.speed) / maxSpeed);
}

function updateWalking(dt, input) {
  const sp = 7;
  let mx = 0, mz = 0;
  if (input.forward) mz -= 1;
  if (input.back) mz += 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (mx || mz) {
    const len = Math.hypot(mx, mz);
    const targetHeading = Math.atan2(mx / len, mz / len) + Math.PI;
    let dh = targetHeading - walk.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    walk.heading += dh * Math.min(1, dt * 10);
    let nx = S.player.x + Math.sin(walk.heading) * sp * dt;
    let nz = S.player.z + Math.cos(walk.heading) * sp * dt;
    const col = collideBuildings(nx, nz, 0.7);
    S.player.x = Math.max(WORLD.min, Math.min(WORLD.max, col.x));
    S.player.z = Math.max(WORLD.min, Math.min(WORLD.max, col.z));
    playerMesh.position.set(S.player.x, Math.abs(Math.sin(Date.now() / 130)) * 0.05, S.player.z);
    playerMesh.rotation.y = walk.heading;
    S.speedKmh = sp * 3.6;
  } else S.speedKmh = 0;
  S.player.heading = walk.heading;
}

function enterCar() {
  if (S.inCar) {
    S.inCar = false; playerMesh.visible = true;
    playerMesh.position.set(car.x + 2.5, 0, car.z + 1);
    S.player.x = car.x + 2.5; S.player.z = car.z + 1;
    walk.heading = car.heading;
    S.carName = 'ON FOOT';
    toast('On foot — E to enter a car');
    return;
  }
  // nearest car within 5m becomes the hero car
  const d = Math.hypot(car.x - S.player.x, car.z - S.player.z);
  if (d < 6) {
    S.inCar = true; playerMesh.visible = false;
    S.carName = heroCar.userData.name || 'RUKAN PELO GT';
    toast(`${S.carName} — yours now`);
    if (S.wanted < 2) { S.wanted = 2; S.feed = 'SBP: stolen vehicle reported — units responding'; }
  } else toast('No car close enough — walk to one');
}

function shootAtRival() {
  // On foot: click fires at the nearest rival within 14m, in front of the player.
  let best = null, bd = 14;
  for (const r of rivals) {
    const d = Math.hypot(r.mesh.position.x - S.player.x, r.mesh.position.z - S.player.z);
    if (d < bd) { bd = d; best = r; }
  }
  if (!best) return;
  audio.shot();
  best.hp -= 1;
  logPlay(`Shot fired — rival ${best.hp} hp left (${bd.toFixed(1)}m)`);
  if (best.hp <= 0) {
    best.dead = true;
    best.mesh.visible = false;
    const downed = buildDownedEnemy({ shirt: 0xf2a541 });
    downed.position.set(best.mesh.position.x, 0, best.mesh.position.z);
    downed.rotation.y = Math.random() * 3;
    scene.add(downed);
    S.wanted = Math.max(S.wanted, 2);
    S.feed = 'SBP: shots fired in the Lantern Market';
    const m = currentMission();
    const st = m.stages[S.stageIndex];
    if (st && st.type === 'takedown') {
      S.stageProgress = (S.stageProgress || 0) + 1 / st.count;
      S.stageLabel = st.label.replace(/0\/\d+|\d+\/\d+/, `${Math.round(S.stageProgress * st.count)}/${st.count}`);
      if (S.stageProgress >= 1) advanceStage();
    }
    logPlay('Rival down');
  }
}

// ---------- autopilot (playtest aid, ?auto=1) ----------
// NOTE: on foot, WASD moves in world directions (W=+z, S=-z, A=+x, D=-x),
// so the autopilot steers by movement-vector components, not by heading.
let stuckTimer = 0, stuckX = 0, stuckZ = 0, reverseTimer = 0;
function walkToward(dt, tx, tz, input) {
  const dx = tx - S.player.x, dz = tz - S.player.z;
  const d = Math.hypot(dx, dz);
  if (d < 1) return true;
  const nx = dx / d, nz = dz / d;
  input.forward = nz > 0.35; input.back = nz < -0.35;
  input.left = nx > 0.35; input.right = nx < -0.35;
  walkWithInput(dt, input);
  return false;
}
function autopilot(dt) {
  const m = currentMission();
  const st = m.stages[S.stageIndex];
  if (!st) return;
  const input = { forward: false, back: false, left: false, right: false };
  // stuck recovery: if we barely moved while trying to drive, reverse out and turn
  if (reverseTimer > 0) {
    reverseTimer -= dt;
    input.back = true; input.left = true;
    driveWithInput(dt, input);
    return;
  }
  const moved = Math.hypot(car.x - stuckX, car.z - stuckZ);
  if (S.inCar) {
    if (moved < 0.4) { stuckTimer += dt; if (stuckTimer > 2) { reverseTimer = 1.1; stuckTimer = 0; stuckX = car.x; stuckZ = car.z; } }
    else { stuckTimer = 0; stuckX = car.x; stuckZ = car.z; }
  }
  // on foot: walk to the hero car first when the stage target is at the car,
  // otherwise walk straight to the stage target
  if (!S.inCar && st.type !== 'takedown') {
    const tx = st.target ? st.target.x : car.x, tz = st.target ? st.target.z : car.z;
    const nearCar = Math.hypot(tx - car.x, tz - car.z) < 15;
    if (nearCar) {
      const d = Math.hypot(car.x - S.player.x, car.z - S.player.z);
      if (d < 5) { enterCar(); return; }
      walkToward(dt, car.x, car.z, input);
      return;
    }
    if (walkToward(dt, tx, tz, input)) return;
    return;
  }
  if (st.type === 'survive') {
    input.forward = true; input.left = true; // circle while the timer runs
    driveWithInput(dt, input);
    return;
  }
  if (st.type === 'takedown') {
    // walk to the nearest living rival and shoot
    const alive = rivals.find((r) => !r.dead);
    if (!alive) return;
    const dx = alive.mesh.position.x - S.player.x, dz = alive.mesh.position.z - S.player.z;
    const d = Math.hypot(dx, dz);
    if (d < 10) { shootAtRival(); return; }
    walkToward(dt, alive.mesh.position.x, alive.mesh.position.z, input);
    return;
  }
  if (st.type === 'steal') { if (!S.inCar) enterCar(); return; }
  // goto / checkpoint / ram / jump / deliver: drive to target
  if (!S.inCar) { enterCar(); return; }
  const tx = st.target.x, tz = st.target.z;
  const dx = tx - car.x, dz = tz - car.z;
  const d = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz);
  let dh = want - car.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  input.forward = d > 6;
  input.left = dh > 0.2; input.right = dh < -0.2;
  if (d < 6 && st.type === 'ram') input.forward = true;
  driveWithInput(dt, input);
}

function driveWithInput(dt, input) { updateDriving(dt, input); }
function walkWithInput(dt, input) { updateWalking(dt, input); }

// ---------- per-frame ----------
let surviveTimer = 0, wantedCooldown = 0, heliAngle = 0, clockSec = 16 * 3600;

function tick(dt, t) {
  const m = currentMission();
  // input
  const input = {
    forward: pressed('KeyW') || pressed('ArrowUp'),
    back: pressed('KeyS') || pressed('ArrowDown'),
    left: pressed('KeyA') || pressed('ArrowLeft'),
    right: pressed('KeyD') || pressed('ArrowRight'),
  };
  if (window.__shotMode) {
    // dossier shot: hold the staged pose (speed + camera stay as preset),
    // the city around it keeps moving
  } else if (window.__auto) autopilot(dt);
  else if (S.inCar) updateDriving(dt, input);
  else updateWalking(dt, input);

  if (edgePressed(edgeBag, 'KeyE')) enterCar();
  if (edgePressed(edgeBag, 'KeyR')) { S.radioIndex = (S.radioIndex + 1) % RADIO.length; S.radio = RADIO[S.radioIndex]; toast(`♪ ${S.radio.station} — ${S.radio.song}`); }
  if (edgePressed(edgeBag, 'Digit1')) toast('FISTS ready');
  if (edgePressed(edgeBag, 'KeyZ')) { toast('MIRA · SWAP PLATES — wanted −1 star'); S.wanted = Math.max(0, S.wanted - 1); }
  if (edgePressed(edgeBag, 'KeyX')) { S.condition = Math.min(100, S.condition + 40); toast('LIO · QUICK FIX — condition +40%'); }
  if (edgePressed(edgeBag, 'KeyC')) toast('KIKI · EYES OUT — police revealed for 12s');
  if (edgePressed(edgeBag, 'KeyV')) toast('UNCLE DEE · GETAWAY — clean car on the way');
  if (edgePressed(edgeBag, 'Tab') || edgePressed(edgeBag, 'Escape')) toggleMeta();
  if (isMouseDown() && !S.inCar) shootAtRival();

  // traffic
  for (const tr of traffic) {
    const v = tr.speed * tr.dir;
    if (tr.vertical) { tr.mesh.position.z += v * dt; if (tr.mesh.position.z > 230) tr.mesh.position.z = -230; if (tr.mesh.position.z < -230) tr.mesh.position.z = 230; tr.mesh.position.x = tr.road + tr.lane; tr.mesh.rotation.y = tr.dir > 0 ? 0 : Math.PI; }
    else { tr.mesh.position.x += v * dt; if (tr.mesh.position.x > 230) tr.mesh.position.x = -230; if (tr.mesh.position.x < -230) tr.mesh.position.x = 230; tr.mesh.position.z = tr.road + tr.lane; tr.mesh.rotation.y = tr.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    // bump the player
    if (S.inCar) {
      const d = Math.hypot(tr.mesh.position.x - car.x, tr.mesh.position.z - car.z);
      if (d < 3.2) { car.speed *= 0.7; S.condition = Math.max(0, S.condition - 0.4); audio.crash(); }
    }
  }

  // police chase
  const px = S.player.x, pz = S.player.z;
  for (const u of policeCars) {
    const dx = px - u.mesh.position.x, dz = pz - u.mesh.position.z;
    const d = Math.hypot(dx, dz);
    u.dist = d;
    const want = Math.atan2(dx, dz);
    let dh = want - u.mesh.rotation.y;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    u.mesh.rotation.y += dh * Math.min(1, dt * 2.2);
    const spd = S.wanted > 0 ? Math.min(38, 20 + S.wanted * 3) : 0;
    u.mesh.position.x += Math.sin(u.mesh.rotation.y) * spd * dt;
    u.mesh.position.z += Math.cos(u.mesh.rotation.y) * spd * dt;
    if (d < 3.4 && S.inCar) { car.speed *= 0.75; S.condition = Math.max(0, S.condition - 0.8); S.health = Math.max(0, S.health - 0.5); audio.crash(); }
    if (u.mesh.userData.lightbar) {
      const on = Math.floor(t * 4) % 2 === 0;
      u.mesh.userData.lightbar[0].material.color.setHex(on ? 0xff2222 : 0x441111);
      u.mesh.userData.lightbar[1].material.color.setHex(on ? 0x111144 : 0x2244ff);
    }
  }
  syncPoliceState();

  // wanted decay when far from every unit
  if (S.wanted > 0) {
    const nearest = Math.min(...policeCars.map((u) => u.dist), 999);
    if (nearest > 90) { wantedCooldown += dt; if (wantedCooldown > 6) { S.wanted--; wantedCooldown = 0; toast('Heat cooling off…'); } }
    else wantedCooldown = 0;
  }

  // helicopter
  if (heli && !window.__shotMode) {
    heliAngle += dt * 0.25;
    const hx = px + Math.cos(heliAngle) * 42, hz = pz + Math.sin(heliAngle) * 42;
    heli.position.set(hx, 55 + Math.sin(t * 0.8) * 2, hz);
    heli.lookAt(px, 0, pz);
    heli.userData.rotor.rotation.y += dt * 22;
    const vis = S.wanted >= 3;
    heli.visible = vis;
    heli.userData.searchlight.visible = vis;
    heli.userData.spotPool.visible = vis;
    if (vis) heli.userData.spotPool.position.set(px - hx, -55, pz - hz);
  }

  // the Regent cruises the beachfront during mission 4 (real play)
  if (targetCar && S.missionIndex === 3 && !window.__shotMode) {
    targetCar.position.x += 12 * dt;
    if (targetCar.position.x > 200) targetCar.position.x = -200;
    targetCar.rotation.y = Math.PI / 2;
  }

  // crowd + rivals idle
  updateCrowd(peds, dt, t);
  for (const r of rivals) if (!r.dead) { r.mesh.position.y = Math.abs(Math.sin(t * 2 + r.phase)) * 0.04; }

  // objective beacon pulse
  if (objectiveBeacon.visible) {
    objectiveBeacon.userData.diamond.rotation.y += dt * 2;
    objectiveBeacon.userData.diamond.position.y = 6 + Math.sin(t * 2.5) * 0.6;
  }

  // mission stage checks (skipped in frozen shot mode — the pose is staged)
  const st = m.stages[S.stageIndex];
  if (st && !window.__shotMode) {
    if (st.type === 'goto' || st.type === 'checkpoint' || st.type === 'deliver') {
      const d = Math.hypot(S.player.x - st.target.x, S.player.z - st.target.z);
      S.stageProgress = Math.max(0, 1 - d / 120);
      if (d < 9) { advanceStage(); }
    } else if (st.type === 'steal') {
      if (S.inCar) advanceStage();
    } else if (st.type === 'survive') {
      surviveTimer += dt;
      const left = Math.max(0, st.seconds - surviveTimer);
      S.timerText = `0:${String(Math.ceil(left)).padStart(2, '0')}`;
      S.stageProgress = surviveTimer / st.seconds;
      if (surviveTimer >= st.seconds) { surviveTimer = 0; S.timerText = ''; advanceStage(); }
    } else if (st.type === 'ram' && targetCar) {
      const d = Math.hypot(car.x - targetCar.position.x, car.z - targetCar.position.z);
      if (d < 4 && S.inCar) {
        if (!st._hitAt || t - st._hitAt > 1.2) {
          st._hitAt = t; st._hits = (st._hits || 0) + 1;
          targetCar.userData.dents = (targetCar.userData.dents || 0) + 1;
          S.condition = Math.max(0, S.condition - 2);
          audio.crash(); S.wanted = Math.max(S.wanted, 3);
          S.stageProgress = (st._hits || 0) / st.count;
          S.stageLabel = st.label.replace(/\d+\/\d+/, `${st._hits}/${st.count}`);
          logPlay(`Ram hit ${st._hits}/${st.count} on the Regent`);
          if ((st._hits || 0) >= st.count) advanceStage();
        }
      }
    } else if (st.type === 'jump') {
      const d = Math.hypot(S.player.x - st.target.x, S.player.z - st.target.z);
      if (d < 10 && Math.abs(car.speed) > 20) { toast('STUNT JUMP! +250 RP'); S.xp += 250; advanceStage(); }
    }
  }

  // health / busted
  if (S.health <= 0) {
    S.mode = 'busted';
    toast('BUSTED — the SBP has you. -$500, back at the safehouse.');
    S.cash = Math.max(0, S.cash - 500);
    S.health = 100; S.wanted = 0;
    S.player.x = 0; S.player.z = 0; car.x = 0; car.z = 0; car.speed = 0;
    setTimeout(() => { S.mode = 'play'; }, 1500);
  }

  // clock advances
  clockSec += dt * 12;
  const hh = Math.floor(clockSec / 3600) % 24, mm = Math.floor((clockSec % 3600) / 60);
  S.clock = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  S.district = districtAt(S.player.x, S.player.z);

  // camera
  updateCamera(dt);
  updateHUD(S);
  window.__solaraState = S;
}

function updateCamera(dt) {
  if (window.__shotCam) {
    camera.position.set(...window.__shotCam.pos);
    camera.lookAt(...window.__shotCam.look);
    return;
  }
  const heading = S.inCar ? car.heading : walk.heading;
  const back = S.inCar ? 13 : 8.5;
  const up = S.inCar ? 6 : 4.5;
  const tx = S.player.x - Math.sin(heading) * back;
  const tz = S.player.z - Math.cos(heading) * back;
  camPos.x += (tx - camPos.x) * Math.min(1, dt * 4);
  camPos.y += (up - camPos.y) * Math.min(1, dt * 4);
  camPos.z += (tz - camPos.z) * Math.min(1, dt * 4);
  camera.position.copy(camPos);
  camLook.set(S.player.x + Math.sin(heading) * 6, 1.6, S.player.z + Math.cos(heading) * 6);
  camera.lookAt(camLook);
}

function toggleMeta() {
  if (S.mode === 'meta') {
    S.mode = 'play';
    showScreen('screen-game');
    window.__solaraCloseMeta = null;
  } else if (S.mode === 'play') {
    S.mode = 'meta';
    showScreen('screen-meta');
    renderMetaBody(S);
    window.__solaraCloseMeta = () => toggleMeta();
  }
}

window.__solaraCloseMeta = null;
window.__solaraOpenMeta = () => { if (S.mode === 'play') toggleMeta(); };

// ---------- shot presets ----------
function applyShot(preset, seed) {
  const m = MISSIONS[preset.missionId - 1];
  S.missionIndex = preset.missionId - 1;
  S.stageIndex = preset.stageIndex;
  S.stageProgress = preset.stageProgress || 0;
  S.time = preset.time; S.clock = preset.clock; S.cash = preset.cash;
  const [chh, cmm] = preset.clock.split(':').map(Number);
  clockSec = chh * 3600 + cmm * 60;
  S.wanted = preset.wanted; S.rank = preset.rank; S.rankName = preset.rankName;
  S.xp = preset.xp; S.xpMax = preset.xpMax;
  S.health = preset.health; S.armour = preset.armour; S.condition = preset.condition;
  S.speedKmh = preset.speedKmh;
  S.crewChips = preset.crewChips || null;
  S.missionsDone = preset.missionsDone ?? S.missionsDone;
  S.feed = preset.feed || S.feed;
  S.radio = RADIO[preset.radio || 0];
  S.player.x = preset.player.x; S.player.z = preset.player.z;
  S.player.heading = preset.player.heading;
  S.inCar = !!preset.player.inCar;
  car.x = preset.player.x; car.z = preset.player.z; car.heading = preset.player.heading;
  car.speed = (preset.speedKmh || 0) / 3.6;
  walk.heading = preset.player.heading;
  if (preset.car) {
    S.carName = preset.car.name; S.carColor = preset.car.color; S.dented = preset.car.dented;
    // rebuild hero car in the preset colour/damage
    scene.remove(heroCar);
    heroCar = buildCar({ color: preset.car.color, kind: 'sedan', dented: preset.car.dented });
    heroCar.userData.name = preset.car.name;
    scene.add(heroCar);
    heroCar.position.set(car.x, 0, car.z);
    heroCar.rotation.y = car.heading;
  }
  heroCar.visible = true;
  playerMesh.visible = !S.inCar;
  playerMesh.position.set(S.player.x, 0, S.player.z);
  playerMesh.rotation.y = S.player.heading;
  const st = m.stages[preset.stageIndex];
  S.stageLabel = st ? st.label : '';
  setObjective(st);
  if (preset.timerText) S.timerText = preset.timerText;
  if (st && st.type === 'survive') S.timerText = `0:${String(st.seconds).padStart(2, '0')}`;
  S.district = DISTRICTS.find((d) => d.id === preset.district) || DISTRICTS[1];
  if (preset.dialogue) setDialogue(preset.dialogue.who, preset.dialogue.name, preset.dialogue.role, preset.dialogue.text);
  if (preset.camera) {
    const h = preset.player.heading;
    const bx = preset.player.x - Math.sin(h) * preset.camera.offset[2];
    const bz = preset.player.z - Math.cos(h) * preset.camera.offset[2];
    // look ahead, slightly toward the ocean side for the beachfront chase,
    // so the beach, the heli and the target all read in one frame
    const rx = -Math.cos(h), rz = Math.sin(h);
    const lf = preset.camera.lookFwd ?? 22, ly = preset.camera.lookY ?? 4, ls = preset.camera.lookSide ?? 0;
    window.__shotCam = { pos: [bx, preset.camera.offset[1], bz], look: [preset.player.x + Math.sin(h) * lf + rx * ls, ly, preset.player.z + Math.cos(h) * lf + rz * ls] };
  }
  // traffic / police / peds counts per preset
  spawnTraffic(preset.traffic || 0, seed);
  spawnPolice(preset.police || 0, seed);
  if (preset.peds) peds = spawnCrowd(scene, preset.peds, preset.district === 'lantern' ? { x: 30, z: 148, w: 56, h: 44 } : { x: 0, z: 0, w: 300, h: 300 }, seed + 5);
  // forward / right vectors from the player heading, for staged vehicles
  const fh = preset.player.heading;
  const fwd = { x: Math.sin(fh), z: Math.cos(fh) };
  const rgt = { x: -Math.cos(fh), z: Math.sin(fh) };
  if (preset.scooter) {
    scooterMesh = buildScooter();
    scooterMesh.position.set(preset.player.x + fwd.x * 22 + rgt.x * 4, 0, preset.player.z + fwd.z * 22 + rgt.z * 4);
    scooterMesh.rotation.y = preset.player.heading;
    scene.add(scooterMesh);
    const rider = buildPerson({ shirt: 0xe87aa0, pants: 0x2c3a4a });
    rider.position.set(preset.player.x + fwd.x * 22 + rgt.x * 4, 0.55, preset.player.z + fwd.z * 22 + rgt.z * 4);
    scene.add(rider);
  }
  if (preset.downed) {
    downedMesh = buildDownedEnemy({ shirt: 0xf2a541 });
    downedMesh.position.set(preset.downed.x, 0, preset.downed.z);
    downedMesh.rotation.y = 0.6;
    scene.add(downedMesh);
  }
  if (preset.rivals) {
    for (const r of preset.rivals) {
      const mesh = buildPerson({ shirt: 0x8a2f2f, pants: 0x22262e });
      mesh.position.set(r.x, 0, r.z);
      scene.add(mesh);
      rivals.push({ mesh, hp: 1, dead: false, phase: Math.random() * 6 });
    }
  }
  if (preset.heli) {
    heli.position.set(preset.heli.x, preset.heli.y, preset.heli.z);
    heli.visible = true;
    // searchlight pool sits on the street under the helicopter
    heli.userData.spotPool.position.set(0, -preset.heli.y + 0.3, 0);
  }
  // mission-4 target car (the Regent) for the cover chase
  if (preset.missionId === 4) {
    targetCar = buildCar({ color: PALETTE.regent, kind: 'sedan', dented: 30 });
    targetCar.position.set(preset.player.x + fwd.x * 34, 0, preset.player.z + fwd.z * 34);
    targetCar.rotation.y = preset.player.heading;
    scene.add(targetCar);
    // the Regent holds its ground ahead of the hero car for the shot
  }
  S.mode = 'play';
  showScreen('screen-game');
  if (preset.metaTab) {
    setMetaTab(preset.metaTab);
    S.mode = 'meta';
    showScreen('screen-meta');
    renderMetaBody(S);
    window.__solaraCloseMeta = () => { S.mode = 'play'; showScreen('screen-game'); };
  }
  updateHUD(S);
  window.__solaraState = S;
  window.__shotReady = true;
}

// ---------- boot ----------
function buildTitleScreen() {
  const el = document.getElementById('screen-title');
  el.innerHTML = `
  <div class="title-inner">
    <div class="title-kicker">AN OPEN-WORLD CRIME GAME</div>
    <h1>SOLARA<br>BAY</h1>
    <p class="title-sub">Eight missions. One bay. Every cop in the city.</p>
    <button id="play-btn">▶ &nbsp;PLAY</button>
    <div class="title-missions">${MISSIONS.map((m) => `<div><b>${m.id}</b> ${m.title} <span>$${m.cash.toLocaleString()}</span></div>`).join('')}</div>
    <div class="title-controls">WASD drive &amp; walk · E enter/exit car · SPACE brake · M mission · TAB map &amp; stats · Z/X/C/V crew · R radio</div>
    <div class="title-note">Runs offline · saves in this browser · sound on for the full bay</div>
  </div>`;
  document.getElementById('play-btn').addEventListener('click', () => {
    audio.ensure();
    S.mode = 'play';
    showScreen('screen-game');
    startMission(S.missionIndex);
  });
}

function init() {
  const { shot, seed, auto, play } = parseShot();
  window.__auto = auto;
  if (play) logPlay('Playtest mode: mission 1, autopilot ON');
  const preset = shot ? SHOTS[shot] : null;
  const time = preset ? preset.time : 'sunset';
  window.__shotMode = !!preset;

  renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game'), antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 8, 16);

  setupLights(time);
  const mats = makeMaterials();
  buildCity(scene, mats, { night: time === 'night', seed });

  // building colliders come from world.js (same grid the city builder uses)

  heroCar = buildCar({ color: 0xe84a3f, kind: 'sedan', dented: 0 });
  heroCar.userData.name = 'RUKAN PELO GT';
  heroCar.position.set(24, 0, -40);
  scene.add(heroCar);
  car.x = 24; car.z = -40; car.heading = 0;

  playerMesh = buildPerson({ shirt: 0xe84a3f, pants: 0x2c3a4a, skin: 0xc98d64 });
  playerMesh.position.set(20, 0, -30);
  scene.add(playerMesh);
  S.player.x = 20; S.player.z = -30;

  heli = buildHelicopter();
  heli.visible = false;
  scene.add(heli);

  boat = buildBoat();
  boat.position.set(-90, 0.4, -280);
  boat.rotation.y = 0.6;
  scene.add(boat);

  objectiveBeacon = makeObjectiveBeacon();
  objectiveBeacon.visible = false;
  scene.add(objectiveBeacon);

  buildHUD();
  buildMeta();
  buildTitleScreen();
  initInput();
  loadGame();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  if (preset) {
    applyShot(preset, seed);
    if (auto) logPlay(`Shot preset "${shot}" applied, autopilot ON`);
  } else {
    showScreen('screen-title');
    document.getElementById('hud').style.display = 'none';
    startMission(S.missionIndex);
    // ambient city life for the title backdrop
    spawnTraffic(10, seed);
    spawnPolice(0, seed);
    peds = spawnCrowd(scene, 16, { x: 0, z: 0, w: 300, h: 300 }, seed + 5);
  }

  let last = performance.now();
  let firstFrame = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (S.mode === 'play') tick(dt, now / 1000);
    else if (S.mode === 'meta') { updateHUD(S); }
    renderer.render(scene, camera);
    if (firstFrame) { firstFrame = false; window.__firstFrame = true; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

init();
