import type { City } from './city-search';

/** One row of the bundled list: [name, region, russian, english, population, latitude, longitude]. */
type CityRow = [string, string | null, string, string, number, number, number];

/**
 * All cities and towns of Ukraine (OpenStreetMap). Loaded on first use, not at app start,
 * so the ~100 KB list and its parsing stay out of the way until someone opens the city picker.
 */
export function loadUkrainianCities(): City[] {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rows = require('../data/ukraine-cities.json') as CityRow[];

    return rows.map(([name, region, ru, en, population, latitude, longitude], index) => ({
        id: String(index),
        name,
        region,
        population,
        latitude,
        longitude,
        aliases: [ru, en].filter((alias) => alias && alias !== name),
    }));
}
