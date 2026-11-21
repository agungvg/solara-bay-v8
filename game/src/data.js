// SOLARA BAY — game data: the city, its people, its story.
// Every name, district, mission and line below is original to this game.
export const DISTRICTS = [
  { id: 'marina',  name: 'MARINA ROW',  sub: 'Strand Boulevard',  x: -160, z: -150, w: 120, h: 120, standing: 58, mood: 'NEUTRAL',  hint: 'BOATS LEAVE AT DAWN' },
  { id: 'central', name: 'CENTRAL',    sub: 'Solara Square',     x: 0,    z: -60,  w: 150, h: 130, standing: 62, mood: 'NEUTRAL',  hint: 'CROWDS HIDE A FACE' },
  { id: 'harbor',  name: 'HARBOR',     sub: 'Dockside Customs',  x: -160, z: 90,   w: 130, h: 120, standing: 71, mood: 'FRIENDLY', hint: 'PILAR FIXES ANYTHING' },
  { id: 'heights', name: 'HEIGHTS',    sub: 'Glass Towers',      x: 120,  z: -150, w: 130, h: 120, standing: 34, mood: 'WARY',     hint: 'CAMERAS ON EVERY ROOF' },
  { id: 'oldtown', name: 'OLD TOWN',   sub: 'Lantern Lanes',     x: 130,  z: 80,   w: 130, h: 120, standing: 66, mood: 'FRIENDLY', hint: 'SHOPKEEPERS LOOK AWAY' },
  { id: 'strand',  name: 'THE STRAND', sub: 'Beachfront',        x: -20,  z: -235, w: 180, h: 120, standing: 52, mood: 'NEUTRAL',  hint: 'OPEN ROAD, OPEN SKY' },
  { id: 'lantern', name: 'LANTERN MARKET', sub: 'Night Market',  x: 10,   z: 150,  w: 160, h: 110, standing: 74, mood: 'FRIENDLY', hint: 'DUCK BY A STALL TO HIDE' },
];

export const CREW = [
  { id: 'mira', initials: 'MK', name: 'MIRA KESANG', role: 'Driver',      ability: 'SWAP PLATES', key: 'Z', desc: 'Drops wanted level by one star', cooldown: 45 },
  { id: 'lio',  initials: 'LO', name: 'LIO ORTIZ',   role: 'Mechanic',    ability: 'QUICK FIX',   key: 'X', desc: 'Repairs 40% of car condition',   cooldown: 60 },
  { id: 'kiki', initials: 'KK', name: 'KIKI TAN',    role: 'Lookout',     ability: 'EYES OUT',    key: 'C', desc: 'Reveals police positions for 12s', cooldown: 30 },
  { id: 'dee',  initials: 'UD', name: 'UNCLE DEE',   role: 'Fixer',       ability: 'GETAWAY',     key: 'V', desc: 'Calls a clean getaway car',       cooldown: 90 },
];

export const WEAPONS = [
  { slot: 1, name: 'FISTS',       ammo: '∞',   icon: 'FIST' },
  { slot: 2, name: '.38 REVOLVER', ammo: 60,   icon: '.38' },
  { slot: 3, name: 'SMG',         ammo: '30/90', icon: 'SMG' },
  { slot: 4, name: '12G PUMP',    ammo: 18,   icon: '12G' },
  { slot: 5, name: 'RIFLE',       ammo: '—',  icon: 'AR-9' },
  { slot: 6, name: 'FLARE',       ammo: 'x3', icon: 'FLR' },
];

export const RADIO = [
  { station: 'OMBO 98.4', track: 'Island Pop',   song: 'Tide Runner — Sol Mara' },
  { station: 'LUMEN FM 98.6', track: 'Neon Tideline', song: 'Glass Hours — Vela' },
  { station: 'SOLARA 101', track: 'Bay Talk',   song: 'Night Desk — Harbor FM' },
];

