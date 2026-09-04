export type PathaoCity = {
  name: string;
  aliases: string[];
  zones: { name: string; aliases: string[] }[];
};

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

export function foldLocation(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[০-৯]/g, (d) => BANGLA_DIGITS[d] ?? d)
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function entry(
  name: string,
  aliases: string[] = [],
): { name: string; aliases: string[] } {
  return { name, aliases };
}

function district(
  name: string,
  aliases: string[] = [],
  extraZones: { name: string; aliases: string[] }[] = [],
): PathaoCity {
  return {
    name,
    aliases,
    zones: [
      entry(`${name} Sadar`, ["sadar", name, ...aliases]),
      ...extraZones,
    ],
  };
}

/** Canonical Pathao city/zone names used in bulk-order CSVs (names, not IDs). */
export const PATHAO_CITIES: PathaoCity[] = [
  {
    name: "Dhaka",
    aliases: ["ঢাকা", "dhaka city", "dacca"],
    zones: [
      entry("Uttara", ["উত্তরা", "uttara east", "uttara west", "uttara sector"]),
      entry("Mirpur", ["মিরপুর", "mirpur 1", "mirpur 2", "mirpur 6", "mirpur 10", "mirpur 11", "mirpur 12", "mirpur-10"]),
      entry("Pallabi", ["পল্লবী"]),
      entry("Kafrul", ["কাফরুল"]),
      entry("Sher-E-Bangla Nagar", ["sher e bangla nagar", "agargaon", "আগারগাঁও"]),
      entry("Mohammadpur", ["মোহাম্মদপুর", "mohammad pur"]),
      entry("Adabor", ["আদাবর"]),
      entry("Dhanmondi", ["ধানমন্ডি", "dhanmondi 27", "dhanmondi 32"]),
      entry("Kalabagan", ["কলাবাগান"]),
      entry("New Market", ["নিউ মার্কেট", "azimpur"]),
      entry("Lalbagh", ["লালবাগ"]),
      entry("Chawkbazar", ["চকবাজার", "chak bazar"]),
      entry("Bangshal", ["বংশাল"]),
      entry("Kotwali", ["কোতোয়ালি", "old dhaka"]),
      entry("Sutrapur", ["সূত্রাপুর"]),
      entry("Gendaria", ["গেন্ডারিয়া"]),
      entry("Wari", ["ওয়ারী"]),
      entry("Jatrabari", ["যাত্রাবাড়ী", "jatra bari"]),
      entry("Demra", ["ডেমরা"]),
      entry("Shyampur", ["শ্যামপুর"]),
      entry("Kadamtali", ["কদমতলী"]),
      entry("Sabujbagh", ["সবুজবাগ", "sabujbag"]),
      entry("Khilgaon", ["খিলগাঁও"]),
      entry("Mugda", ["মুগদা", "mugdapara"]),
      entry("Motijheel", ["মতিঝিল"]),
      entry("Paltan", ["পল্টন", "bijoynagar"]),
      entry("Ramna", ["রমনা"]),
      entry("Shahbagh", ["শাহবাগ", "shahbag"]),
      entry("Eskaton", ["ইস্কাটন", "eskaton garden"]),
      entry("Malibagh", ["মালিবাগ", "malibag"]),
      entry("Moghbazar", ["মগবাজার"]),
      entry("Shantinagar", ["শান্তিনগর"]),
      entry("Kakrail", ["কাকরাইল"]),
      entry("Bailey Road", ["বেইলি রোড", "new baily road"]),
      entry("Elephant Road", ["এলিফ্যান্ট রোড"]),
      entry("Green Road", ["গ্রিন রোড"]),
      entry("Panthapath", ["পান্থপথ", "pantha path"]),
      entry("Kawran Bazar", ["কাওরান বাজার", "karwan bazar"]),
      entry("Farmgate", ["ফার্মগেট"]),
      entry("Tejgaon", ["তেজগাঁও", "tejgaon industrial"]),
      entry("Mohakhali", ["মহাখালী"]),
      entry("Gulshan", ["গুলশান", "gulshan 1", "gulshan 2", "gulshan-1", "gulshan-2"]),
      entry("Banani", ["বনানী"]),
      entry("Baridhara", ["বারিধারা", "baridhara dohs"]),
      entry("Bashundhara", ["বসুন্ধরা", "bashundhara r/a", "basundhara"]),
      entry("Badda", ["বাড্ডা", "middle badda", "north badda"]),
      entry("Rampura", ["রামপুরা"]),
      entry("Banasree", ["বনশ্রী"]),
      entry("Aftabnagar", ["আফতাবনগর"]),
      entry("Khilkhet", ["খিলক্ষেত"]),
      entry("Vatara", ["ভাটারা", "notun bazar"]),
      entry("Cantonment", ["ক্যান্টনমেন্ট", "dhaka cantonment"]),
      entry("Biman Bandar", ["বিমানবন্দর", "airport"]),
      entry("Dakshinkhan", ["দক্ষিণখান", "dakkhin khan"]),
      entry("Uttar Khan", ["উত্তরখান"]),
      entry("Turag", ["তুরাগ"]),
      entry("Savar", ["সাভার"]),
      entry("Ashulia", ["আশুলিয়া"]),
      entry("Keraniganj", ["কেরানীগঞ্জ"]),
      entry("Kamrangirchar", ["কামরাঙ্গীরচর"]),
      entry("Hazaribagh", ["হাজারীবাগ"]),
      entry("Darus Salam", ["দারুস সালাম"]),
      entry("Nikunja", ["নিকুঞ্জ"]),
      entry("Niketan", ["নিকেতন", "gulshan niketan"]),
      entry("DOHS Mirpur", ["mirpur dohs"]),
      entry("DOHS Mohakhali", ["mohakhali dohs"]),
      entry("DOHS Banani", ["banani dohs"]),
    ],
  },
  {
    name: "Gazipur",
    aliases: ["গাজীপুর", "tongi", "টঙ্গী"],
    zones: [
      entry("Tongi", ["টঙ্গী"]),
      entry("Gazipur Sadar", ["gazipur sadar", "joydebpur"]),
      entry("Konabari", ["কোনাবাড়ী"]),
      entry("Board Bazar", ["বোর্ড বাজার"]),
      entry("Chandra", ["চান্দ্রা"]),
    ],
  },
  {
    name: "Narayanganj",
    aliases: ["নারায়ণগঞ্জ", "narayangonj"],
    zones: [
      entry("Narayanganj Sadar", ["sadar"]),
      entry("Fatullah", ["ফতুল্লা"]),
      entry("Siddhirganj", ["সিদ্ধিরগঞ্জ"]),
      entry("Bandar", ["বন্দর"]),
    ],
  },
  {
    name: "Chittagong",
    aliases: ["চট্টগ্রাম", "chattogram", "ctg", "chittagong city"],
    zones: [
      entry("Agrabad", ["আগ্রাবাদ"]),
      entry("GEC", ["gec circle"]),
      entry("Nasirabad", ["নাসিরাবাদ"]),
      entry("Pahartali", ["পাহাড়তলী"]),
      entry("Halishahar", ["হালিশহর"]),
      entry("Panchlaish", ["পাঁচলাইশ"]),
      entry("Khulshi", ["খুলশী"]),
      entry("Chawkbazar", ["চকবাজার"]),
      entry("Kotwali", ["কোতোয়ালি"]),
      entry("Double Mooring", ["ডবলমুরিং"]),
      entry("Patenga", ["পতেঙ্গা"]),
      entry("Chandgaon", ["চান্দগাঁও"]),
      entry("Bayezid", ["বায়েজিদ"]),
    ],
  },
  {
    name: "Sylhet",
    aliases: ["সিলেট"],
    zones: [
      entry("Zindabazar", ["জিন্দাবাজার"]),
      entry("Amberkhana", ["আম্বরখানা"]),
      entry("Shahjalal Upashahar", ["upashahar", "uposhahar"]),
      entry("Kumarpara", ["কুমারপাড়া"]),
      entry("Bandar Bazar", ["বন্দর বাজার"]),
      entry("South Surma", ["দক্ষিণ সুরমা"]),
    ],
  },
  {
    name: "Khulna",
    aliases: ["খুলনা"],
    zones: [
      entry("Sonadanga", ["সোনাডাঙ্গা"]),
      entry("Khalishpur", ["খালিশপুর"]),
      entry("Daulatpur", ["দৌলতপুর"]),
      entry("Khan Jahan Ali", ["খানজাহান আলী"]),
    ],
  },
  {
    name: "Rajshahi",
    aliases: ["রাজশাহী"],
    zones: [
      entry("Boalia", ["বোয়ালিয়া"]),
      entry("Rajpara", ["রাজপাড়া"]),
      entry("Motihar", ["মতিহার"]),
      entry("Shah Makhdum", ["শাহ মখদুম"]),
    ],
  },
  {
    name: "Rangpur",
    aliases: ["রংপুর"],
    zones: [entry("Rangpur Sadar", ["sadar"])],
  },
  {
    name: "Mymensingh",
    aliases: ["ময়মনসিংহ"],
    zones: [entry("Mymensingh Sadar", ["sadar"])],
  },
  {
    name: "Barisal",
    aliases: ["বরিশাল", "barishal"],
    zones: [entry("Barishal Sadar", ["sadar"])],
  },
  {
    name: "Cumilla",
    aliases: ["কুমিল্লা", "comilla"],
    zones: [entry("Cumilla Sadar", ["sadar"])],
  },
  {
    name: "Bogra",
    aliases: ["বগুড়া", "bogura"],
    zones: [entry("Bogura Sadar", ["sadar"])],
  },
  {
    name: "Cox's Bazar",
    aliases: ["কক্সবাজার", "coxs bazar", "cox bazar"],
    zones: [entry("Cox's Bazar Sadar", ["sadar", "kolatoli", "laboni"])],
  },
  district("Bagerhat", ["বাগেরহাট"]),
  district("Bandarban", ["বান্দরবান"]),
  district("Barguna", ["বরগুনা"]),
  district("B. Baria", ["brahmanbaria", "b baria", "bbaria", "ব্রাহ্মণবাড়িয়া", "brahman baria"]),
  district("Bhola", ["ভোলা"]),
  district("Chandpur", ["চাঁদপুর"]),
  district("Chapainawabganj", ["chapai nawabganj", "nawabganj", "চাঁপাইনবাবগঞ্জ"]),
  district("Chuadanga", ["চুয়াডাঙ্গা"]),
  district("Dinajpur", ["দিনাজপুর"]),
  district("Faridpur", ["ফরিদপুর"]),
  district("Feni", ["ফেনী"]),
  district("Gaibandha", ["গাইবান্ধা"]),
  district("Gopalgonj", ["gopalganj", "গোপালগঞ্জ"]),
  district("Habiganj", ["হবিগঞ্জ"]),
  district("Jamalpur", ["জামালপুর"]),
  district("Jashore", ["jessore", "যশোর"]),
  district("Jhalokathi", ["jhalokati", "ঝালকাঠি"]),
  district("Jhenidah", ["jhenaidah", "ঝিনাইদহ"]),
  district("Joypurhat", ["জয়পুরহাট"]),
  district("Khagrachari", ["খাগড়াছড়ি"]),
  district("Kishoreganj", ["কিশোরগঞ্জ"]),
  district("Kurigram", ["কুড়িগ্রাম"]),
  district("Kushtia", ["কুষ্টিয়া"]),
  district("Lakshmipur", ["লক্ষ্মীপুর"]),
  district("Lalmonirhat", ["লালমনিরহাট"]),
  district("Madaripur", ["মাদারীপুর"]),
  district("Magura", ["মাগুরা"]),
  district("Manikganj", ["মানিকগঞ্জ"]),
  district("Meherpur", ["মেহেরপুর"]),
  district("Moulvibazar", ["moulvi bazar", "maulvibazar", "মৌলভীবাজার"]),
  district("Munsiganj", ["munshiganj", "মুন্সিগঞ্জ"]),
  district("Naogaon", ["নওগাঁ"]),
  district("Narail", ["নড়াইল"]),
  district("Narshingdi", ["narsingdi", "নরসিংদী"]),
  district("Natore", ["নাটোর"]),
  district("Netrakona", ["netrokona", "নেত্রকোনা"]),
  district("Nilphamari", ["নীলফামারী"]),
  district("Noakhali", ["নোয়াখালী"]),
  district("Pabna", ["পাবনা"]),
  district("Panchagarh", ["পঞ্চগড়"]),
  district("Patuakhali", ["পটুয়াখালী"]),
  district("Pirojpur", ["পিরোজপুর"]),
  district("Rajbari", ["রাজবাড়ী"]),
  district("Rangamati", ["রাঙ্গামাটি"]),
  district("Satkhira", ["সাতক্ষীরা"]),
  district("Shariatpur", ["শরীয়তপুর"]),
  district("Sherpur", ["শেরপুর"]),
  district("Sirajganj", ["সিরাজগঞ্জ"]),
  district("Sunamganj", ["সুনামগঞ্জ"]),
  district("Tangail", ["টাঙ্গাইল"]),
  district("Thakurgaon", ["ঠাকুরগাঁও", "thakur gaon"], [
    entry("Pirganj", ["pirgonj", "পীরগঞ্জ"]),
    entry("Baliadangi", ["বালিয়াডাঙ্গী"]),
    entry("Haripur", ["হরিপুর"]),
    entry("Ranisankail", ["রানীশংকৈল"]),
    entry("Ruhia", ["রুহিয়া"]),
  ]),
];

