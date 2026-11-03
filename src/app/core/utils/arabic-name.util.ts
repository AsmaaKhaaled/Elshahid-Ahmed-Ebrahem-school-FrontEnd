/**
 * Helper utilities to extract a clean two-part name (الاسم الثنائي) from Arabic full names,
 * skipping honorific titles (أ. د., م., الأستاذ, المهندس, إلخ) and preserving compound names.
 */

const TITLE_PREFIXES = new Set([
  'أ', 'د', 'م',
  'أ.', 'د.', 'م.',
  'أ/', 'د/', 'م/',
  'أستاذ', 'أستاذة',
  'الأستاذ', 'الأستاذة',
  'الاستاذ', 'الاستاذة',
  'دكتور', 'دكتورة',
  'الدكتور', 'الدكتورة',
  'مهندس', 'مهندسة',
  'المهندس', 'المهندسة',
  'شيخ', 'الشيخ'
]);

const COMPOUND_PREFIXES = new Set([
  'عبد',
  'نور',
  'سيف',
  'عز',
  'صلاح',
  'علاء',
  'بهاء',
  'جمال',
  'ضياء',
  'شمس',
  'حسام',
  'تقي',
  'منة'
]);

export function getArabicTwoPartName(fullName: string | null | undefined): string {
  if (!fullName?.trim()) return 'المستخدم';
  const clean = fullName.trim();

  // Split tokens, ignoring lone slashes or dashes
  const tokens = clean
    .split(/\s+/)
    .filter(t => t && t !== '/' && t !== '-');

  // Strip leading honorific titles
  let startIndex = 0;
  while (startIndex < tokens.length) {
    const raw = tokens[startIndex];
    const stripped = raw.replace(/[./\\]/g, '');
    if (TITLE_PREFIXES.has(raw) || TITLE_PREFIXES.has(stripped)) {
      startIndex++;
    } else {
      break;
    }
  }

  const nameTokens = tokens.slice(startIndex);
  if (nameTokens.length === 0) {
    return tokens.slice(0, 2).join(' ') || 'المستخدم';
  }
  if (nameTokens.length === 1) {
    return nameTokens[0];
  }

  const parts: string[] = [];
  let i = 0;
  while (i < nameTokens.length && parts.length < 2) {
    const current = nameTokens[i];
    const next = nameTokens[i + 1];
    if (COMPOUND_PREFIXES.has(current) && next) {
      parts.push(`${current} ${next}`);
      i += 2;
    } else {
      parts.push(current);
      i++;
    }
  }

  return parts.join(' ');
}

export function getArabicInitial(fullName: string | null | undefined): string {
  const twoPart = getArabicTwoPartName(fullName);
  return twoPart ? twoPart.charAt(0) : 'م';
}

