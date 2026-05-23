import { create } from 'zustand';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  audioUrl: string;
  audioTitle: string;
  isLoaded: boolean;
  initialized: boolean;
  init: () => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  setVolume: (level: number) => void;
}

let globalAudio: HTMLAudioElement | null = null;

export const useAudioStore = create<AudioState>((set, get) => {
  // Setup audio listeners
  const setupAudioEventListeners = (audio: HTMLAudioElement) => {
    audio.addEventListener('play', () => {
      set({ isPlaying: true });
    });
    audio.addEventListener('pause', () => {
      set({ isPlaying: false });
    });
    audio.addEventListener('timeupdate', () => {
      set({ currentTime: audio.currentTime });
    });
    audio.addEventListener('durationchange', () => {
      if (!isNaN(audio.duration)) {
        set({ duration: audio.duration });
      }
    });
    audio.addEventListener('loadeddata', () => {
      set({ isLoaded: true });
      if (!isNaN(audio.duration)) {
        set({ duration: audio.duration });
      }
    });
    audio.addEventListener('ended', () => {
      set({ isPlaying: false, currentTime: 0 });
    });
  };

  return {
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.5,
    audioUrl: '',
    audioTitle: 'Nhạc nền hệ thống BMass',
    isLoaded: false,
    initialized: false,

    init: () => {
      if (get().initialized) return;

      // Only run in browser environment
      if (typeof window === 'undefined') return;

      globalAudio = new Audio();
      globalAudio.volume = get().volume;
      setupAudioEventListeners(globalAudio);

      // Listen to Firestore for changes
      onSnapshot(doc(db, 'settings', 'audio'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const currentUrl = get().audioUrl;
          const newUrl = data.musicUrl || '';
          const newTitle = data.title || 'Nhạc nền hệ thống BMass';

          if (newUrl && newUrl !== currentUrl) {
            set({ audioUrl: newUrl, audioTitle: newTitle, isLoaded: false });
            if (globalAudio) {
              const wasPlaying = get().isPlaying;
              globalAudio.src = newUrl;
              globalAudio.load();
              if (wasPlaying) {
                globalAudio.play().catch(() => {
                  set({ isPlaying: false });
                });
              }
            }
          } else if (!newUrl) {
            set({ audioUrl: '', audioTitle: 'Chưa cấu hình nhạc nền', isPlaying: false });
            if (globalAudio) {
              globalAudio.pause();
              globalAudio.src = '';
            }
          } else {
            set({ audioTitle: newTitle });
          }
        }
      });

      set({ initialized: true });
    },

    play: () => {
      if (globalAudio && get().audioUrl) {
        globalAudio.play().catch((err) => {
          console.warn('Audio play auto-block prevention active:', err);
        });
        set({ isPlaying: true });
      }
    },

    pause: () => {
      if (globalAudio) {
        globalAudio.pause();
        set({ isPlaying: false });
      }
    },

    toggle: () => {
      const { isPlaying, play, pause } = get();
      if (isPlaying) {
        pause();
      } else {
        play();
      }
    },

    seek: (seconds: number) => {
      if (globalAudio && !isNaN(seconds)) {
        globalAudio.currentTime = seconds;
        set({ currentTime: seconds });
      }
    },

    setVolume: (level: number) => {
      const clamped = Math.max(0, Math.min(1, level));
      if (globalAudio) {
        globalAudio.volume = clamped;
      }
      set({ volume: clamped });
    }
  };
});
