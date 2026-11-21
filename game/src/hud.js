// SOLARA BAY — hud.js: the dense in-game HUD (DOM overlay, crisp at any size).
// Mission card, police panel, wanted stars, cash, weapons, crew, dialogue,
// minimap canvas, district card, speedometer and radio line.
import { DISTRICTS, CREW, WEAPONS, MISSIONS } from './data.js';

export function buildHUD() {
  const hud = document.getElementById('hud');
  hud.innerHTML = `
  <div id="mission-card" class="panel">
    <div class="mc-chapter" id="mc-chapter">CH. 1 · FIRST LIGHT</div>
    <div class="mc-stage"><span id="mc-stage">STAGE 1/4</span><span class="mc-timer" id="mc-timer"></span></div>
    <div class="mc-title" id="mc-title">FIRST GEAR</div>
    <div class="mc-bar"><div id="mc-bar-fill"></div></div>
    <div class="mc-obj" id="mc-obj">Reach the Pelo GT</div>
    <div class="mc-next">NEXT <span id="mc-next">Meet Mira at the docks</span></div>
  </div>
  <div id="crew-chips"></div>
  <div id="top-right">
    <div id="clock">16:00</div>
    <div id="cash">$18,450</div>
    <div id="stars">★★★★☆</div>
    <div id="wanted-tag"></div>
    <div id="rank-line"><span id="rank-badge">RANK 6</span> <span id="rank-name">FIXER</span></div>
    <div id="xp-bar"><div id="xp-fill"></div></div>
    <div id="xp-text">3,900 / 5,200 RP</div>
  </div>
  <div id="police-panel" class="panel">
    <div class="pp-head"><span id="pp-title">SBP RESPONSE</span><span id="pp-count">6 UNITS</span></div>
    <div id="pp-rows"></div>
    <div id="pp-feed">SBP: shots fired in the Lantern Market</div>
  </div>
  <div id="weapons"></div>
  <div id="crew-cards"></div>
  <div id="district-card" class="panel">
    <div id="dc-name">MARINA ROW</div>
    <div id="dc-sub">Strand Boulevard</div>
    <div id="dc-meter"><span id="dc-mood">NEUTRAL · 58</span><div class="dc-bar"><div id="dc-fill"></div></div></div>
    <div id="dc-hint">BOATS LEAVE AT DAWN</div>
  </div>
  <div id="minimap-wrap"><canvas id="minimap" width="220" height="220"></canvas><div id="mm-label">N</div></div>
  <div id="vitals" class="panel"><div class="vit-row"><span>HEALTH</span><div class="vit-bar"><div id="health-fill"></div></div><b id="health-num">100</b></div>
  <div class="vit-row"><span>ARMOUR</span><div class="vit-bar blue"><div id="armour-fill"></div></div><b id="armour-num">40</b></div></div>
  <div id="dialogue" class="panel"><div id="dlg-initials">MK</div><div><div id="dlg-name">MIRA KESANG <span>Crew · Driver</span></div><div id="dlg-text"></div></div></div>
  <div id="speedo"><div id="speed-num">0</div><div id="speed-unit">KM/H</div><div id="speed-car">RUKAN PELO GT</div><div id="cond-bar"><div id="cond-fill"></div></div><div id="cond-text">CONDITION 98% · CLEAN</div></div>
  <div id="radio">♪ RADIO OMBO 98.4 — Tide Runner — Sol Mara</div>
  <div id="hint-line">WASD drive · E enter/exit car · SPACE brake · M mission · TAB map · Z/X/C crew</div>
  <div id="toast"></div>
  <div id="objective-marker">◆</div>`;
  renderWeapons();
  renderCrewCards();
}

function renderWeapons() {
  document.getElementById('weapons').innerHTML = WEAPONS.map((w) => `
    <div class="weapon ${w.slot === 3 ? 'active' : ''}" data-slot="${w.slot}">
      <div class="w-num">${w.slot}</div><div class="w-icon">${w.icon}</div>
      <div class="w-name">${w.name}</div><div class="w-ammo">${w.ammo}</div>
    </div>`).join('');
}

