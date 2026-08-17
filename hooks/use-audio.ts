'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/game-store';

export type SoundType = 'dig' | 'nugget' | 'levelup' | 'purchase' | 'error' | 'coin' | 'streak';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
}

const SOUND_CONFIG: Record<SoundType, SoundConfig> = {
  dig: { frequency: 180, duration: 0.08, type: 'triangle', volume: 0.25 },
  nugget: { frequency: 950, duration: 0.12, type: 'sine', volume: 0.35 },
  levelup: { frequency: 523.25, duration: 0.4, type: 'sine', volume: 0.4 },
  purchase: { frequency: 659.25, duration: 0.2, type: 'sine', volume: 0.3 },
  error: { frequency: 110, duration: 0.25, type: 'sawtooth', volume: 0.2 },
  coin: { frequency: 1320, duration: 0.08, type: 'sine', volume: 0.35 },
  streak: { frequency: 880, duration: 0.3, type: 'sine', volume: 0.3 },
};

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const vibrationEnabled = useGameStore((state) => state.vibrationEnabled);

  // Lazy initialize AudioContext on user interaction
  const initAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    if (!audioContextRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      } catch (e) {
        console.warn('Web Audio API not supported in this browser.', e);
      }
    }
    
    // Resume context if suspended (browser security autoplays)
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    return audioContextRef.current;
  }, []);

  // Play synthesized audio using Web Audio API oscillators
  const playSound = useCallback((type: SoundType) => {
    if (!soundEnabled) return;

    const ctx = initAudioContext();
    if (!ctx) return;

    const config = SOUND_CONFIG[type];
    if (!config) return;

    try {
      if (type === 'levelup') {
        // Satisfaction overload! Escalating scale chime
        const frequencies = [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6
        frequencies.forEach((freq, idx) => {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.25);
          }, idx * 100);
        });
      } else if (type === 'streak') {
        // Arpeggiating chord
        const notes = [440, 554, 659, 880];
        notes.forEach((freq, idx) => {
          setTimeout(() => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
          }, idx * 60);
        });
      } else {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = config.type;
        oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);

        // Quick ramp up and exponential decay
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(config.volume, ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + config.duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + config.duration);
      }
    } catch (e) {
      console.error('Audio synthesizer play error:', e);
    }
  }, [soundEnabled, initAudioContext]);

  // Satisfying customized pickaxe swing sound with secondary sparkle sound potential
  const playDigSound = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = initAudioContext();
    if (!ctx) return;

    try {
      // 1. Core strike sound (metal pick hitting stone)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(160, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.06);
      
      gain1.gain.setValueAtTime(0.2, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.08);

      // 2. Click slap (satisfying high impact)
      const oscSlap = ctx.createOscillator();
      const gainSlap = ctx.createGain();
      
      oscSlap.type = 'sawtooth';
      oscSlap.frequency.setValueAtTime(400, ctx.currentTime);
      oscSlap.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.03);
      
      gainSlap.gain.setValueAtTime(0.1, ctx.currentTime);
      gainSlap.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
      
      oscSlap.connect(gainSlap);
      gainSlap.connect(ctx.destination);
      
      oscSlap.start(ctx.currentTime);
      oscSlap.stop(ctx.currentTime + 0.03);

      // 3. Rare gold glitter chime sound (35% chance on clicks)
      if (Math.random() < 0.35) {
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(900 + Math.random() * 400, ctx.currentTime);
          
          gain2.gain.setValueAtTime(0.15, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
          
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          
          osc2.start(ctx.currentTime);
          osc2.stop(ctx.currentTime + 0.12);
        }, 30);
      }
    } catch (e) {
      console.error('Pickaxe sound play error:', e);
    }
  }, [soundEnabled, initAudioContext]);

  // Tactile phone/tablet browser vibration haptics
  const vibrate = useCallback((pattern: number | number[] = [25]) => {
    if (!vibrationEnabled || typeof navigator === 'undefined') return;
    
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        // Non-blocking catch
      }
    }
  }, [vibrationEnabled]);

  // Custom dual-pulse vibration feedback specifically designed for mining strike clicks
  const digVibrate = useCallback(() => {
    if (!vibrationEnabled || typeof navigator === 'undefined') return;
    
    if ('vibrate' in navigator) {
      try {
        // Short, highly-satisfying vibration pulse
        navigator.vibrate([15, 8, 20]);
      } catch (e) {
        // Non-blocking catch
      }
    }
  }, [vibrationEnabled]);

  const digFeedback = useCallback(() => {
    playDigSound();
    digVibrate();
  }, [playDigSound, digVibrate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    playSound,
    playDigSound,
    vibrate,
    digVibrate,
    digFeedback,
    initAudioContext,
  };
}
