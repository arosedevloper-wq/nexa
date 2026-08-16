// Web Audio API Casino Sound Synthesizer
// Synthesizes retro-modern high-fidelity arcade & casino sounds directly in the browser.
// This guarantees 100% reliability without requiring external static audio files.

import { useState, useEffect } from "react";

export type SfxType = 
  | "click"
  | "spin"
  | "reel_stop"
  | "win"
  | "megawin"
  | "jackpot"
  | "lose"
  | "chip"
  | "card_shuffle"
  | "card_flip"
  | "dice"
  | "vault"
  | "coin"
  | "multiplier"
  | "bonus"
  | "error";

class CasinoAudioService {
  private ctx: AudioContext | null = null;
  private musicInterval: number | null = null;
  private isMusicPlaying: boolean = false;
  private masterVolume: GainNode | null = null;
  private musicVolume: GainNode | null = null;
  private sfxVolume: GainNode | null = null;
  private currentStep: number = 0;
  private isMutedState: boolean = false;
  private masterVolumeVal: number = 0.6;

  // Jazz Lounge Groove Pattern Definition
  private bassNotes = [55.00, 55.00, 65.41, 73.42, 82.41, 82.41, 73.42, 65.41]; // A1, C2, D2, E2...
  private chordFreqs = [
    [110.00, 130.81, 164.81, 196.00], // Am7
    [110.00, 130.81, 164.81, 196.00], // Am7
    [116.54, 138.59, 174.61, 207.65], // Bbm7
    [116.54, 138.59, 174.61, 207.65], // Bbm7
  ];