function renderCrewCards() {
  document.getElementById('crew-cards').innerHTML = CREW.slice(0, 3).map((c) => `
    <div class="crew-card" id="crew-${c.id}">
      <div class="crew-initials" style="background:${crewColor(c.id)}">${c.initials}</div>
      <div class="crew-body"><div class="crew-ability">${c.ability}</div><div class="crew-name">${c.name.split(' ')[0]} · ${c.role}</div></div>
      <div class="crew-key">${c.key}</div>
    </div>`).join('');
}

function crewColor(id) { return { mira: '#3f7fb5', lio: '#d97b2f', kiki: '#8a5fd0', dee: '#3f9e4d' }[id] || '#888'; }

export function setDialogue(who, name, role, text) {
  document.getElementById('dlg-initials').textContent = who;
  document.getElementById('dlg-name').innerHTML = `${name} <span>${role}</span>`;
  document.getElementById('dlg-text').textContent = text;
  const d = document.getElementById('dialogue');
  d.style.display = 'flex';
  clearTimeout(d._t);
  d._t = setTimeout(() => { d.style.display = 'none'; }, window.__shotMode ? 60000 : 9000);
}

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.opacity = 1;
  clearTimeout(t._t); t._t = setTimeout(() => { t.style.opacity = 0; }, 2600);
}

