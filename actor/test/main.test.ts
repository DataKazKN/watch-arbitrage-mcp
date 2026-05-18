/**
 * Actor smoke tests — wiring & contract integrity.
 *
 * Replaces the original Crawlee-template test that imported `../src/routes.js`
 * (deleted long ago). This file checks that the 13-platform contract holds end
 * to end: type union, input schema, URL builders, brand detection, and country
 * map all agree.
 *
 * These tests do NOT make network calls — that's reserved for the live
 * integration run via `apify call`. See AGENTS.md for the live run protocol.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { COUNTRY_LABEL, PLATFORM_COUNTRY, type Platform } from '../src/types.js';
import { brandLabel, detectBrand, platformLabel } from '../src/utils/brand.js';
import { buildSearchUrls } from '../src/utils/url.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACTOR_ROOT = resolve(__dirname, '..');

const ALL_PLATFORMS: Platform[] = [
    'chrono24',
    'watchbox',
    'bobs',
    'hodinkee',
    'watchfinder',
    'europeanwatch',
    'watchesofswitzerland',
    'watchclub',
    'yahoojp',
    'spliedt',
    'acollectedman',
    'analogshift',
    'bachmannscher',
];

describe('Platform contract', () => {
    it('has exactly 13 platforms in PLATFORM_COUNTRY', () => {
        expect(Object.keys(PLATFORM_COUNTRY).length).toBe(13);
    });

    it('every Platform has a country mapping', () => {
        for (const p of ALL_PLATFORMS) {
            expect(PLATFORM_COUNTRY[p]).toBeTruthy();
        }
    });

    it('every country has a human-readable label', () => {
        const distinctCountries = new Set(Object.values(PLATFORM_COUNTRY));
        for (const c of distinctCountries) {
            expect(COUNTRY_LABEL[c]).toBeTruthy();
        }
    });

    it('platformLabel returns non-empty for every Platform', () => {
        for (const p of ALL_PLATFORMS) {
            const label = platformLabel(p);
            expect(label).toBeTruthy();
            expect(label.length).toBeGreaterThan(2);
        }
    });

    it('input_schema.json enum matches the Platform type union', () => {
        const schemaPath = resolve(ACTOR_ROOT, '.actor', 'input_schema.json');
        const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));
        const enumValues: string[] = schema.properties.platforms.items.enum;
        const enumTitles: string[] = schema.properties.platforms.items.enumTitles;

        expect(enumValues.length).toBe(13);
        expect(enumTitles.length).toBe(13);
        expect(new Set(enumValues)).toEqual(new Set(ALL_PLATFORMS));
    });
});

describe('URL builders', () => {
    const PATEK_REF = '5711/1A-010';
    const ROLEX_REF = '116500LN';
    const AP_REF = '15500ST';

    it('buildSearchUrls returns one URL per ref per platform', () => {
        for (const p of ALL_PLATFORMS) {
            const urls = buildSearchUrls(p, [PATEK_REF, ROLEX_REF, AP_REF]);
            expect(urls.length).toBe(3);
            for (const u of urls) {
                expect(u.url).toMatch(/^https?:\/\//);
                expect(u.userData.ref).toMatch(/^(5711|116500|15500)/);
            }
        }
    });

    it('every URL is a valid absolute URL', () => {
        for (const p of ALL_PLATFORMS) {
            for (const u of buildSearchUrls(p, [PATEK_REF])) {
                expect(() => new URL(u.url)).not.toThrow();
            }
        }
    });

    it('Patek refs route to patek-philippe brand pages on collection-style sites', () => {
        const collectionPlatforms: Platform[] = ['spliedt', 'acollectedman', 'watchclub', 'analogshift'];
        for (const p of collectionPlatforms) {
            const [u] = buildSearchUrls(p, [PATEK_REF]);
            expect(u.url.toLowerCase()).toContain('patek');
        }
    });

    it('Rolex refs route to rolex brand pages on collection-style sites', () => {
        const collectionPlatforms: Platform[] = ['spliedt', 'acollectedman', 'watchclub', 'analogshift'];
        for (const p of collectionPlatforms) {
            const [u] = buildSearchUrls(p, [ROLEX_REF]);
            expect(u.url.toLowerCase()).toContain('rolex');
        }
    });

    it('AP refs route to audemars-piguet brand pages on collection-style sites', () => {
        const collectionPlatforms: Platform[] = ['spliedt', 'acollectedman', 'watchclub', 'analogshift'];
        for (const p of collectionPlatforms) {
            const [u] = buildSearchUrls(p, [AP_REF]);
            expect(u.url.toLowerCase()).toContain('audemars');
        }
    });
});

describe('Brand detection', () => {
    it('Patek refs detect correctly', () => {
        expect(detectBrand('5711/1A-010')).toBe('patek-philippe');
        expect(detectBrand('5167A')).toBe('patek-philippe');
        expect(detectBrand('Nautilus')).toBe('patek-philippe');
        expect(detectBrand('PATEK')).toBe('patek-philippe');
    });

    it('Rolex refs detect correctly', () => {
        expect(detectBrand('116500LN')).toBe('rolex');
        expect(detectBrand('126710BLNR')).toBe('rolex');
        expect(detectBrand('Daytona')).toBe('rolex');
        expect(detectBrand('ROLEX')).toBe('rolex');
    });

    it('AP refs detect correctly', () => {
        expect(detectBrand('15500ST')).toBe('audemars-piguet');
        expect(detectBrand('26240OR')).toBe('audemars-piguet');
        expect(detectBrand('Royal Oak')).toBe('audemars-piguet');
        expect(detectBrand('AP')).toBe('audemars-piguet');
    });

    it('brandLabel returns human-readable strings', () => {
        expect(brandLabel('patek-philippe')).toBe('Patek Philippe');
        expect(brandLabel('rolex')).toBe('Rolex');
        expect(brandLabel('audemars-piguet')).toBe('Audemars Piguet');
        expect(brandLabel('unknown')).toBe('Unknown');
    });
});

describe('Country mapping integrity', () => {
    it('expected country distribution holds for 13 platforms', () => {
        // Should have countries covering at least US, UK, DE, JP, plus EU.
        const countries = new Set(Object.values(PLATFORM_COUNTRY));
        expect(countries.has('US')).toBe(true);
        expect(countries.has('UK')).toBe(true);
        expect(countries.has('DE')).toBe(true);
        expect(countries.has('JP')).toBe(true);
    });

    it('Yahoo JP is the only JP platform', () => {
        const jpPlatforms = ALL_PLATFORMS.filter((p) => PLATFORM_COUNTRY[p] === 'JP');
        expect(jpPlatforms).toEqual(['yahoojp']);
    });

    it('DE platforms include spliedt + bachmannscher', () => {
        const dePlatforms = new Set(ALL_PLATFORMS.filter((p) => PLATFORM_COUNTRY[p] === 'DE'));
        expect(dePlatforms.has('spliedt')).toBe(true);
        expect(dePlatforms.has('bachmannscher')).toBe(true);
    });
});
