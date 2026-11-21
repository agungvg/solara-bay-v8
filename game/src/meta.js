// SOLARA BAY — meta.js: the pause / MAP-STATS screen and Dockside Customs workshop.
// A real in-game screen (TAB or ESC): city map, progression, career stats,
// save slots and the workshop upgrade list — all live from game state.
import { DISTRICTS, MISSIONS, CREW, UPGRADES, SAVE_SLOTS } from './data.js';

const TABS = ['MAP', 'STORY', 'STATS', 'CREW', 'SETTINGS', 'CONTROLS', 'SAVE'];
let activeTab = 'STATS';

export function buildMeta() {
  const el = document.getElementById('screen-meta');
  el.innerHTML = `
  <div class="meta-top">
    <div class="meta-title">SOLARA BAY</div>
    <div class="meta-tabs">${TABS.map((t) => `<button class="meta-tab ${t === activeTab ? 'active' : ''}" data-tab="${t}">${t}</button>`).join('')}</div>
    <div class="meta-cash" id="meta-cash">$21,340</div>
  </div>
  <div class="meta-body" id="meta-body"></div>
  <div class="meta-foot">ESC resume · Q / E switch tab · click the map to set a waypoint</div>`;
  el.querySelectorAll('.meta-tab').forEach((b) => b.addEventListener('click', () => { activeTab = b.dataset.tab; renderMetaBody(window.__solaraState); syncTabs(); }));
}

function syncTabs() {
  document.querySelectorAll('.meta-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === activeTab));
}

export function setMetaTab(t) { activeTab = t; syncTabs(); renderMetaBody(window.__solaraState); }

function pctRing(pct) {
  const r = 54, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return `<svg viewBox="0 0 130 130" class="ring"><circle cx="65" cy="65" r="${r}" class="ring-bg"/><circle cx="65" cy="65" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${off}"/><text x="65" y="60" class="ring-pct">${pct}%</text><text x="65" y="78" class="ring-lbl">COMPLETE</text></svg>`;
}

function progressRows(s) {
  const rows = [
    ['Story missions', `${s.missionsDone}/8`],
    ['Street races won', '1/4'],
    ['Stunt jumps', '5/8'],
    ['Hidden geckos', '12/20'],
    ['Export list', '3/5'],
    ['District jobs', '5/7'],
    ['Districts FRIENDLY', '3/7'],
    ['Crew recruited', '3/3'],
    ['Gold mission ratings', '2/8'],
  ];
  return rows.map(([label, v]) => {
    const [a, b] = v.split('/').map(Number);
    return `<div class="pr-row"><span>${label}</span><div class="pr-bar"><div style="width:${(a / b) * 100}%"></div></div><b>${v}</b></div>`;
  }).join('');
}

function ratingsRow(s) {
  const ratings = ['G', 'S', 'G', 'B', 'S', '—', '—', '—'];
  return `<div class="ratings">${ratings.map((r, i) => `<div class="rating ${r === 'G' ? 'gold' : r === 'S' ? 'silver' : r === 'B' ? 'bronze' : 'none'}">${i + 1}<span>${r}</span></div>`).join('')}</div>`;
}

function mapCanvas(s) {
  // Drawn fresh each render into the canvas element.
  const cv = document.getElementById('meta-map');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height, S = W / 560;
  const px = (x) => (x + 260) * S, pz = (z) => (z + 260) * S * (H / W);
  ctx.fillStyle = '#0e1a24'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1e6f8e'; ctx.fillRect(0, 0, W, pz(-205));
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.mood === 'FRIENDLY' ? 'rgba(63,158,77,0.4)' : d.mood === 'WARY' ? 'rgba(217,123,47,0.4)' : 'rgba(122,155,181,0.35)';
    ctx.fillRect(px(d.x - d.w / 2), pz(d.z - d.h / 2), d.w * S, d.h * S * (H / W));
  }
  ctx.strokeStyle = '#2c3846'; ctx.lineWidth = 4;
  for (let x = -180; x <= 180; x += 60) { ctx.beginPath(); ctx.moveTo(px(x), 0); ctx.lineTo(px(x), H); ctx.stroke(); }
  for (let z = -180; z <= 200; z += 60) { ctx.beginPath(); ctx.moveTo(0, pz(z)); ctx.lineTo(W, pz(z)); ctx.stroke(); }
  // route
  ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 3; ctx.setLineDash([7, 5]);
  ctx.beginPath(); ctx.moveTo(px(-120), pz(-140)); ctx.lineTo(px(0), pz(-60)); ctx.lineTo(px(10), pz(150)); ctx.stroke();
  ctx.setLineDash([]);
  // markers
  const marks = [[-120, -140, 'S'], [0, -60, 'H'], [10, 150, 'J'], [-160, 90, 'W']];
  for (const [x, z, l] of marks) {
    ctx.fillStyle = '#f2c230'; ctx.beginPath(); ctx.arc(px(x), pz(z), 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 10px sans-serif'; ctx.fillText(l, px(x), pz(z) + 3);
  }
  // player
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px(s.player.x), pz(s.player.z), 7, 0, 7); ctx.fill();
  ctx.strokeStyle = '#f2c230'; ctx.lineWidth = 2; ctx.stroke();
  // district labels last, with a dark halo so they read over roads and route
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    const ly = Math.max(11, Math.min(H - 12, pz(d.z) - 3));
    ctx.font = 'bold 8px sans-serif';
    ctx.strokeStyle = 'rgba(10,16,24,0.9)'; ctx.lineWidth = 3;
    ctx.strokeText(d.name, px(d.x), ly);
    ctx.fillStyle = '#e8f2f2';
    ctx.fillText(d.name, px(d.x), ly);
    ctx.font = '8px sans-serif';
    ctx.strokeText(`${d.mood} · ${d.standing}`, px(d.x), ly + 10);
    ctx.fillStyle = '#cfe0d8';
    ctx.fillText(`${d.mood} · ${d.standing}`, px(d.x), ly + 10);
  }
}