const CITY_INDEX = new Map<string, PathaoCity>();
const ZONE_INDEX: { city: PathaoCity; zoneName: string; folded: string }[] = [];

for (const city of PATHAO_CITIES) {
  CITY_INDEX.set(foldLocation(city.name), city);
  for (const alias of city.aliases) {
    CITY_INDEX.set(foldLocation(alias), city);
  }
  for (const zone of city.zones) {
    ZONE_INDEX.push({
      city,
      zoneName: zone.name,
      folded: foldLocation(zone.name),
    });
    for (const alias of zone.aliases) {
      ZONE_INDEX.push({
        city,
        zoneName: zone.name,
        folded: foldLocation(alias),
      });
    }
  }
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) {
    return Math.min(a.length, b.length) / Math.max(a.length, b.length);
  }
  const aTokens = new Set(a.split(" "));
  const bTokens = new Set(b.split(" "));
  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) overlap += 1;
  }
  if (overlap === 0) return 0;
  return (2 * overlap) / (aTokens.size + bTokens.size);
}

export function matchCity(raw: string | null | undefined): string | null {
  const folded = foldLocation(raw ?? "");
  if (!folded) return null;
  const exact = CITY_INDEX.get(folded);
  if (exact) return exact.name;

  for (const city of PATHAO_CITIES) {
    const names = [city.name, ...city.aliases].map(foldLocation).filter(Boolean);
    if (
      names.some(
        (name) =>
          folded === name ||
          folded.startsWith(`${name} `) ||
          folded.endsWith(` ${name}`) ||
          folded.includes(` ${name} `),
      )
    ) {
      return city.name;
    }
  }

  let best: { name: string; score: number } | null = null;
  for (const city of PATHAO_CITIES) {
    const candidates = [city.name, ...city.aliases].map(foldLocation);
    for (const candidate of candidates) {
      const score = similarity(folded, candidate);
      if (score >= 0.78 && (!best || score > best.score)) {
        best = { name: city.name, score };
      }
    }
  }
  return best?.name ?? null;
}

