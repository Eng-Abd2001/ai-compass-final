import { toWestDigits } from "./text";

export type Country = { cc: string; ar: string; en: string };
export const COUNTRIES: readonly Country[] = [
  { cc: "966", ar: "السعودية", en: "Saudi Arabia" }, { cc: "971", ar: "الإمارات", en: "United Arab Emirates" }, { cc: "20", ar: "مصر", en: "Egypt" },
  { cc: "962", ar: "الأردن", en: "Jordan" }, { cc: "965", ar: "الكويت", en: "Kuwait" }, { cc: "974", ar: "قطر", en: "Qatar" },
  { cc: "973", ar: "البحرين", en: "Bahrain" }, { cc: "968", ar: "عُمان", en: "Oman" }, { cc: "964", ar: "العراق", en: "Iraq" },
  { cc: "961", ar: "لبنان", en: "Lebanon" }, { cc: "963", ar: "سوريا", en: "Syria" }, { cc: "970", ar: "فلسطين", en: "Palestine" },
  { cc: "967", ar: "اليمن", en: "Yemen" }, { cc: "212", ar: "المغرب", en: "Morocco" }, { cc: "213", ar: "الجزائر", en: "Algeria" },
  { cc: "216", ar: "تونس", en: "Tunisia" }, { cc: "218", ar: "ليبيا", en: "Libya" }, { cc: "249", ar: "السودان", en: "Sudan" },
  { cc: "90", ar: "تركيا", en: "Türkiye" }, { cc: "44", ar: "المملكة المتحدة", en: "United Kingdom" }, { cc: "1", ar: "أمريكا وكندا", en: "USA & Canada" },
  { cc: "33", ar: "فرنسا", en: "France" }, { cc: "49", ar: "ألمانيا", en: "Germany" }, { cc: "91", ar: "الهند", en: "India" }, { cc: "92", ar: "باكستان", en: "Pakistan" },
];

/** Digits only (Arabic-Indic digits included). */
export const digitsOf = (s: string): string => toWestDigits(s).replace(/\D/g, "");

/**
 * Builds the full international number. If the input already starts with + or 00 it is used as typed;
 * otherwise the country code is added and a leading national 0 is removed.
 */
export function fullNumber(cc: string, input: string): string {
  const raw = toWestDigits(input).trim();
  if (raw.startsWith("+")) return digitsOf(raw);
  if (raw.startsWith("00")) return digitsOf(raw).slice(2);
  const d = digitsOf(raw).replace(/^0+/, "");
  return d.startsWith(cc) && d.length > cc.length + 6 ? d : cc + d;
}
export const validPhone = (digits: string): boolean => digits.length >= 8 && digits.length <= 15;
export const waLink = (digits: string, text: string): string => `https://wa.me/${digits}${text.trim() ? `?text=${encodeURIComponent(text)}` : ""}`;
export const tgPhoneLink = (digits: string): string => `https://t.me/+${digits}`;
export const tgUserLink = (user: string, text: string): string => `https://t.me/${user.replace(/^@/, "")}${text.trim() ? `?text=${encodeURIComponent(text)}` : ""}`;
export const validTgUser = (u: string): boolean => /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/.test(u.trim());
