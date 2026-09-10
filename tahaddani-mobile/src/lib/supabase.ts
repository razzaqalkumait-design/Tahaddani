import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { StorageKeys, secureStorage } from './storage';

/**
 * The single Supabase client for the app: auth, data, realtime and storage all
 * go through here. The session lives in the Keychain via `secureStorage`.
 */
export const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    storage: secureStorage,
    storageKey: StorageKeys.authSession,
    autoRefreshToken: true,
    persistSession: true,
    // No URL to parse on native; deep links are handled explicitly.
    detectSessionInUrl: false,
  },
});

/**
 * Supabase refreshes tokens on a timer that iOS suspends in the background.
 * Tying the timer to foreground state keeps sessions alive across app switches.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    void supabase.auth.startAutoRefresh();
    return;
  }
  void supabase.auth.stopAutoRefresh();
});