export function matchZone(
  raw: string | null | undefined,
  cityName?: string | null,
): { city: string; zone: string } | null {
  const folded = foldLocation(raw ?? "");
  if (!folded) return null;

  const cityHint = cityName ? matchCity(cityName) : null;
  const scoped = cityHint
    ? ZONE_INDEX.filter((row) => row.city.name === cityHint)
    : ZONE_INDEX;

  let best: { city: string; zone: string; score: number } | null = null;
  for (const row of scoped) {
    const score = similarity(folded, row.folded);
    if (score >= 0.78 && (!best || score > best.score)) {
      best = { city: row.city.name, zone: row.zoneName, score };
    }
  }
  if (best) return { city: best.city, zone: best.zone };

  if (cityHint) {
    return matchZone(raw, null);
  }
  return null;
}

export function resolveLocation(input: {
  city?: string | null;
  zone?: string | null;
  address?: string | null;
}): { city: string; zone: string } {
  const cityFromField = matchCity(input.city);
  const zoneHit = matchZone(input.zone, cityFromField ?? input.city);
  if (zoneHit) {
    return {
      city: cityFromField ?? zoneHit.city,
      zone: zoneHit.zone,
    };
  }

  const haystack = [input.address, input.zone, input.city]
    .filter(Boolean)
    .join(" ");
  const foldedHay = foldLocation(haystack);

  let zoneFromAddress: { city: string; zone: string; score: number } | null =
    null;
  for (const row of ZONE_INDEX) {
    if (!row.folded) continue;
    if (foldedHay.includes(row.folded) || similarity(foldedHay, row.folded) >= 0.85) {
      const score = row.folded.length;
      if (!zoneFromAddress || score > zoneFromAddress.score) {
        zoneFromAddress = {
          city: row.city.name,
          zone: row.zoneName,
          score,
        };
      }
    }
  }

  let cityFromAddress = cityFromField;
  if (!cityFromAddress) {
    for (const city of PATHAO_CITIES) {
      const names = [city.name, ...city.aliases].map(foldLocation);
      if (names.some((name) => name && foldedHay.includes(name))) {
        cityFromAddress = city.name;
        break;
      }
    }
  }

  return {
    city: cityFromAddress ?? zoneFromAddress?.city ?? "",
    zone: zoneFromAddress?.zone ?? sadarZone(cityFromAddress ?? zoneFromAddress?.city ?? ""),
  };
}

function sadarZone(cityName: string): string {
  if (!cityName) return "";
  const city = PATHAO_CITIES.find((row) => row.name === cityName);
  if (!city) return "";
  const sadar = city.zones.find(
    (zone) => foldLocation(zone.name) === foldLocation(`${cityName} Sadar`),
  );
  return sadar?.name ?? "";
}

export function cityNamesForPrompt(): string {
  return PATHAO_CITIES.map((city) => city.name).join(", ");
}

export function zoneNamesForPrompt(cityName?: string | null): string {
  const city = cityName
    ? PATHAO_CITIES.find((row) => row.name === matchCity(cityName))
    : null;
  const zones = city
    ? city.zones
    : PATHAO_CITIES.flatMap((row) => row.zones);
  const unique = [...new Set(zones.map((zone) => zone.name))];
  return unique.slice(0, 80).join(", ");
}

/** Compact Pathao city → zone list for vision and location prompts. */
export function locationCatalogForPrompt(): string {
  return PATHAO_CITIES.map(
    (city) => `${city.name}: ${city.zones.map((zone) => zone.name).join(", ")}`,
  ).join("\n");
}
