import * as SecureStore from 'expo-secure-store';
import { secureStorage } from '../storage';

jest.mock('expo-secure-store');
jest.mock('../../config/env', () => ({ config: { isDevelopment: false } }));

/** In-memory stand-in for the Keychain. */
function installFakeStore(): Map<string, string> {
  const store = new Map<string, string>();

  jest.mocked(SecureStore.getItemAsync).mockImplementation(async (key: string) => store.get(key) ?? null);
  jest.mocked(SecureStore.setItemAsync).mockImplementation(async (key: string, value: string) => {
    // The real SecureStore rejects values above 2048 bytes.
    if (value.length > 2048) throw new Error('value too large');
    store.set(key, value);
  });
  jest.mocked(SecureStore.deleteItemAsync).mockImplementation(async (key: string) => {
    store.delete(key);
  });

  return store;
}

describe('secureStorage', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = installFakeStore();
  });

  it('returns null for a key that was never written', async () => {
    expect(await secureStorage.getItem('missing')).toBeNull();
  });

  it('round-trips a short value', async () => {
    await secureStorage.setItem('ta_auth', 'small-token');
    expect(await secureStorage.getItem('ta_auth')).toBe('small-token');
  });

  it('round-trips a session larger than the 2048-byte SecureStore limit', async () => {
    const session = 'x'.repeat(7000);
    await secureStorage.setItem('ta_auth', session);

    const restored = await secureStorage.getItem('ta_auth');
    expect(restored).toBe(session);
    expect(restored).toHaveLength(7000);
  });

  it('keeps every individual chunk under the SecureStore limit', async () => {
    await secureStorage.setItem('ta_auth', 'y'.repeat(9000));

    for (const [key, value] of store) {
      if (key === 'ta_auth') continue; // header holds the chunk count
      expect(value.length).toBeLessThanOrEqual(2048);
    }
  });

  it('treats a torn write with a missing chunk as absent rather than returning a partial session', async () => {
    await secureStorage.setItem('ta_auth', 'z'.repeat(5000));
    store.delete('ta_auth__c1');

    expect(await secureStorage.getItem('ta_auth')).toBeNull();
  });

  it('does not leave stale chunks behind when a long value is replaced by a short one', async () => {
    await secureStorage.setItem('ta_auth', 'a'.repeat(6000));
    await secureStorage.setItem('ta_auth', 'short');

    expect(await secureStorage.getItem('ta_auth')).toBe('short');
    expect(store.has('ta_auth__c2')).toBe(false);
  });

  it('clears the value on removal', async () => {
    await secureStorage.setItem('ta_auth', 'b'.repeat(4000));
    await secureStorage.removeItem('ta_auth');

    expect(await secureStorage.getItem('ta_auth')).toBeNull();
    expect(store.size).toBe(0);
  });
});