  constructor() {
    // Load persisted mute & volume settings if available
    try {
      const savedMute = localStorage.getItem("casino_audio_muted");
      if (savedMute !== null) {
        this.isMutedState = savedMute === "true";
      }
      const savedVol = localStorage.getItem("casino_audio_volume");
      if (savedVol !== null) {
        this.masterVolumeVal = Math.min(1, Math.max(0, parseFloat(savedVol)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  private init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();
    
    // Create gain nodes for audio mixing
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.setValueAtTime(this.isMutedState ? 0 : this.masterVolumeVal, this.ctx.currentTime);
    this.masterVolume.connect(this.ctx.destination);

    this.musicVolume = this.ctx.createGain();
    this.musicVolume.gain.setValueAtTime(0.25, this.ctx.currentTime);
    this.musicVolume.connect(this.masterVolume);

    this.sfxVolume = this.ctx.createGain();
    this.sfxVolume.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.sfxVolume.connect(this.masterVolume);
  }

  // Master Volume & Mute Controls
  public setMuted(muted: boolean): boolean {
    this.isMutedState = muted;
    try {
      localStorage.setItem("casino_audio_muted", String(muted));
    } catch {}

    if (this.masterVolume && this.ctx) {
      this.masterVolume.gain.setValueAtTime(muted ? 0 : this.masterVolumeVal, this.ctx.currentTime);
    }
    return this.isMutedState;
  }

  public toggleMute(): boolean {
    return this.setMuted(!this.isMutedState);
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public setVolume(volume: number) {
    this.masterVolumeVal = Math.min(1, Math.max(0, volume));
    try {
      localStorage.setItem("casino_audio_volume", String(this.masterVolumeVal));
    } catch {}

    if (this.masterVolume && this.ctx && !this.isMutedState) {
      this.masterVolume.gain.setValueAtTime(this.masterVolumeVal, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.masterVolumeVal;
  }

  // Toggles the background jazz synth music
  public toggleMusic(forceState?: boolean): boolean {
    this.init();
    if (!this.ctx) return false;

    const targetState = forceState !== undefined ? forceState : !this.isMusicPlaying;
    
    if (targetState === this.isMusicPlaying) {
      return this.isMusicPlaying;
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    if (targetState) {
      this.startLoungeGroove();
    } else {
      this.stopLoungeGroove();
    }

    return this.isMusicPlaying;
  }

  public getMusicPlayingState(): boolean {
    return this.isMusicPlaying;
  }

  private startLoungeGroove() {
    if (!this.ctx || !this.musicVolume) return;
    this.isMusicPlaying = true;
    this.currentStep = 0;

    // Scheduler ticking at 140 BPM (swing eight notes)
    const stepTime = 60 / 140 / 2; // eighth notes

    const tick = () => {
      if (!this.isMusicPlaying || !this.ctx || !this.musicVolume) return;
      
      const time = this.ctx.currentTime;
      const step = this.currentStep % 16;

      // 1. Play Soft Lounge Bassline Note
      if (step % 2 === 0) {
        const bassIndex = Math.floor(step / 2) % this.bassNotes.length;
        const freq = this.bassNotes[bassIndex];
        this.playJazzBass(freq, time, stepTime * 1.5);
      }

      // 2. Play Dynamic Soft Chord (Warm pad swell)
      if (step === 0 || step === 8) {
        const chordIndex = Math.floor(step / 8) % this.chordFreqs.length;
        const freqs = this.chordFreqs[chordIndex];
        this.playLoungeChord(freqs, time, stepTime * 6);
      }

      // 3. Subtle Jazz Hi-Hat (Soft brushed white noise)
      if (step % 4 === 2 || (step % 4 === 3 && Math.random() > 0.4)) {
        this.playBrushedHat(time);
      }

      this.currentStep++;
      
      this.musicInterval = window.setTimeout(tick, stepTime * 1000);
    };

    tick();
  }

  private stopLoungeGroove() {
    this.isMusicPlaying = false;
    if (this.musicInterval) {
      clearTimeout(this.musicInterval);
      this.musicInterval = null;
    }
  }

  // Synthesizes a warm, double-bass pluck tone
  private playJazzBass(freq: number, time: number, duration: number) {
    if (!this.ctx || !this.musicVolume) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.98, time + duration);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.35, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(150, time);

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(this.musicVolume);

    osc.start(time);
    osc.stop(time + duration + 0.1);
  }

  // Synthesizes dynamic soft chords
  private playLoungeChord(freqs: number[], time: number, duration: number) {
    if (!this.ctx || !this.musicVolume) return;

    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq + (idx * 0.4 - 0.8), time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.06, time + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, time);

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(this.musicVolume);

      osc.start(time);
      osc.stop(time + duration + 0.5);
    });
  }

  // Synthesizes brushed high hats using filtered white noise
  private playBrushedHat(time: number) {
    if (!this.ctx || !this.musicVolume) return;

    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(8000, time);
    filter.Q.setValueAtTime(3, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    noise.connect(filter);
    filter.connect(gain);
    filter.connect(this.musicVolume);

    noise.start(time);
  }

  // ==========================================
  // CASINO FLOOR SYNTHESIZED SOUND EFFECTS
  // ==========================================

  // Sound effect: Chips clinking (metallic high-pitch chime)
  public playChipClink() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    
    [0, 0.04].forEach((delay) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(2400 + (delay * 1000), time + delay);
      
      gain.gain.setValueAtTime(0, time + delay);
      gain.gain.linearRampToValueAtTime(0.18, time + delay + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.12);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1000, time + delay);

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(this.sfxVolume!);

      osc.start(time + delay);
      osc.stop(time + delay + 0.15);
    });
  }

  // Sound effect: Cards shuffling (sliding textured sound)
  public playCardShuffle() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const duration = 0.12;

    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2500, time);
    filter.frequency.exponentialRampToValueAtTime(800, time + duration);
    filter.Q.setValueAtTime(1.5, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.15, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxVolume);

    noise.start(time);
  }