function workshopList() {
  return UPGRADES.slice(0, 4).map((u) => `
    <div class="ws-row ${u.state === 'SELECTED' ? 'selected' : ''}">
      <span class="ws-tag">${u.tag}</span><b>${u.name}</b>
      <span class="ws-state ${u.state === 'OWNED' ? 'owned' : u.state.startsWith('LOCKED') ? 'locked' : ''}">${u.state === 'BUY' ? '$' + u.price.toLocaleString() : u.state === 'SELECTED' ? '$' + u.price.toLocaleString() : u.state === 'OWNED' ? '✓ OWNED' : u.state}</span>
    </div>`).join('');
}

export function renderMetaBody(s) {
  const body = document.getElementById('meta-body');
  if (!body || !s) return;
  document.getElementById('screen-meta').classList.toggle('shot', !!window.__shotMode);
  if (activeTab === 'STATS' || activeTab === 'MAP') {
    body.innerHTML = `
    <div class="meta-col left">
      <div class="meta-card ring-card">${pctRing(66.1)}
        <div class="progress-list">${progressRows(s)}</div>
      </div>
      <div class="meta-card"><div class="meta-card-title">MISSION RATINGS</div>${ratingsRow(s)}</div>
      <div class="meta-card"><div class="meta-card-title">SAVE SLOTS</div>
        ${SAVE_SLOTS.map((sl) => `<div class="save-row"><span><b>${sl.n} · ${sl.label}</b> · ${sl.pct}% · ${sl.time}</span><button class="save-btn">SAVE</button></div>`).join('')}
      </div>
    </div>
    <div class="meta-col mid">
      <div class="meta-card map-card"><canvas id="meta-map" width="360" height="240"></canvas>
      <div class="map-caption">Street race: Terrace Climb · 0.79 km</div></div>
    </div>
    <div class="meta-col right">
      <div class="meta-card"><div class="meta-card-title">RANK ${s.rank} · ${s.rankName}</div>
        <div class="rank-bar"><div style="width:${(s.xp / s.xpMax) * 100}%"></div></div>
        <div class="rank-sub">${s.xp.toLocaleString()} RP · 1,300 to Shot Caller</div>
        <div class="rank-sub">Next: Garage · SBP Bastion</div></div>
      <div class="meta-card"><div class="meta-card-title">CAREER</div>
        <div class="career-grid">
          <div><b>41</b><span>CARS STOLEN</span></div><div><b>12</b><span>COPS ESCAPED</span></div>
          <div><b>★★★★</b><span>HIGHEST WANTED</span></div><div><b>48.2 km</b><span>DISTANCE DRIVEN</span></div>
          <div><b>23</b><span>PEOPLE TAKEN OUT</span></div><div><b>47 m</b><span>LONGEST JUMP</span></div>
          <div><b>38</b><span>CREW ABILITIES</span></div><div><b>9</b><span>HIDDEN BY LOCALS</span></div>
        </div></div>
      <div class="meta-card"><div class="meta-card-title">DOCKSIDE CUSTOMS · WORKSHOP</div>
        <div class="ws-quote">Pilar Santos · mechanic · “You break it, I bill it.”</div>
        ${workshopList()}
        <button class="meta-btn" id="ws-back">BACK TO THE STREET</button></div>
    </div>`;
    mapCanvas(s);
    const back = document.getElementById('ws-back');
    if (back) back.addEventListener('click', () => window.__solaraCloseMeta && window.__solaraCloseMeta());
  } else if (activeTab === 'STORY') {
    body.innerHTML = `<div class="meta-col wide"><div class="meta-card"><div class="meta-card-title">STORY · 8 MISSIONS</div>
      ${MISSIONS.map((m) => `<div class="story-row"><span class="story-ch">${m.chapter}</span><b>${m.id}. ${m.title}</b><span>${m.brief}</span><span class="story-cash">$${m.cash.toLocaleString()}</span></div>`).join('')}
      </div></div>`;
  } else if (activeTab === 'CREW') {
    body.innerHTML = `<div class="meta-col wide"><div class="meta-card"><div class="meta-card-title">CREW</div>
      ${CREW.map((c) => `<div class="story-row"><span class="crew-initials" style="background:#3f7fb5">${c.initials}</span><b>${c.name}</b><span>${c.role} · ${c.ability} [${c.key}] — ${c.desc}</span></div>`).join('')}
      </div></div>`;
  } else if (activeTab === 'CONTROLS') {
    body.innerHTML = `<div class="meta-col wide"><div class="meta-card"><div class="meta-card-title">CONTROLS</div>
      <div class="story-row"><b>WASD / Arrows</b><span>Drive / walk</span></div>
      <div class="story-row"><b>E</b><span>Enter / exit car · steal parked car</span></div>
      <div class="story-row"><b>SPACE</b><span>Brake / handbrake</span></div>
      <div class="story-row"><b>Mouse / Click</b><span>Aim · shoot on foot</span></div>
      <div class="story-row"><b>1–6</b><span>Weapons</span></div>
      <div class="story-row"><b>Z / X / C / V</b><span>Crew abilities</span></div>
      <div class="story-row"><b>M</b><span>Mission list</span></div><div class="story-row"><b>TAB</b><span>Map / Stats</span></div>
      <div class="story-row"><b>R</b><span>Radio station</span></div></div></div>`;
  } else if (activeTab === 'SAVE') {
    body.innerHTML = `<div class="meta-col wide"><div class="meta-card"><div class="meta-card-title">SAVE SLOTS</div>
      ${SAVE_SLOTS.map((sl) => `<div class="save-row"><span><b>${sl.n} · ${sl.pct}% · ${sl.label}</b><br>${sl.missions} · ${sl.time}</span><button class="save-btn">SAVE</button></div>`).join('')}
      <div class="story-row"><span>Progress autosaves to this browser after every mission.</span></div></div></div>`;
  } else {
    body.innerHTML = `<div class="meta-col wide"><div class="meta-card"><div class="meta-card-title">${activeTab}</div>
      <div class="story-row"><span>Music volume, effects volume, camera distance and difficulty live here. Defaults are tuned for the bay.</span></div></div></div>`;
  }
  const mc = document.getElementById('meta-cash');
  if (mc) mc.textContent = '$' + s.cash.toLocaleString('en-US');
}
