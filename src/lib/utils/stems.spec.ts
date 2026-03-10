import { describe, expect, it } from 'vitest';
import { getStemDisplay, normalizeStemType } from './stems';

describe('stems utils', () => {
	it('normalizes stem type values', () => {
		expect(normalizeStemType('Backing Vocals')).toBe('backing_vocals');
		expect(normalizeStemType('  DRUMS  ')).toBe('drums');
		expect(normalizeStemType(null)).toBeNull();
	});

	it('returns display metadata for known stem types', () => {
		expect(getStemDisplay('vocal')).toEqual({ label: 'Vocals', icon: '🎤' });
		expect(getStemDisplay('mp3')).toEqual({ label: 'Full Mix', icon: '🎵' });
		expect(getStemDisplay('percussion')).toEqual({ label: 'Percussion', icon: '🪘' });
	});

	it('falls back safely for unknown stem types', () => {
		expect(getStemDisplay('my_custom_stem')).toEqual({ label: 'My Custom Stem', icon: '🎛️' });
	});
});
