/**
 * Cleans national IDs & phone numbers as they are typed or pasted, the same way the backend stores them:
 * Arabic digits (٠-٩) become 0-9, and spaces / dashes / dots are removed.
 */

export const toLatinDigits = (value: string): string =>
  value
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06f0));

const stripSeparators = (value: string): string =>
  toLatinDigits(value ?? '').replace(/[\s\-.​-\u200F\u202A-\u202E\u2066-\u2069﻿]/g, '');

export const normalizeNationalId = (value: string): string => stripSeparators(value);

/** '+20 101 234 5678' / '00201012345678' / '1012345678' -> '01012345678' */
export const normalizePhone = (value: string): string => {
  let phone = stripSeparators(value).replace(/^\+/, '');
  if (/^0020\d{10}$/.test(phone)) phone = `0${phone.slice(4)}`;
  else if (/^20\d{10}$/.test(phone)) phone = `0${phone.slice(2)}`;
  else if (/^1\d{9}$/.test(phone)) phone = `0${phone}`;
  return phone;
};
