/**
 * The app ships Arabic only today. Strings are read through this module so a
 * second locale is a map lookup rather than a sweep through every component.
 */
import { ar } from './ar';

export const strings = ar;
export { ar };
export type { Strings } from './ar';

/** Tiny template helper for the few strings carrying a runtime name. */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}
