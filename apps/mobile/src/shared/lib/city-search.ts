export interface City {
    id: string;
    /** The Ukrainian name, shown and saved. */
    name: string;
    region: string | null;
    population: number;
    latitude: number;
    longitude: number;
    /** Other spellings people type: Russian, English. */
    aliases: string[];
}

/** Lowercase, no apostrophes or hyphens, ё = е: "Кам'янець-Подільський" matches "кам янець подільський". */
export function normalizeForSearch(text: string): string {
    return text
        .toLowerCase()
        .replace(/[’'ʼ`´‘]/g, '')
        .replace(/[-–—_.,]/g, ' ')
        .replace(/ё/g, 'е')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Edit distance, giving up early once it must exceed `max`. */
function editDistance(a: string, b: string, max: number): number {
    if (Math.abs(a.length - b.length) > max) return max + 1;

    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
        const current = [i];
        let rowMin = i;
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
            current.push(value);
            if (value < rowMin) rowMin = value;
        }
        if (rowMin > max) return max + 1;
        previous = current;
    }
    return previous[b.length];
}

const NO_MATCH = Number.POSITIVE_INFINITY;
const MIN_FUZZY_LENGTH = 3;

/** Lower is better: 0 starts with the query, 1 a word starts with it, 2 contains it, 3 close to it (a typo). */
function scoreName(name: string, query: string): number {
    if (name.startsWith(query)) return 0;
    if (name.split(' ').some((word) => word.startsWith(query))) return 1;
    if (name.includes(query)) return 2;

    if (query.length >= MIN_FUZZY_LENGTH) {
        const allowed = query.length <= 4 ? 1 : 2;
        // Compare with the start of the name and with each word, so a typo in a long name still matches.
        const candidates = [name, ...name.split(' ')];
        for (const candidate of candidates) {
            const head = candidate.slice(0, query.length);
            if (editDistance(query, head, allowed) <= allowed) return 3;
        }
    }
    return NO_MATCH;
}

export interface IndexedCity {
    city: City;
    names: string[];
}

export function indexCities(cities: City[]): IndexedCity[] {
    return cities.map((city) => ({ city, names: [city.name, ...city.aliases].map(normalizeForSearch) }));
}

/**
 * Cities matching the text, best first; with no text, every city with the biggest first.
 * Ties are broken by population so "Київ" comes before a village-sized namesake.
 */
export function searchCities(index: IndexedCity[], text: string): City[] {
    const query = normalizeForSearch(text);

    if (!query) {
        return index.map((entry) => entry.city).sort((a, b) => b.population - a.population || a.name.localeCompare(b.name, 'uk'));
    }

    const scored: { city: City; score: number }[] = [];
    for (const { city, names } of index) {
        const score = Math.min(...names.map((name) => scoreName(name, query)));
        if (score !== NO_MATCH) scored.push({ city, score });
    }

    return scored
        .sort((a, b) => a.score - b.score || b.city.population - a.city.population || a.city.name.localeCompare(b.city.name, 'uk'))
        .map((entry) => entry.city);
}