// --- minimap: top-down canvas, streets + districts + units + objective ---
export function drawMinimap(state) {
  const cv = document.getElementById('minimap');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, S = W / 520; // world -260..260 -> canvas
  const px = (x) => (x + 260) * S, pz = (z) => (z + 260) * S;
  ctx.clearRect(0, 0, W, W);
  ctx.fillStyle = '#10151d'; ctx.fillRect(0, 0, W, W);
  // ocean
  ctx.fillStyle = '#1e6f8e'; ctx.fillRect(0, 0, W, pz(-205));
  ctx.fillStyle = '#e8d3a0'; ctx.fillRect(0, pz(-215), W, pz(-205) - pz(-215));
  // district blocks
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.mood === 'FRIENDLY' ? 'rgba(63,158,77,0.35)' : d.mood === 'WARY' ? 'rgba(217,123,47,0.35)' : 'rgba(122,155,181,0.3)';
    ctx.fillRect(px(d.x - d.w / 2), pz(d.z - d.h / 2), d.w * S, d.h * S);
  }
  // roads
  ctx.strokeStyle = '#3a4150'; ctx.lineWidth = 5;
  for (let x = -180; x <= 180; x += 60) { ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), W); ctx.stroke(); }
  for (let z = -180; z <= 200; z += 60) { ctx.beginPath(); ctx.moveTo(0, pz(z)); ctx.lineTo(W, pz(z)); ctx.stroke(); }
  ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 1;
  for (let x = -180; x <= 180; x += 60) { ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), W); ctx.stroke(); }
  // objective route
  if (state.objective) {
    ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(px(state.player.x), pz(state.player.z));
    ctx.lineTo(px(state.objective.x), pz(state.objective.z)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f2c230';
    ctx.beginPath(); ctx.arc(px(state.objective.x), pz(state.objective.z), 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('◆', px(state.objective.x), pz(state.objective.z) + 3);
  }
  // police dots
  for (const u of state.police) {
    ctx.fillStyle = '#ff4a3d';
    ctx.beginPath(); ctx.arc(px(u.x), pz(u.z), 4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
  }
  // player arrow
  ctx.save();
  ctx.translate(px(state.player.x), pz(state.player.z));
  ctx.rotate(-state.player.heading);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

// --- full HUD refresh from game state (called every frame, cheap DOM writes only on change) ---
const cache = {};
function setText(id, v) { if (cache[id] !== v) { cache[id] = v; const el = document.getElementById(id); if (el) el.textContent = v; } }
function setWidth(id, v) { if (cache[id] !== v) { cache[id] = v; const el = document.getElementById(id); if (el) el.style.width = v; } }
function setHtml(id, v) { if (cache[id] !== v) { cache[id] = v; const el = document.getElementById(id); if (el) el.innerHTML = v; } }

export function updateHUD(s) {
  const mission = MISSIONS[s.missionIndex];
  setText('mc-chapter', mission.chapter);
  setText('mc-stage', `STAGE ${s.stageIndex + 1}/${mission.stages.length}`);
  setText('mc-title', mission.title);
  setText('mc-obj', s.stageLabel);
  setText('mc-next', mission.next);
  setWidth('mc-bar-fill', `${((s.stageIndex + (s.stageProgress || 0)) / mission.stages.length) * 100}%`);
  setText('mc-timer', s.timerText || '');
  setText('clock', s.clock);
  setText('cash', '$' + s.cash.toLocaleString('en-US'));
  setHtml('stars', '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted));
  setText('wanted-tag', s.wanted >= 4 ? 'IN SIGHT' : s.wanted >= 3 ? 'AIR UNIT DEPLOYED' : '');
  setText('rank-badge', `RANK ${s.rank}`);
  setText('rank-name', s.rankName);
  setWidth('xp-fill', `${(s.xp / s.xpMax) * 100}%`);
  setText('xp-text', `${s.xp.toLocaleString()} / ${s.xpMax.toLocaleString()} RP`);
  setText('pp-title', s.wanted >= 4 ? 'SBP RESPONSE · AIR ONE' : 'SBP RESPONSE');
  setText('pp-count', `${s.police.length} UNITS`);
  setHtml('pp-rows', s.police.slice(0, 6).map((u) => `
    <div class="pp-row"><span class="pp-dot" style="background:${u.color}"></span><b>${u.name}</b><span class="pp-role ${u.role}">${u.role}</span><span class="pp-dist">${Math.round(u.dist)} m</span></div>`).join('')
    + (s.police.length > 6 ? `<div class="pp-more">+${s.police.length - 6} MORE</div>` : ''));
  setText('pp-feed', s.feed);
  // district card
  const d = s.district;
  setText('dc-name', d.name);
  setText('dc-sub', d.sub);
  setText('dc-mood', `${d.mood} · ${d.standing}`);
  setWidth('dc-fill', `${d.standing}%`);
  setText('dc-hint', d.hint);
  // vitals
  setWidth('health-fill', `${s.health}%`);
  setText('health-num', Math.round(s.health));
  setWidth('armour-fill', `${s.armour}%`);
  setText('armour-num', Math.round(s.armour));
  // speedo
  setText('speed-num', Math.round(s.speedKmh));
  setText('speed-car', s.inCar ? s.carName : 'ON FOOT');
  setWidth('cond-fill', `${s.condition}%`);
  setText('cond-text', `CONDITION ${Math.round(s.condition)}% · ${s.condition > 80 ? 'CLEAN' : s.condition > 50 ? 'DENTED' : 'WRECKED'}`);
  setText('radio', `♪ ${s.radio.station} — ${s.radio.song}`);
  // crew chips (sunset chase pattern: countdown timers)
  if (s.crewChips) {
    setHtml('crew-chips', s.crewChips.map((c) => `
      <div class="chip"><span class="chip-key">${c.key}</span><span class="chip-init">${c.initials}</span><b>${c.name}</b><span>${c.label}</span><span class="chip-timer">${c.timer}</span></div>`).join(''));
  } else setHtml('crew-chips', '');
  // objective marker on screen edge (simple: show when off-centre)
  const om = document.getElementById('objective-marker');
  if (om) om.style.display = s.objectiveOnScreen ? 'none' : 'block';
  // minimap
  drawMinimap(s);
}

export function showScreen(id) {
  for (const el of document.querySelectorAll('.screen')) el.classList.remove('active');
  const t = document.getElementById(id);
  if (t) t.classList.add('active');
  document.getElementById('hud').style.display = id === 'screen-game' ? 'block' : 'none';
}
