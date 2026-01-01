class SoundManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  ensureContext() {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.error(e));
    }
    return true;
  }

  playJump() {
    if (this.muted || !this.ensureContext()) return;
    
    const t = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.start();
    osc.stop(t + 0.1);
  }

  playCoin() {
    if (this.muted || !this.ensureContext()) return;

    const t = this.ctx!.currentTime;
    
    // First beep
    const osc1 = this.ctx!.createOscillator();
    const gain1 = this.ctx!.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, t);
    gain1.gain.setValueAtTime(0.05, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    osc1.connect(gain1);
    gain1.connect(this.ctx!.destination);
    osc1.start();
    osc1.stop(t + 0.1);

    // Second beep
    const osc2 = this.ctx!.createOscillator();
    const gain2 = this.ctx!.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, t + 0.05);
    gain2.gain.setValueAtTime(0.05, t + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    
    osc2.connect(gain2);
    gain2.connect(this.ctx!.destination);
    osc2.start(t + 0.05);
    osc2.stop(t + 0.15);
  }

  playShieldBreak() {
    if (this.muted || !this.ensureContext()) return;
    const t = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.linearRampToValueAtTime(50, t + 0.3);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);
    
    osc.connect(gain);
    gain.connect(this.ctx!.destination);
    osc.start();
    osc.stop(t + 0.3);
  }

  playGameOver() {
    if (this.muted || !this.ensureContext()) return;

    const t = this.ctx!.currentTime;
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.5);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx!.destination);

    osc.start();
    osc.stop(t + 0.5);
  }
}

export const soundManager = new SoundManager();