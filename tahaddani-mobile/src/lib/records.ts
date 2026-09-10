/**
 * Local game records, ported from the web build's RecordsOverlay.
 *
 * Records are a device-local journal of finished matches (most recent first,
 * capped at 50), keyed through the async app storage.
 */
import { StorageKeys, appStorage } from './storage';
import { logger } from './logger';

export interface GameRecord {
  id: string;
  mode: string;
  scores: { name: string; pts: number }[];
  time: string;
}

export async function getRecords(): Promise<GameRecord[]> {
  try {
    const raw = await appStorage.getJson<unknown>(StorageKeys.records, []);
    return Array.isArray(raw) ? (raw as GameRecord[]) : [];
  } catch (error) {
    logger.warn('Records read failed, starting fresh', { error: String(error) });
    return [];
  }
}

export async function saveRecord(record: GameRecord): Promise<void> {
  const records = await getRecords();
  const next = [record, ...records].slice(0, 50);
  await appStorage.setJson(StorageKeys.records, next);
}

/**
 * Same timestamp format as the web build (`ar-SA` short date + time). Some
 * runtimes lack the Hijri `ar-SA` calendar, so fall back to Gregorian `ar`.
 */
export function formatRecordTime(now: Date = new Date()): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  try {
    return now.toLocaleString('ar-SA', options);
  } catch {
    return now.toLocaleString('ar', options);
  }
}

export const MODE_LABELS: Record<string, string> = {
  classicTeams: 'كلاسيك — فريقين',
  classicFfa: 'كلاسيك — الكل ضد الكل',
  classicTeamsHost: 'كلاسيك — مضيف',
  wickedTeams: 'خبيثة — فريقين',
  wickedFfa: 'خبيثة — الكل ضد الكل',
  wickedTeamsHost: 'خبيثة — مضيف',
  thirty: 'تحدي الثلاثين',
};
