// SOLARA BAY — audio.js: tiny WebAudio synth. Engine hum, sirens, shots, radio blips.
// No audio files: everything is oscillators, so the game stays offline and light.
export class AudioEngine {
  constructor() {
    this.ctx = null; this.engineOsc = null; this.engineGain = null; this.muted = false;
  }
  ensure() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 55;
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass'; filt.frequency.value = 420;
      this.engineOsc.connect(filt); filt.connect(this.engineGain); this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    } catch { this.ctx = null; }
  }
  setEngine(speed01) {
    if (!this.ctx || this.muted) return;
    this.engineOsc.frequency.value = 50 + speed01 * 140;
    this.engineGain.gain.value = 0.02 + speed01 * 0.05;
  }
  blip(freq = 660, dur = 0.09, type = 'square', vol = 0.05) {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(); o.stop(this.ctx.currentTime + dur);
  }
  siren() { this.blip(880, 0.28, 'sine', 0.04); setTimeout(() => this.blip(620, 0.28, 'sine', 0.04), 300); }
  shot() { this.blip(180, 0.12, 'square', 0.09); this.blip(90, 0.1, 'sawtooth', 0.06); }
  cash() { this.blip(880, 0.08, 'sine', 0.05); setTimeout(() => this.blip(1320, 0.14, 'sine', 0.05), 90); }
  crash() { this.blip(70, 0.25, 'sawtooth', 0.1); }
}