  // Sound effect: Card Flip (quick snap sound)
  public playCardFlip() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(1200, time);
    osc.frequency.exponentialRampToValueAtTime(300, time + 0.04);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxVolume);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  // Sound effect: Slots/Wheel spinning
  public playWheelSpin(duration: number = 0.12, pitchModifier: number = 1.0) {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(180 * pitchModifier, time);
    osc.frequency.exponentialRampToValueAtTime(80 * pitchModifier, time + duration);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(gain);
    gain.connect(this.sfxVolume);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  // Sound effect: Mechanical Reel Stop click
  public playReelStop() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.05);

    gain.gain.setValueAtTime(0.22, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(800, time);

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(this.sfxVolume);

    osc.start(time);
    osc.stop(time + 0.06);
  }

  // Sound effect: Winner arpeggiated bright fanfare
  public playWin() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6

    notes.forEach((freq, idx) => {
      const delay = idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, time + delay);

      gain.gain.setValueAtTime(0, time + delay);
      gain.gain.linearRampToValueAtTime(0.2, time + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.25);

      osc.connect(gain);
      gain.connect(this.sfxVolume!);

      osc.start(time + delay);
      osc.stop(time + delay + 0.3);
    });
  }

  // Sound effect: Explosive Mega Win / Jackpot Celebration Fanfare
  public playMegaWin() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    
    // 1. Ascending triumph arpeggio sequence
    const jackpotSequence = [
      { freq: 523.25, delay: 0.00, dur: 0.15 }, // C5
      { freq: 659.25, delay: 0.08, dur: 0.15 }, // E5
      { freq: 783.99, delay: 0.16, dur: 0.15 }, // G5
      { freq: 1046.50, delay: 0.24, dur: 0.25 }, // C6
      { freq: 1318.51, delay: 0.34, dur: 0.25 }, // E6
      { freq: 1567.98, delay: 0.44, dur: 0.35 }, // G6
      { freq: 2093.00, delay: 0.56, dur: 0.60 }, // C7 GRAND FINALE
    ];

    jackpotSequence.forEach(({ freq, delay, dur }) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time + delay);

      // Warm lowpass filter for brass-like quality
      const filter = this.ctx!.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2200, time + delay);

      gain.gain.setValueAtTime(0, time + delay);
      gain.gain.linearRampToValueAtTime(0.22, time + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxVolume!);

      osc.start(time + delay);
      osc.stop(time + delay + dur + 0.1);
    });

    // 2. Rapid coin cascade chimes burst (0.2s to 1.2s)
    for (let i = 0; i < 12; i++) {
      const delay = 0.2 + (i * 0.08);
      const coinFreq = 2200 + Math.random() * 1200;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(coinFreq, time + delay);

      gain.gain.setValueAtTime(0, time + delay);
      gain.gain.linearRampToValueAtTime(0.12, time + delay + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxVolume);

      osc.start(time + delay);
      osc.stop(time + delay + 0.12);
    }
  }

  // Alias for Mega Win
  public playJackpot() {
    this.playMegaWin();
  }

  // Sound effect: Loser descending sad frequency slide
  public playLose() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, time); // A3
    osc.frequency.linearRampToValueAtTime(110, time + 0.4);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, time);

    osc.connect(gain);
    gain.connect(filter);
    filter.connect(this.sfxVolume);

    osc.start(time);
    osc.stop(time + 0.5);
  }

  // Sound effect: Navigation select click sound
  public playClick() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, time);
    osc.frequency.exponentialRampToValueAtTime(500, time + 0.03);

    gain.gain.setValueAtTime(0.08, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    osc.connect(gain);
    gain.connect(this.sfxVolume);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  // Sound effect: Dice Roll (tumbling wood clatter)
  public playDiceRoll() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    // 3 rapid tumbling impacts
    [0.00, 0.06, 0.13].forEach((delay, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(320 - (idx * 40), time + delay);
      osc.frequency.exponentialRampToValueAtTime(120, time + delay + 0.04);

      gain.gain.setValueAtTime(0.18, time + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.04);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(600, time + delay);

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(this.sfxVolume!);

      osc.start(time + delay);
      osc.stop(time + delay + 0.05);
    });
  }

  // Sound effect: Vault Unlock (heavy mechanical bolt + pneumatic hiss + gold chime)
  public playVaultUnlock() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;

    // 1. Heavy Mechanical Metal Turning
    const oscMetal = this.ctx.createOscillator();
    const gainMetal = this.ctx.createGain();
    oscMetal.type = "sawtooth";
    oscMetal.frequency.setValueAtTime(120, time);
    oscMetal.frequency.exponentialRampToValueAtTime(240, time + 0.2);

    gainMetal.gain.setValueAtTime(0.25, time);
    gainMetal.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    const filterMetal = this.ctx.createBiquadFilter();
    filterMetal.type = "lowpass";
    filterMetal.frequency.setValueAtTime(500, time);

    oscMetal.connect(filterMetal);
    filterMetal.connect(gainMetal);
    gainMetal.connect(this.sfxVolume);

    oscMetal.start(time);
    oscMetal.stop(time + 0.25);

    // 2. Pneumatic Air Release Hiss
    const bufferSize = this.ctx.sampleRate * 0.18;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filterHiss = this.ctx.createBiquadFilter();
    filterHiss.type = "highpass";
    filterHiss.frequency.setValueAtTime(2000, time + 0.1);

    const gainHiss = this.ctx.createGain();
    gainHiss.gain.setValueAtTime(0.1, time + 0.1);
    gainHiss.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    noise.connect(filterHiss);
    filterHiss.connect(gainHiss);
    gainHiss.connect(this.sfxVolume);

    noise.start(time + 0.1);

    // 3. Gold Shine Chime
    const oscChime = this.ctx.createOscillator();
    const gainChime = this.ctx.createGain();
    oscChime.type = "sine";
    oscChime.frequency.setValueAtTime(1760, time + 0.25); // A6
    oscChime.frequency.exponentialRampToValueAtTime(3520, time + 0.55); // A7

    gainChime.gain.setValueAtTime(0.2, time + 0.25);
    gainChime.gain.exponentialRampToValueAtTime(0.001, time + 0.55);

    oscChime.connect(gainChime);
    gainChime.connect(this.sfxVolume);

    oscChime.start(time + 0.25);
    oscChime.stop(time + 0.6);
  }

  // Sound effect: Coin Drop (golden coin dropping and bouncing)
  public playCoinDrop() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    [0.0, 0.05, 0.09].forEach((delay, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(3000 - (idx * 300), time + delay);

      gain.gain.setValueAtTime(0, time + delay);
      gain.gain.linearRampToValueAtTime(0.15 - (idx * 0.03), time + delay + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.08);

      osc.connect(gain);
      gain.connect(this.sfxVolume!);

      osc.start(time + delay);
      osc.stop(time + delay + 0.1);
    });
  }

  // Sound effect: Multiplier Pop (rising pitch blip)
  public playMultiplierPop(multiplier: number = 1.0) {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const baseFreq = 400 + Math.min(2000, multiplier * 150);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, time);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, time + 0.08);

    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxVolume);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  // Sound effect: Bonus Level Fanfare
  public playBonusFanfare() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const notes = [587.33, 659.25, 783.99, 880.00, 1046.50]; // D5, E5, G5, A5, C6

    notes.forEach((freq, idx) => {
      const delay = idx * 0.06;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time + delay);

      gain.gain.setValueAtTime(0, time + delay);
      gain.gain.linearRampToValueAtTime(0.18, time + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.2);

      osc.connect(gain);
      gain.connect(this.sfxVolume!);

      osc.start(time + delay);
      osc.stop(time + delay + 0.25);
    });
  }

  // Sound effect: Rocket Launch / Turbine sweep
  public playRocketLaunch() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(100, time);
    osc.frequency.exponentialRampToValueAtTime(800, time + 0.3);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxVolume);

    osc.start(time);
    osc.stop(time + 0.4);
  }

  // Sound effect: Crash Explosion
  public playCrashExplosion() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxVolume);

    noise.start(time);
  }

  // Sound effect: Laser Shot
  public playLaserShot() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1500, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.12);

    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxVolume);

    osc.start(time);
    osc.stop(time + 0.15);
  }

  // Sound effect: Error / Access Denied low double buzz
  public playError() {
    this.init();
    if (!this.ctx || !this.sfxVolume || this.isMutedState) return;

    const time = this.ctx.currentTime;
    [0.0, 0.12].forEach((delay) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(140, time + delay);

      gain.gain.setValueAtTime(0.15, time + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, time + delay + 0.08);

      const filter = this.ctx!.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(300, time + delay);

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(this.sfxVolume!);

      osc.start(time + delay);
      osc.stop(time + delay + 0.1);
    });
  }

  // Unified SFX Dispatcher
  public playSfx(type: SfxType, options?: { duration?: number; pitch?: number; multiplier?: number }) {
    switch (type) {
      case "click":
        this.playClick();
        break;
      case "spin":
        this.playWheelSpin(options?.duration ?? 0.12, options?.pitch ?? 1.0);
        break;
      case "reel_stop":
        this.playReelStop();
        break;
      case "win":
        this.playWin();
        break;
      case "megawin":
      case "jackpot":
        this.playMegaWin();
        break;
      case "lose":
        this.playLose();
        break;
      case "chip":
        this.playChipClink();
        break;
      case "card_shuffle":
        this.playCardShuffle();
        break;
      case "card_flip":
        this.playCardFlip();
        break;
      case "dice":
        this.playDiceRoll();
        break;
      case "vault":
        this.playVaultUnlock();
        break;
      case "coin":
        this.playCoinDrop();
        break;
      case "multiplier":
        this.playMultiplierPop(options?.multiplier ?? 1.0);
        break;
      case "bonus":
        this.playBonusFanfare();
        break;
      case "error":
        this.playError();
        break;
    }
  }
}

