const UZ_PREFIX = "+998";
const UZ_LOCAL_DIGITS = 9;

// Foydalanuvchi kiritgan matndan O'zbekiston mobil raqamining 9 ta lokal
// raqamini ajratib oladi (masalan "998" yoki "+998" prefiksini olib tashlab).
export function extractUzDigits(value) {
  let digits = (value || "").replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  return digits.slice(0, UZ_LOCAL_DIGITS);
}

// "+998 (90) 123-45-67" ko'rinishida foydalanuvchiga ko'rsatiladigan format.
export function formatUzPhoneDisplay(digits) {
  let out = `${UZ_PREFIX} `;
  if (!digits) return out;
  out += `(${digits.slice(0, 2)}`;
  if (digits.length >= 2) out += ")";
  if (digits.length > 2) out += ` ${digits.slice(2, 5)}`;
  if (digits.length > 5) out += `-${digits.slice(5, 7)}`;
  if (digits.length > 7) out += `-${digits.slice(7, 9)}`;
  return out;
}

// Backendga yuboriladigan/saqlanadigan "toza" qiymat — hech qanday bo'shliq
// yoki qavs-tire bo'lmagan kanonik shakl: "+998901234567".
export function toCanonicalUzPhone(digits) {
  return digits ? `${UZ_PREFIX}${digits}` : "";
}

export function isCompleteUzPhone(value) {
  return extractUzDigits(value).length === UZ_LOCAL_DIGITS;
}

// Har qanday xom qiymatni (backenddan kelgan yoki eski formatdagi) o'qish
// uchun chiroyli ko'rinishga o'giradi; bo'sh bo'lsa bo'sh qatorni qaytaradi.
export function formatUzPhoneReadable(value) {
  const digits = extractUzDigits(value);
  return digits ? formatUzPhoneDisplay(digits) : "";
}
