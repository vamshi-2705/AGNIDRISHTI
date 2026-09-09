/**
 * ASTRAFIRE / AGNIDRISHTI - Emergency Audio Alert Synthesizer
 * Generates realistic industrial emergency sirens and ringing alert tones
 * using the Web Audio API without requiring external audio files.
 */

class AlertSoundService {
  constructor() {
    this.audioCtx = null;
    this.oscillator1 = null;
    this.oscillator2 = null;
    this.gainNode = null;
    this.lfo = null;
    this.isPlaying = false;
    this.intervalId = null;
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
   * Starts a high-urgency industrial emergency siren / ringing alert
   */
  startEmergencySiren() {
    if (this.isPlaying) return;

    try {
      this._initContext();
      this.isPlaying = true;

      const now = this.audioCtx.currentTime;

      // Master Gain
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.12, now);
      this.gainNode.connect(this.audioCtx.destination);

      // Dual Oscillators for rich alarm timbre
      this.oscillator1 = this.audioCtx.createOscillator();
      this.oscillator2 = this.audioCtx.createOscillator();

      this.oscillator1.type = 'sawtooth';
      this.oscillator2.type = 'sine';

      this.oscillator1.frequency.setValueAtTime(820, now);
      this.oscillator2.frequency.setValueAtTime(824, now);

      // Low Frequency Oscillator (LFO) for tactical siren modulation (wailing frequency sweep)
      this.lfo = this.audioCtx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.setValueAtTime(2.2, now); // 2.2 Hz siren sweep

      const lfoGain = this.audioCtx.createGain();
      lfoGain.gain.setValueAtTime(180, now); // Sweep +/- 180Hz

      this.lfo.connect(lfoGain);
      lfoGain.connect(this.oscillator1.frequency);
      lfoGain.connect(this.oscillator2.frequency);

      this.oscillator1.connect(this.gainNode);
      this.oscillator2.connect(this.gainNode);

      this.lfo.start();
      this.oscillator1.start();
      this.oscillator2.start();

      // Pulsing beeper/ringing cadence overlay
      let pulseState = true;
      this.intervalId = setInterval(() => {
        if (!this.isPlaying || !this.gainNode || !this.audioCtx) return;
        pulseState = !pulseState;
        const t = this.audioCtx.currentTime;
        this.gainNode.gain.cancelScheduledValues(t);
        this.gainNode.gain.linearRampToValueAtTime(pulseState ? 0.16 : 0.03, t + 0.05);
      }, 350);

    } catch (err) {
      console.warn('[AGNIDRISHTI Audio] Web Audio API error:', err);
      this.isPlaying = false;
    }
  }

  /**
   * Stops the emergency siren immediately with smooth fade-out
   */
  stopEmergencySiren() {
    if (!this.isPlaying) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    try {
      if (this.gainNode && this.audioCtx) {
        const now = this.audioCtx.currentTime;
        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.linearRampToValueAtTime(0.001, now + 0.08);

        setTimeout(() => {
          try {
            if (this.oscillator1) { this.oscillator1.stop(); this.oscillator1.disconnect(); this.oscillator1 = null; }
            if (this.oscillator2) { this.oscillator2.stop(); this.oscillator2.disconnect(); this.oscillator2 = null; }
            if (this.lfo) { this.lfo.stop(); this.lfo.disconnect(); this.lfo = null; }
            if (this.gainNode) { this.gainNode.disconnect(); this.gainNode = null; }
          } catch (e) {}
        }, 100);
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
