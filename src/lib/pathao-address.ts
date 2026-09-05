import { foldLocation, matchCity, matchCityToken, PATHAO_CITIES } from "@/lib/pathao-locations";

const MAX_ADDRESS_LENGTH = 220;

const BANGLA_DIGITS: Record<string, string> = {
  "০": "0",
  "১": "1",
  "২": "2",
  "৩": "3",
  "৪": "4",
  "৫": "5",
  "৬": "6",
  "৭": "7",
  "৮": "8",
  "৯": "9",
};

function latinDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] ?? d);
}

export function tidyAddress(value: string): string {
  return latinDigits(value)
    .replace(/\s*,\s*/g, ", ")
    .replace(/,{2,}/g, ",")
    .replace(/\s+/g, " ")
    .replace(/^,+\s*|,+\s*$/g, "")
    .trim();
}

export function expandAddressAbbreviations(value: string): string {
  return tidyAddress(value)
    .replace(/\bH(?:ouse)?[.\-\s]*(\d+)/gi, "House $1")
    .replace(/\bR(?:oad)?[.\-\s]*(\d+)/gi, "Road $1")
    .replace(/\bS(?:ector)?[.\-\s]*(\d+)/gi, "Sector $1")
    .replace(/\bBlk(?:ock)?[.\-\s]*(\d+)/gi, "Block $1")
    .replace(/\bBlock[.\-\s]*(\d+)/gi, "Block $1");
}

export function addressContainsName(address: string, name: string | null | undefined): boolean {
  const needle = foldLocation(name ?? "");
  if (!needle) return false;
  const haystack = foldLocation(address);
  if (!haystack) return false;
  return (
    haystack === needle ||
    haystack.startsWith(`${needle} `) ||
    haystack.endsWith(` ${needle}`) ||
    haystack.includes(` ${needle} `)
  );
}

export function clampAddressKeepingTail(value: string, max = MAX_ADDRESS_LENGTH): string {
  const trimmed = tidyAddress(value);
  if (trimmed.length <= max) return trimmed;
  const tail = trimmed.slice(trimmed.length - max);
  const cut = tail.replace(/^[^,]*?,\s*/, "");
  return (cut || tail).slice(0, max);
}

export function explicitCityFromText(value: string | null | undefined): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const part = parts[i];
    if (part.split(/\s+/).length > 4) continue;
    const hit = matchCityToken(part);
    if (hit) return hit;
  }
  return matchCityToken(text);
}

function cityLabels(cityName: string): string[] {
  const city = PATHAO_CITIES.find((row) => row.name === cityName);
  return city ? [city.name, ...city.aliases] : [cityName];
}

export function citiesMentionedIn(source: string): string[] {
  return PATHAO_CITIES.filter((city) =>
    [city.name, ...city.aliases].some((label) => addressContainsName(source, label)),
  ).map((city) => city.name);
}

function addressHasCity(address: string, cityName: string): boolean {
  return cityLabels(cityName).some((label) => addressContainsName(address, label));
}

function removePhrase(text: string, phrase: string): string {
  const needle = foldLocation(phrase);
  if (!needle) return text;
  const needleTokens = needle.split(" ").filter(Boolean);
  if (needleTokens.length === 0) return text;

  const segments = tidyAddress(text).split(/\s*,\s*/);
  const kept = segments
    .map((segment) => {
      const words = segment.split(/\s+/).filter(Boolean);
      const foldedWords = words.map((word) => foldLocation(word));
      const keep = words.map(() => true);
      for (let i = 0; i <= foldedWords.length - needleTokens.length; i += 1) {
        if (needleTokens.every((token, j) => foldedWords[i + j] === token)) {
          for (let j = 0; j < needleTokens.length; j += 1) keep[i + j] = false;
        }
      }
      return words.filter((_, index) => keep[index]).join(" ");
    })
    .filter(Boolean);
  return kept.join(", ");
}

/** Keep city/district names the source wrote; drop parent cities inferred from a thana/zone. */
export function alignCitiesToSource(source: string, formatted: string): string {
  const mentioned = new Set(citiesMentionedIn(source));
  const phrases = PATHAO_CITIES.flatMap((city) =>
    mentioned.has(city.name) ? [] : [city.name, ...city.aliases],
  ).sort((a, b) => foldLocation(b).length - foldLocation(a).length);

  let next = formatted;
  for (const phrase of phrases) {
    next = removePhrase(next, phrase);
  }
  next = tidyAddress(next);
  for (const city of mentioned) {
    if (!addressHasCity(next, city)) {
      next = attachCityToAddress(next, city);
    }
  }
  return next;
}

export function attachCityToAddress(address: string, city: string | null | undefined): string {
  const typed = tidyAddress(city ?? "");
  if (!typed) return address;
  const canonical = matchCity(typed);
  const piece = canonical || typed;
  if (addressContainsName(address, piece) || addressContainsName(address, typed)) {
    return address;
  }
  return clampAddressKeepingTail(tidyAddress(`${address}, ${piece}`));
}

export function formatAddressForPathao(input: {
  address: string;
  city?: string | null;
  source?: string | null;
}): { raw: string; formatted: string } {
  const raw = tidyAddress(input.address);
  const source = tidyAddress(input.source || input.address);
  let formatted = expandAddressAbbreviations(raw);
  formatted = alignCitiesToSource(source, formatted);
  formatted = attachCityToAddress(formatted, input.city);
  formatted = clampAddressKeepingTail(formatted);
  return { raw: source || raw, formatted };
}
