// Suara synth WebAudio sendiri — tanpa file audio eksternal. Langkah kaki,
// denting loot, ketukan palu lelang, sting alarm, dan dengung ruangan.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let ambientNodes = null;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      this.startAmbient();
    },
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    step(run) {
      noiseBurst(0.05, run ? 0.1 : 0.045, run ? 900 : 500);
    },
    loot() {
      tone(880, 0.12, 'sine', 0.22);
      setTimeout(() => tone(1318, 0.22, 'sine', 0.2), 90);
    },
    // Ketukan palu lelang: tok-tok yang menandai lot terjual — dipakai juga
    // sebagai bunyi saat pengalih dilempar.
    gavel() {
      noiseBurst(0.07, 0.3, 1800);
      tone(180, 0.09, 'triangle', 0.25, 90);
    },
    suspicious() {
      tone(440, 0.16, 'square', 0.1, 620);
    },
    alarm() {
      tone(520, 0.35, 'sawtooth', 0.16, 780);
      setTimeout(() => tone(520, 0.35, 'sawtooth', 0.16, 780), 380);
    },
    caught() {
      tone(220, 0.5, 'sawtooth', 0.22, 110);
      noiseBurst(0.3, 0.18, 700);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.2), i * 130));
    },
    lose() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.18), i * 160));
    },
    startAmbient() {
      if (!ensure() || ambientNodes || muted) return;
      try {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 55;
        const gain = ctx.createGain();
        gain.gain.value = 0.035;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.07;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.015;
        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        lfo.start();
        ambientNodes = { osc, lfo };
      } catch {
        ambientNodes = null;
      }
    },
  };
}
