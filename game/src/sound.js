// Tiny synthesized sound effects (WebAudio, no assets, no network): short oscillator blips
// and a noise burst. Everything is created lazily on the first user gesture; with no gesture
// there is no audio context at all, and every call is best-effort, so sound can never break
// the game.

export function createSound() {
  let context = null;
  let muted = false;

  function ensure() {
    if (muted) return null;
    try {
      if (!context) context = new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') void context.resume();
      return context;
    } catch {
      return null;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    const ac = ensure();
    if (!ac) return;
    try {
      const oscillator = ac.createOscillator();
      const gain = ac.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(freq, ac.currentTime);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ac.currentTime + dur);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      oscillator.connect(gain).connect(ac.destination);
      oscillator.start();
      oscillator.stop(ac.currentTime + dur);
    } catch {
      // Sound is best-effort.
    }
  }

  function noise(dur, vol) {
    const ac = ensure();
    if (!ac) return;
    try {
      const length = Math.floor(ac.sampleRate * dur);
      const buffer = ac.createBuffer(1, length, ac.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
      const source = ac.createBufferSource();
      source.buffer = buffer;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      source.connect(gain).connect(ac.destination);
      source.start();
    } catch {
      // Sound is best-effort.
    }
  }

  return {
    /** Create (or resume) the audio context after a user gesture. */
    unlock() {
      ensure();
    },
    shoot() {
      tone(720, 0.07, 'square', 0.045, 320);
    },
    explosion() {
      noise(0.22, 0.16);
      tone(180, 0.18, 'triangle', 0.1, 60);
    },
    hit() {
      tone(140, 0.25, 'sawtooth', 0.14, 50);
      noise(0.15, 0.1);
    },
    wave() {
      tone(523, 0.09, 'sine', 0.08);
      window.setTimeout(() => tone(659, 0.09, 'sine', 0.08), 90);
      window.setTimeout(() => tone(784, 0.14, 'sine', 0.08), 180);
    },
    over() {
      tone(392, 0.22, 'triangle', 0.1, 196);
      window.setTimeout(() => tone(262, 0.4, 'triangle', 0.1, 98), 200);
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
