import { describe, expect, it } from 'vitest';
import { createMusicDetailsResponse, createSunoTrack } from '$lib/test-utils';
import { mapGenerationCompletion, mapGenerationProgress } from './generation-mapper.server';

describe('mapGenerationCompletion', () => {
	it('returns null when fewer than two tracks are present', () => {
		const details = createMusicDetailsResponse({
			data: {
				taskId: 'task-1',
				parentMusicId: '',
				param: '',
				response: { taskId: 'task-1', sunoData: [createSunoTrack({ id: 'track-1' })] },
				status: 'SUCCESS',
				type: 'generate',
				errorCode: null,
				errorMessage: null
			}
		});

		expect(mapGenerationCompletion(details)).toBeNull();
	});

	it('maps completion payload when two tracks are present', () => {
		const track1 = createSunoTrack({ id: 'track-1' });
		const track2 = createSunoTrack({ id: 'track-2' });
		const details = createMusicDetailsResponse({
			data: {
				taskId: 'task-1',
				parentMusicId: '',
				param: '',
				response: { taskId: 'task-1', sunoData: [track1, track2] },
				status: 'SUCCESS',
				type: 'generate',
				errorCode: null,
				errorMessage: null
			}
		});

		const mapped = mapGenerationCompletion(details);
		expect(mapped).not.toBeNull();
		expect(mapped?.track1.audioId).toBe('track-1');
		expect(mapped?.track2.audioId).toBe('track-2');
		expect(mapped?.ssePayload.status).toBe('success');
	});
});

describe('mapGenerationProgress', () => {
	it('maps pending status to processing update without tracks', () => {
		const details = createMusicDetailsResponse({
			data: {
				taskId: 'task-1',
				parentMusicId: '',
				param: '',
				response: { taskId: 'task-1', sunoData: [] },
				status: 'PENDING',
				type: 'generate',
				errorCode: null,
				errorMessage: null
			}
		});

		const mapped = mapGenerationProgress(details);
		expect(mapped.status).toBe('processing');
		expect(mapped.trackUpdate).toBeUndefined();
		expect(mapped.ssePayload).toEqual({ status: 'processing' });
	});

	it('maps first_success with stream url to track update payload', () => {
		const track1 = createSunoTrack({ id: 'track-1', streamAudioUrl: 'https://stream/1' });
		const track2 = createSunoTrack({ id: 'track-2', streamAudioUrl: 'https://stream/2' });
		const details = createMusicDetailsResponse({
			data: {
				taskId: 'task-1',
				parentMusicId: '',
				param: '',
				response: { taskId: 'task-1', sunoData: [track1, track2] },
				status: 'FIRST_SUCCESS',
				type: 'generate',
				errorCode: null,
				errorMessage: null
			}
		});

		const mapped = mapGenerationProgress(details);
		expect(mapped.status).toBe('first_success');
		expect(mapped.trackUpdate?.track1.streamUrl).toBe('https://stream/1');
		expect(mapped.trackUpdate?.track2.streamUrl).toBe('https://stream/2');
		expect(mapped.trackUpdate?.ssePayload.status).toBe('first_success');
	});

	it('maps text_success without stream urls to status-only payload', () => {
		const track1 = createSunoTrack({ id: 'track-1', streamAudioUrl: '' });
		const track2 = createSunoTrack({ id: 'track-2', streamAudioUrl: '' });
		const details = createMusicDetailsResponse({
			data: {
				taskId: 'task-1',
				parentMusicId: '',
				param: '',
				response: { taskId: 'task-1', sunoData: [track1, track2] },
				status: 'TEXT_SUCCESS',
				type: 'generate',
				errorCode: null,
				errorMessage: null
			}
		});

		const mapped = mapGenerationProgress(details);
		expect(mapped.status).toBe('text_success');
		expect(mapped.trackUpdate).toBeUndefined();
		expect(mapped.ssePayload).toEqual({ status: 'text_success' });
	});
});
