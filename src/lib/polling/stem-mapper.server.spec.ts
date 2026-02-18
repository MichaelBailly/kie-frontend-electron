import { describe, expect, it } from 'vitest';
import { createStemSeparationDetailsResponse } from '$lib/test-utils';
import { mapStemCompletion } from './stem-mapper.server';

describe('mapStemCompletion', () => {
	it('returns null when response payload is missing', () => {
		const details = createStemSeparationDetailsResponse({
			data: {
				taskId: 'stem-task-1',
				musicId: 'music-1',
				callbackUrl: '',
				audioId: 'audio-1',
				completeTime: null,
				response: null,
				successFlag: 'SUCCESS',
				createTime: Date.now(),
				errorCode: null,
				errorMessage: null
			}
		});

		expect(mapStemCompletion(details)).toBeNull();
	});

	it('maps full response payload to db and sse payloads', () => {
		const details = createStemSeparationDetailsResponse();
		const mapped = mapStemCompletion(details);

		expect(mapped).not.toBeNull();
		expect(mapped?.data.vocalUrl).toBeTruthy();
		expect(mapped?.ssePayload.status).toBe('success');
		expect(mapped?.ssePayload.vocal_url).toBeTruthy();
		expect(mapped?.responseData).toContain('taskId');
	});
});
