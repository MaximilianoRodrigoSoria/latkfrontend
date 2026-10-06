import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Preferences {
  popups: boolean;
  achievements: boolean;
  sound: boolean;
  tourSound: boolean;
  set: (key: 'popups' | 'achievements' | 'sound' | 'tourSound', value: boolean) => void;
}

export const useNotificationPreferences = create<Preferences>()(
  persist(
    (set) => ({
      popups: true,
      achievements: true,
      sound: false,
      tourSound: true,
      set: (key, value) => set({ [key]: value }),
    }),
    { name: 'latk-notification-preferences' },
  ),
);

let audio: AudioContext | undefined;
/** Se habilita desde una interacción: los navegadores requieren permiso para reproducir audio. */
export function unlockAchievementSound() {
  try {
    audio ??= new AudioContext();
    void audio.resume().catch(() => {});
  } catch {
    /* El aviso visual sigue funcionando sin audio. */
  }
}

export function playAchievementSound() {
  if (!useNotificationPreferences.getState().sound || audio?.state !== 'running') return;
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = audio!.createOscillator();
    const volume = audio!.createGain();
    const start = audio!.currentTime + index * 0.12;
    oscillator.frequency.value = frequency;
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(0.08, start + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
    oscillator.connect(volume);
    volume.connect(audio!.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.32);
    oscillator.onended = () => {
      oscillator.disconnect();
      volume.disconnect();
    };
  });
}

/** Short, quiet cue for guided steps, separate from achievement sounds. */
export function playTourStepSound() {
  if (!useNotificationPreferences.getState().tourSound || audio?.state !== 'running') return;
  try {
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    const start = audio.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, start);
    oscillator.frequency.exponentialRampToValueAtTime(880, start + 0.08);
    volume.gain.setValueAtTime(0, start);
    volume.gain.linearRampToValueAtTime(0.025, start + 0.01);
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.onended = () => {
      oscillator.disconnect();
      volume.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + 0.12);
  } catch {
    // A browser that blocks audio must not interrupt the guide.
  }
}