export const casinoAudio = new CasinoAudioService();

// Custom React Hook for Audio Controls & Reactive Audio State
export function useCasinoAudio() {
  const [isMuted, setIsMuted] = useState<boolean>(casinoAudio.isMuted());
  const [volume, setVolumeState] = useState<number>(casinoAudio.getVolume());
  const [isMusicPlaying, setIsMusicPlaying] = useState<boolean>(casinoAudio.getMusicPlayingState());

  const toggleMute = () => {
    const nextMuted = casinoAudio.toggleMute();
    setIsMuted(nextMuted);
  };

  const setVolume = (val: number) => {
    casinoAudio.setVolume(val);
    setVolumeState(val);
  };

  const toggleMusic = (force?: boolean) => {
    const playing = casinoAudio.toggleMusic(force);
    setIsMusicPlaying(playing);
  };

  return {
    isMuted,
    volume,
    isMusicPlaying,
    toggleMute,
    setVolume,
    toggleMusic,
    playSfx: (type: SfxType, options?: { duration?: number; pitch?: number; multiplier?: number }) => 
      casinoAudio.playSfx(type, options),
    playClick: () => casinoAudio.playClick(),
    playWin: () => casinoAudio.playWin(),
    playMegaWin: () => casinoAudio.playMegaWin(),
    playLose: () => casinoAudio.playLose(),
    playChipClink: () => casinoAudio.playChipClink(),
    playSpin: (duration?: number) => casinoAudio.playWheelSpin(duration),
    playCardShuffle: () => casinoAudio.playCardShuffle(),
    playCardFlip: () => casinoAudio.playCardFlip(),
    playDiceRoll: () => casinoAudio.playDiceRoll(),
    playVaultUnlock: () => casinoAudio.playVaultUnlock(),
    playCoinDrop: () => casinoAudio.playCoinDrop(),
    playMultiplierPop: (mult?: number) => casinoAudio.playMultiplierPop(mult),
    playBonusFanfare: () => casinoAudio.playBonusFanfare(),
    playError: () => casinoAudio.playError(),
  };
}

