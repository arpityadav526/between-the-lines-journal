export function normalizeAnswer(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[\p{P}\p{S}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
// Levenshtein distance <= 1, with no quadratic allocation.
export function oneTypo(a: string, b: string) {
  if (b.length <= 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    differences = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++differences > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return differences + Number(i < a.length || j < b.length) <= 1;
}
