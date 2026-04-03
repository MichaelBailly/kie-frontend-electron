import { describe, expect, it } from 'vitest';
import {
	parsePositiveIntParam,
	parseStyleCollectionBody,
	parseStyleCollectionLimit,
	parseStyleCollectionPatchBody,
	parseStyleCollectionQuery
} from './api-helpers.server';

describe('api-helpers style collection parsing', () => {
	it('trims and validates style collection create body', () => {
		expect(
			parseStyleCollectionBody({
				name: '  Cinematic  ',
				style: '  epic strings  ',
				description: '  big sound  '
			})
		).toEqual({
			name: 'Cinematic',
			style: 'epic strings',
			description: 'big sound'
		});
	});

	it('defaults missing description to empty string for create body', () => {
		expect(
			parseStyleCollectionBody({
				name: 'Pop',
				style: 'upbeat'
			})
		).toEqual({
			name: 'Pop',
			style: 'upbeat',
			description: ''
		});
	});

	it('trims patch fields and ignores omitted values', () => {
		expect(
			parseStyleCollectionPatchBody({
				name: '  New Name  ',
				description: '  updated  '
			})
		).toEqual({
			name: 'New Name',
			description: 'updated'
		});
	});

	it('parses query and limit with defaults', () => {
		expect(parseStyleCollectionQuery('  synthwave  ')).toBe('synthwave');
		expect(parseStyleCollectionQuery(null)).toBe('');
		expect(parseStyleCollectionLimit(null)).toBe(20);
		expect(parseStyleCollectionLimit('5')).toBe(5);
	});
});

describe('api-helpers numeric parsing', () => {
	it('accepts positive integer params', () => {
		expect(parsePositiveIntParam('42')).toBe(42);
	});

	it('rejects non-positive integer params', () => {
		expect(() => parsePositiveIntParam('0')).toThrow();
		expect(() => parsePositiveIntParam('-1')).toThrow();
		expect(() => parsePositiveIntParam('abc')).toThrow();
	});
});
