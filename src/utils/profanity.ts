// Normalise a string so leet-speak / diacritics don't bypass the filter
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ý]/g, 'y')
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[5$]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[8]/g, 'b')
    .replace(/[-_.]/g, '')
    .trim();
}

// Core blocked terms — English + Arabic
const BLOCKED: string[] = [
  // English
  'fuck', 'fuk', 'fck', 'shit', 'sht', 'cunt', 'cnt', 'nigger', 'nigga',
  'faggot', 'fag', 'bitch', 'btch', 'asshole', 'ass', 'bastard',
  'cock', 'dick', 'pussy', 'penis', 'vagina', 'anal', 'anus',
  'whore', 'slut', 'rape', 'rapist', 'pedo', 'pedophile',
  'nazi', 'hitler', 'retard', 'retarded', 'spastic',
  'wanker', 'twat', 'prick', 'bellend', 'tosser',
  // Arabic (transliterated & Arabic script)
  'koos', 'kus', 'kos', 'kes',
  'ayr', 'air', 'eir',
  'zebi', 'zeby', 'zib',
  'sharmoota', 'sharmota', 'shrmota',
  'ibn el sharmoota', 'ibn alsharmoota',
  'kalb', 'kelb',
  'khawal', 'khwal',
  'ibn el metnak', 'metnaka', 'metnak',
  'كس', 'كوس', 'طيز', 'زب', 'زبي', 'شرموطة', 'شرموطه',
  'خول', 'كلب', 'حمار', 'خنزير', 'منيوك', 'منيك',
  'عرص', 'متناك', 'قحبة', 'قحبه', 'لوطي', 'سكس',
];

// Exact-match check on normalised value
export function isBadWord(raw: string): boolean {
  const n = normalise(raw);
  return BLOCKED.some(term => {
    const t = normalise(term);
    return n === t || n.includes(t);
  });
}

export function validateDisplayName(name: string): string | null {
  if (isBadWord(name)) return 'الاسم يحتوي على كلمات غير مناسبة';
  return null;
}

export function validateUsername(username: string): string | null {
  if (isBadWord(username)) return 'اسم المستخدم يحتوي على كلمات غير مناسبة';
  return null;
}
