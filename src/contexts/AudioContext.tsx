import { createContext, useEffect, useRef, useState } from 'react';

// ─── Audio context ────────────────────────────────────
export interface AudioState { musicOn: boolean; setMusicOn: (v: boolean) => void; volume: number; setVolume: (v: number) => void; }
export const AudioCtx = createContext<AudioState>({ musicOn: true, setMusicOn: () => {}, volume: 70, setVolume: () => {} });

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [musicOn, setMusicOn] = useState(() => localStorage.getItem('ta_music') !== 'off');
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('ta_volume') ?? 70));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playingRef = useRef(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume / 100;
    if (musicOn) {
      if (!playingRef.current) {
        playingRef.current = true;
        el.play().catch(() => { playingRef.current = false; });
      }
    } else {
      playingRef.current = false;
      el.pause();
    }
  }, [musicOn, volume]);

  const setMusicOnPersist = (v: boolean) => { localStorage.setItem('ta_music', v ? 'on' : 'off'); setMusicOn(v); };
  const setVolumePersist = (v: number) => { localStorage.setItem('ta_volume', String(v)); setVolume(v); };

  return (
    <AudioCtx.Provider value={{ musicOn, setMusicOn: setMusicOnPersist, volume, setVolume: setVolumePersist }}>
      <audio
        ref={audioRef}
        src="/music/background.mp3"
        loop
        preload="auto"
        style={{ display: 'none' }}
        onEnded={() => { playingRef.current = false; }}
      />
      {children}
    </AudioCtx.Provider>
  );
}

