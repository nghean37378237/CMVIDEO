import { BgmTrack } from '../types';

/**
 * Web Audio API procedural soundtrack generator for stitched videos
 * Provides cinematic background music tracks without external audio dependencies or copyright issues
 */
export class ProceduralBgmEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private masterGain: GainNode | null = null;
  private loopInterval: any = null;

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.destinationNode = this.ctx.createMediaStreamDestination();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.5;

      // Connect to both speakers (destination) and recorder destination
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.destinationNode);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  getMediaStream(): MediaStream | null {
    this.init();
    return this.destinationNode ? this.destinationNode.stream : null;
  }

  setVolume(val: number) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, val)), this.ctx?.currentTime || 0);
    }
  }

  startTrack(track: BgmTrack) {
    this.stop();
    if (track === 'none') return;
    this.init();
    if (!this.ctx || !this.masterGain) return;

    this.isPlaying = true;

    // Define harmonic progressions based on chosen track style
    if (track === 'epic') {
      // Dm - Bb - F - C (Epic cinematic Hollywood progression)
      const chords = [
        [146.83, 220.0, 261.63, 349.23], // Dm
        [116.54, 233.08, 293.66, 349.23], // Bb
        [174.61, 220.0, 261.63, 349.23], // F
        [130.81, 196.0, 261.63, 329.63], // C
      ];
      this.playChordSequence(chords, 2.5, 'sawtooth', 0.15, true);
    } else if (track === 'action') {
      // Fast pulsing bass + synth arp
      const chords = [
        [110.0, 164.81, 220.0], // A minor
        [98.0, 146.83, 196.0],  // G
        [116.54, 174.61, 233.08], // Bb
        [110.0, 164.81, 220.0], // A minor
      ];
      this.playPulsingSequence(chords, 1.2, 'square', 0.12);
    } else if (track === 'emotional') {
      // Gentle cinematic piano/warm strings
      const chords = [
        [130.81, 196.0, 246.94, 329.63], // Cmaj7
        [110.0, 164.81, 220.0, 261.63], // Am
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [146.83, 196.0, 246.94, 293.66], // G
      ];
      this.playChordSequence(chords, 3.0, 'sine', 0.2, false);
    } else if (track === 'synth') {
      // 80s Cyberpunk synth wave
      const chords = [
        [130.81, 196.0, 261.63, 392.0], // C
        [146.83, 220.0, 293.66, 440.0], // Dm
        [164.81, 246.94, 329.63, 493.88], // Em
        [174.61, 220.0, 261.63, 349.23], // F
      ];
      this.playChordSequence(chords, 2.0, 'triangle', 0.18, true);
    }
  }

  private playChordSequence(chords: number[][], durationPerChord: number, wave: OscillatorType, gainVol: number, withDrum: boolean) {
    if (!this.ctx || !this.masterGain) return;

    let step = 0;
    const playNext = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const currentChord = chords[step % chords.length];

      // Play soft chord oscillators
      currentChord.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, now);

        // Soft envelope attack & decay
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(gainVol * (1 - idx * 0.15), now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + durationPerChord - 0.05);

        // Lowpass filter for smooth warmth
        const filter = this.ctx!.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(idx === 0 ? 300 : 1200, now);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + durationPerChord);
      });

      // Optional cinematic kick/impact drum
      if (withDrum) {
        this.triggerCinematicImpact(now);
      }

      step++;
    };

    playNext();
    this.loopInterval = setInterval(playNext, durationPerChord * 1000);
  }

  private playPulsingSequence(chords: number[][], duration: number, wave: OscillatorType, gainVol: number) {
    if (!this.ctx || !this.masterGain) return;
    let step = 0;

    const playNext = () => {
      if (!this.isPlaying || !this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const chord = chords[step % chords.length];

      chord.forEach((freq) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = wave;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(gainVol, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.9);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now);
        osc.stop(now + duration);
      });

      this.triggerCinematicImpact(now);
      step++;
    };

    playNext();
    this.loopInterval = setInterval(playNext, duration * 1000);
  }

  private triggerCinematicImpact(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(35, time + 0.35);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.45);
  }

  stop() {
    this.isPlaying = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }
}
