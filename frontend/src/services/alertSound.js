/**
 * AGNIDRISHTI - Soft Tactical Emergency Alert Synthesizer
 * Generates an ambient, low-volume, smooth command-post alert chime/siren
 * using pure sine waves via the Web Audio API.
 */

class AlertSoundService {
  constructor() {
    this.audioCtx = null;
    this.oscillator1 = null;
    this.oscillator2 = null;
    this.gainNode = null;
    this.lfo = null;
    this.isPlaying = false;
    this.pulseTimer = null;
  }

  _initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Starts a smooth, low-volume tactical alert chime / siren
   */
  startEmergencySiren() {
    if (this.isPlaying) return;

    try {
      this._initContext();
      this.isPlaying = true;

      const now = this.audioCtx.currentTime;

      // Master Gain - Low volume (0.04 peak gain: soft, pleasant, non-jarring)
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.001, now);
      this.gainNode.gain.linearRampToValueAtTime(0.038, now + 0.15);
      this.gainNode.connect(this.audioCtx.destination);

      // Primary Oscillator - Warm pure sine wave at 480 Hz
      this.oscillator1 = this.audioCtx.createOscillator();
      this.oscillator1.type = 'sine';
      this.oscillator1.frequency.setValueAtTime(480, now);

      // Harmonic Oscillator - Soft harmonic at 720 Hz (pure 5th interval for clean command-center chime)
      this.oscillator2 = this.audioCtx.createOscillator();
      this.oscillator2.type = 'sine';
      this.oscillator2.frequency.setValueAtTime(720, now);

      // Sub-gain for the harmonic so it stays subtle and warm
      const harmonicGain = this.audioCtx.createGain();
      harmonicGain.gain.setValueAtTime(0.35, now);
      this.oscillator2.connect(harmonicGain);
      harmonicGain.connect(this.gainNode);

      // Gentle LFO frequency modulation (soft siren warble: 1.4 Hz, +/- 65 Hz)
      this.lfo = this.audioCtx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(1.4, now);

      const lfoGain = this.audioCtx.createGain();
      lfoGain.gain.setValueAtTime(65, now);

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.oscillator1.frequency);
      lfoGain.connect(this.oscillator2.frequency);

      this.oscillator1.connect(this.gainNode);

      this.lfo.start(now);
      this.oscillator1.start(now);
      this.oscillator2.start(now);

      // Gentle rhythmic pulsing envelope (soft tactical swell and dip)
      let step = 0;
      this.pulseTimer = setInterval(() => {
        if (!this.isPlaying || !this.gainNode || !this.audioCtx) return;
        step++;
        const t = this.audioCtx.currentTime;
        const targetVol = (step % 2 === 0) ? 0.042 : 0.012;
        this.gainNode.gain.cancelScheduledValues(t);
        this.gainNode.gain.linearRampToValueAtTime(targetVol, t + 0.25);
      }, 450);

    } catch (err) {
      console.warn('[AGNIDRISHTI Audio] Audio context initialization error:', err);
      this.isPlaying = false;
    }
  }

  /**
   * Stops the emergency siren immediately with smooth fade-out
   */
  stopEmergencySiren() {
    if (!this.isPlaying) return;

    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }

    try {
      if (this.gainNode && this.audioCtx) {
        const now = this.audioCtx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.linearRampToValueAtTime(0.0001, now + 0.1);

        setTimeout(() => {
          try {
            if (this.oscillator1) { this.oscillator1.stop(); this.oscillator1.disconnect(); this.oscillator1 = null; }
            if (this.oscillator2) { this.oscillator2.stop(); this.oscillator2.disconnect(); this.oscillator2 = null; }
            if (this.lfo) { this.lfo.stop(); this.lfo.disconnect(); this.lfo = null; }
            if (this.gainNode) { this.gainNode.disconnect(); this.gainNode = null; }
          } catch (e) {}
        }, 120);
      }
    } catch (err) {
      console.warn('[AGNIDRISHTI Audio] Error stopping siren:', err);
    } finally {
      this.isPlaying = false;
    }
  }

  toggleEmergencySiren() {
    if (this.isPlaying) {
      this.stopEmergencySiren();
      return false;
    } else {
      this.startEmergencySiren();
      return true;
    }
  }
}

export const alertSound = new AlertSoundService();