export const UPGRADES = [
  { name: 'FULL REPAIR',     price: 250,  state: 'BUY',    tag: 'FIX',  desc: 'Back to showroom condition.' },
  { name: 'RESPRAY',         price: 400,  state: 'BUY',    tag: 'PAINT', desc: 'Any colour, no questions asked.' },
  { name: 'STAGE 2 TUNE',    price: 0,    state: 'OWNED',  tag: '+12%', desc: '+12% top speed, +8% acceleration.' },
  { name: 'ARMOUR PLATING',  price: 3600, state: 'SELECTED', tag: 'PLATE', desc: 'Every car you drive takes half damage from crashes, bullets and blasts.' },
  { name: 'NITRO KIT',       price: 0,    state: 'LOCKED · LV 6', tag: 'N2O', desc: 'A short burst of pure hurry.' },
  { name: 'RATTLER SMG',     price: 0,    state: 'OWNED',  tag: 'SMG',  desc: 'Loud, fast, forgiving.' },
  { name: 'TIDEBREAKER',     price: 0,    state: 'OWNED',  tag: '12G',  desc: 'Closes doors. And arguments.' },
  { name: 'HARRIER LR',      price: 6800, state: 'BUY',    tag: 'LR',   desc: 'Long-range, low patience.' },
  { name: 'FLARE CHARGES X3', price: 600, state: 'BUY',    tag: 'x3',   desc: 'Light up the night, blind the chase.' },
  { name: 'AMMO, ALL GUNS',  price: 200,  state: 'BUY',    tag: 'AMMO', desc: 'A full top-up for every gun.' },
  { name: 'BODY ARMOUR',     price: 350,  state: 'BUY',    tag: 'VEST', desc: 'Fifty extra points of not dying.' },
];

