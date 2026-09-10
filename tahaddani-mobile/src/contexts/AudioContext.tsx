import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { StorageKeys, appStorage } from '../lib/storage';
import { logger } from '../lib/logger';

/**
 * Audio context — the native twin of the web build's AudioContext.tsx.
 *
 * The web build loops `public/music/background.mp3` through a hidden
 * <audio> element with an on/off toggle and a 0–100 volume slider,
 * persisted under the keys `ta_music` / `ta_volume`. This port keeps the
 * exact same state shape, defaults (music on, volume 70) and persisted key
 * names; the mp3 is streamed from the deployed site (same asset the web
 * build serves) so no binary ships in the bundle.
 */
export interface AudioState {
  musicOn: boolean;
  setMusicOn: (v: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
}

export const AudioCtx = createContext<AudioState>({
  musicOn: true,
  setMusicOn: () => {},
  volume: 70,
  setVolume: () => {},
});

/** The web build's own background track, served from the deployed site. */
const BACKGROUND_MUSIC_URL = 'https://tahaddani.win/music/background.mp3';

export function AudioProvider({ children }: { children: ReactNode }) {
  const [musicOn, setMusicOnState] = useState(true);
  const [volume, setVolumeState] = useState(70);
  const [hydrated, setHydrated] = useState(false);

  const player = useAudioPlayer(BACKGROUND_MUSIC_URL);

  // Restore the persisted toggle/volume (same keys as the web build).
  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const musicRaw = await appStorage.getString(StorageKeys.music);
        const volumeRaw = await appStorage.getString(StorageKeys.volume);
        if (!active) return;
        setMusicOnState(musicRaw !== 'off'); // web: localStorage 'ta_music' !== 'off'
        const parsed = Number(volumeRaw ?? 70);
        setVolumeState(Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 70);
      } catch (error) {
        logger.warn('Audio prefs read failed, using defaults', { error: String(error) });
      } finally {
        if (active) setHydrated(true);
      }
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  // Playback mode (background music should keep playing under the lock screen).
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  // Apply volume + play/pause, mirroring the web AudioProvider effect.
  useEffect(() => {
    if (!hydrated) return;
    player.loop = true;
    player.volume = volume / 100;
    if (musicOn) {
      player.play();
    } else {
      player.pause();
    }
  }, [hydrated, musicOn, volume, player]);

  const setMusicOn = useCallback((v: boolean) => {
    setMusicOnState(v);
    void appStorage.setString(StorageKeys.music, v ? 'on' : 'off');
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(100, Math.max(0, v));
    setVolumeState(clamped);
    void appStorage.setString(StorageKeys.volume, String(clamped));
  }, []);

  const value = useMemo<AudioState>(
    () => ({ musicOn, setMusicOn, volume, setVolume }),
    [musicOn, setMusicOn, volume, setVolume],
  );

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}

export function useAudio(): AudioState {
  return useContext(AudioCtx);
}
