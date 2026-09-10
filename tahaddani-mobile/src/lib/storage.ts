import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { logger } from './logger';

/**
 * Non-sensitive preferences (coin cache, subscription tier, unlocked packs).
 * Replaces the web build's `localStorage`; every call is async here.
 */
export const appStorage = {
  async getString(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      logger.error('appStorage.getString failed', error, { key });
      return null;
    }
  },

  async setString(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      logger.error('appStorage.setString failed', error, { key });
    }
  },

  async getNumber(key: string, fallback: number): Promise<number> {
    const raw = await appStorage.getString(key);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  },

  async getJson<T>(key: string, fallback: T): Promise<T> {
    const raw = await appStorage.getString(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch (error) {
      logger.warn('appStorage.getJson found malformed value, using fallback', { key });
      return fallback;
    }
  },

  async setJson(key: string, value: unknown): Promise<void> {
    await appStorage.setString(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logger.error('appStorage.remove failed', error, { key });
    }
  },
};

/**
 * Keychain-backed storage for the Supabase session.
 *
 * SecureStore caps a single value at 2048 bytes and a JWT pair can exceed that,
 * so values are split into numbered chunks with a small header recording the
 * count. Reads reassemble transparently.
 */
const CHUNK_SIZE = 1800;

function chunkKey(key: string, index: number): string {
  return `${key}__c${index}`;
}

async function readChunkCount(key: string): Promise<number> {
  const header = await SecureStore.getItemAsync(key);
  if (header === null) return 0;
  const count = Number(header);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const count = await readChunkCount(key);
      if (count === 0) return null;

      const chunks: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const chunk = await SecureStore.getItemAsync(chunkKey(key, index));
        // A missing chunk means a torn write; treat the whole value as absent.
        if (chunk === null) return null;
        chunks.push(chunk);
      }
      return chunks.join('');
    } catch (error) {
      logger.error('secureStorage.getItem failed', error, { key });
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await secureStorage.removeItem(key);

      const chunks: string[] = [];
      for (let start = 0; start < value.length; start += CHUNK_SIZE) {
        chunks.push(value.slice(start, start + CHUNK_SIZE));
      }

      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = chunks[index];
        if (chunk === undefined) continue;
        await SecureStore.setItemAsync(chunkKey(key, index), chunk);
      }
      await SecureStore.setItemAsync(key, String(chunks.length));
    } catch (error) {
      logger.error('secureStorage.setItem failed', error, { key });
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const count = await readChunkCount(key);
      for (let index = 0; index < count; index += 1) {
        await SecureStore.deleteItemAsync(chunkKey(key, index));
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      logger.error('secureStorage.removeItem failed', error, { key });
    }
  },
};

/** Storage keys, centralized so no string is retyped at a call site. */
export const StorageKeys = {
  coins: 'ta_coins',
  packs: 'ta_packs',
  subTier: 'ta_sub_tier',
  removeAds: 'ta_no_ads',
  removeAdsUntil: 'ta_no_ads_until',
  allPacksUntil: 'ta_all_packs_until',
  profilePrefix: 'ta_profile_v1_',
  authSession: 'ta_auth',
  records: 'ta_records',
  daily: 'ta_daily',
  gameStreak: 'ta_game_streak',
  xp: 'ta_xp',
} as const;