// 8 story missions, each with staged objectives. Types: goto, steal, ram, takedown, survive, deliver, jump.
export const MISSIONS = [
  {
    id: 1, chapter: 'CH. 1 · FIRST LIGHT', title: 'FIRST GEAR', cash: 1200,
    brief: 'Steal the Rukan Pelo GT and bring it to Marina Row.',
    stages: [
      { label: 'Reach the Pelo GT', type: 'goto', target: { x: 24, z: -40 } },
      { label: 'Steal the car', type: 'steal', target: { x: 24, z: -40 } },
      { label: 'Drive to Marina Row', type: 'goto', target: { x: -120, z: -140 } },
      { label: 'Lose the heat', type: 'survive', seconds: 12 },
    ],
    next: 'Meet Mira at the docks',
    dialogue: { who: 'MK', name: 'MIRA KESANG', role: 'Crew · Driver', text: 'That Pelo GT is unlocked and lonely. Take it, then bring it to the marina. Easy money.' },
  },
  {
    id: 2, chapter: 'CH. 1 · FIRST LIGHT', title: 'MARKET SQUEEZE', cash: 2400,
    brief: 'Clear the Lantern Market aisles of the rival crew, on foot.',
    stages: [
      { label: 'Enter the night market', type: 'goto', target: { x: 10, z: 130 } },
      { label: 'Take out the rivals 0/3', type: 'takedown', count: 3, target: { x: 20, z: 160 } },
      { label: 'Meet Mira at the stall', type: 'goto', target: { x: -20, z: 170 } },
    ],
    next: 'Melt away through the crowd',
    dialogue: { who: 'UD', name: 'UNCLE DEE', role: 'Fixer', text: 'Three of them, left aisle. The market crowd will swallow the noise. Go quiet, go quick.' },
  },
  {
    id: 3, chapter: 'CH. 2 · SALT', title: 'SALT & SIRENS', cash: 3600,
    brief: 'Outrun the heat along the beachfront. Five checkpoints, forty-five seconds.',
    stages: [
      { label: 'Hit checkpoint 1/5', type: 'checkpoint', target: { x: -60, z: -220 } },
      { label: 'Hit checkpoint 3/5', type: 'checkpoint', target: { x: 60, z: -230 } },
      { label: 'Hit checkpoint 5/5', type: 'checkpoint', target: { x: 120, z: -140 } },
      { label: 'Lose the heat', type: 'survive', seconds: 10 },
    ],
    next: 'Lose the heat',
    dialogue: { who: 'UD', name: 'UNCLE DEE', role: 'Fixer', text: 'Every cruiser in the bay and Air One want that coral Vireo. Forty-five seconds on the parade, then you vanish.' },
  },
  {
    id: 4, chapter: 'CH. 3 · HIGH WATER', title: 'WRECK THE REGENT', cash: 5200,
    brief: 'Wreck the Regent — ram it until it breaks, before it reaches the pier.',
    stages: [
      { label: 'Catch the Regent', type: 'goto', target: { x: -40, z: -180 } },
      { label: 'Ram the Regent 0/3', type: 'ram', count: 3, target: { x: -40, z: -180 } },
      { label: 'Finish the Regent', type: 'ram', count: 1, target: { x: -80, z: -200 } },
    ],
    next: 'Lose the heat',
    dialogue: { who: 'MK', name: 'MIRA KESANG', role: 'Crew · Driver', text: "He's making for the pier! Ram the Regent before it reaches the water!" },
  },
  {
    id: 5, chapter: 'CH. 3 · HIGH WATER', title: 'DOCK SIDE RUN', cash: 4100,
    brief: 'Deliver the package to Dockside Customs, then let Pilar tune the Vireo.',
    stages: [
      { label: 'Pick up the package', type: 'goto', target: { x: -140, z: 60 } },
      { label: 'Deliver to the workshop', type: 'goto', target: { x: -160, z: 90 } },
      { label: 'Leave the workshop', type: 'goto', target: { x: -100, z: 40 } },
    ],
    next: 'Pilar tunes the Vireo',
    dialogue: { who: 'PS', name: 'PILAR SANTOS', role: 'Mechanic', text: 'You break it, I bill it. Package on the bench, keys in my hand. Then we talk tune.' },
  },
  {
    id: 6, chapter: 'CH. 4 · NEON TIDE', title: 'NEON TIDE', cash: 6800,
    brief: 'Night chase through Central, then a stunt jump off the Harbor ramp.',
    stages: [
      { label: 'Outrun the first wave', type: 'survive', seconds: 15 },
      { label: 'Reach the Harbor ramp', type: 'goto', target: { x: -120, z: 120 } },
      { label: 'Take the jump', type: 'jump', target: { x: -150, z: 140 } },
    ],
    next: 'Vanish into Old Town',
    dialogue: { who: 'KK', name: 'KIKI TAN', role: 'Crew · Lookout', text: 'Three cruisers on your tail and a ramp at the harbor. Jump it and the tide does the rest.' },
  },
  {
    id: 7, chapter: 'CH. 4 · NEON TIDE', title: 'GOLDEN HOUR HEIST', cash: 9500,
    brief: 'Hit the Heights exchange on foot, then get away clean.',
    stages: [
      { label: 'Reach the exchange', type: 'goto', target: { x: 120, z: -140 } },
      { label: 'Grab the gold 0/2', type: 'takedown', count: 2, target: { x: 130, z: -130 } },
      { label: 'Getaway to Old Town', type: 'goto', target: { x: 130, z: 80 } },
    ],
    next: 'Split the gold at the safehouse',
    dialogue: { who: 'LO', name: 'LIO ORTIZ', role: 'Crew · Mechanic', text: 'Two guards, one vault, zero alarms if you are quick. I have the van running in Old Town.' },
  },
  {
    id: 8, chapter: 'CH. 5 · SOLARA BAY', title: 'THE LONG WAY HOME', cash: 15000,
    brief: 'The final chase: lose every unit in the city, then escape by boat.',
    stages: [
      { label: 'Break the cordon', type: 'survive', seconds: 20 },
      { label: 'Reach the Strand', type: 'goto', target: { x: -40, z: -250 } },
      { label: 'Board the boat', type: 'goto', target: { x: -90, z: -270 } },
    ],
    next: 'Sail out with the tide',
    dialogue: { who: 'UD', name: 'UNCLE DEE', role: 'Fixer', text: 'Last one, kid. Every unit in Solara Bay is coming. Lose them all, and the boat is yours.' },
  },
];

export const POLICE_NAMES = ['KITE-1', 'CORAL-85', 'CORAL-43', 'CORAL-48', 'HERON-2', 'TIDE-37', 'TIDE-2', 'TIDE-6', 'PIER-5', 'AIR ONE'];
export const POLICE_ROLES = ['RAMMING', 'PURSUIT', 'FLANKING', 'ROADBLOCK', 'SPOTLIGHT', 'FIRING'];

export const SAVE_SLOTS = [
  { n: 1, pct: 66.1, label: 'Marina Row', missions: '5/8 missions', time: '15:11' },
  { n: 2, pct: 66.1, label: 'Harbor', missions: '5/8 missions', time: '15:11' },
  { n: 3, pct: 66.1, label: 'Lantern Market', missions: '5/8 missions', time: '15:12' },
];
