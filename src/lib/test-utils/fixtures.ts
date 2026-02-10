/**
 * Test fixture factories for creating entity test data.
 *
 * Each factory returns a complete object of the given type with sensible
 * defaults. Every field can be overridden via the optional `overrides`
 * parameter using `Partial<T>`.
 *
 * Factories use auto-incrementing IDs so that multiple calls produce
 * distinct entities without manual bookkeeping.
 */

import type {
	Project,
	Generation,
	StemSeparation,
	StemSeparationType,
	VariationAnnotation,
	Label,
	Setting
} from '$lib/types';
import type {
	GenerateMusicRequest,
	ExtendMusicRequest,
	GenerateMusicResponse,
	MusicDetailsResponse,
	SunoTrack,
	StemSeparationRequest,
	StemSeparationResponse,
	StemSeparationDetailsResponse
} from '$lib/kie-api.server';

// ============================================================================
// Auto-incrementing ID counters
// ============================================================================

let nextProjectId = 1;
let nextGenerationId = 1;
let nextStemSeparationId = 1;
let nextAnnotationId = 1;
let nextLabelId = 1;

/**
 * Reset all ID counters back to 1. Call in `beforeEach` when tests need
 * deterministic IDs.
 */
export function resetFixtureIds(): void {
	nextProjectId = 1;
	nextGenerationId = 1;
	nextStemSeparationId = 1;
	nextAnnotationId = 1;
	nextLabelId = 1;
}

// ============================================================================
// Timestamp helpers
// ============================================================================

const DEFAULT_TIMESTAMP = '2026-01-15T12:00:00.000Z';

function timestamp(offset = 0): string {
	const d = new Date(DEFAULT_TIMESTAMP);
	d.setSeconds(d.getSeconds() + offset);
	return d.toISOString();
}

// ============================================================================
// Entity factories
// ============================================================================

/**
 * Create a test `Project` with sensible defaults.
 *
 * @example
 * const project = createProject();
 * const named = createProject({ name: 'My Song' });
 */
export function createProject(overrides: Partial<Project> = {}): Project {
	const id = overrides.id ?? nextProjectId++;
	return {
		id,
		name: `Test Project ${id}`,
		is_open: true,
		created_at: timestamp(),
		updated_at: timestamp(),
		...overrides
	};
}

/**
 * Create a test `Generation` with sensible defaults.
 *
 * Defaults to `status: 'pending'` with no tracks. Use overrides or the
 * `createCompletedGeneration` helper for finished generations.
 *
 * @example
 * const gen = createGeneration({ project_id: 1, title: 'Epic Song' });
 */
export function createGeneration(overrides: Partial<Generation> = {}): Generation {
	const id = overrides.id ?? nextGenerationId++;
	return {
		id,
		project_id: overrides.project_id ?? 1,
		task_id: null,
		title: `Test Generation ${id}`,
		style: 'pop, upbeat',
		lyrics: 'La la la',
		status: 'pending',
		error_message: null,
		track1_stream_url: null,
		track1_audio_url: null,
		track1_image_url: null,
		track1_duration: null,
		track2_stream_url: null,
		track2_audio_url: null,
		track2_image_url: null,
		track2_duration: null,
		track1_audio_id: null,
		track2_audio_id: null,
		response_data: null,
		extends_generation_id: null,
		extends_audio_id: null,
		continue_at: null,
		created_at: timestamp(),
		updated_at: timestamp(),
		...overrides
	};
}

/**
 * Create a `Generation` in the `'success'` state with fully populated tracks.
 */
export function createCompletedGeneration(overrides: Partial<Generation> = {}): Generation {
	const id = overrides.id ?? nextGenerationId++;
	return createGeneration({
		id,
		status: 'success',
		task_id: `task-${id}`,
		track1_stream_url: `https://cdn.example.com/stream/${id}/track1.mp3`,
		track1_audio_url: `https://cdn.example.com/audio/${id}/track1.mp3`,
		track1_image_url: `https://cdn.example.com/img/${id}/track1.jpg`,
		track1_duration: 180,
		track1_audio_id: `audio-${id}-1`,
		track2_stream_url: `https://cdn.example.com/stream/${id}/track2.mp3`,
		track2_audio_url: `https://cdn.example.com/audio/${id}/track2.mp3`,
		track2_image_url: `https://cdn.example.com/img/${id}/track2.jpg`,
		track2_duration: 175,
		track2_audio_id: `audio-${id}-2`,
		response_data: JSON.stringify({ taskId: `task-${id}` }),
		...overrides
	});
}

/**
 * Create a `Generation` in the `'error'` state.
 */
export function createErrorGeneration(overrides: Partial<Generation> = {}): Generation {
	const id = overrides.id ?? nextGenerationId++;
	return createGeneration({
		id,
		status: 'error',
		error_message: 'Generation failed: API timeout',
		...overrides
	});
}

/**
 * Create an extend `Generation` that references a parent generation/audio.
 */
export function createExtendGeneration(overrides: Partial<Generation> = {}): Generation {
	const id = overrides.id ?? nextGenerationId++;
	return createGeneration({
		id,
		extends_generation_id: 1,
		extends_audio_id: 'audio-1-1',
		continue_at: 180,
		...overrides
	});
}

/**
 * Create a test `StemSeparation` with sensible defaults.
 */
export function createStemSeparation(overrides: Partial<StemSeparation> = {}): StemSeparation {
	const id = overrides.id ?? nextStemSeparationId++;
	return {
		id,
		generation_id: overrides.generation_id ?? 1,
		audio_id: overrides.audio_id ?? 'audio-1-1',
		task_id: null,
		type: 'separate_vocal' as StemSeparationType,
		status: 'pending',
		error_message: null,
		vocal_url: null,
		instrumental_url: null,
		backing_vocals_url: null,
		drums_url: null,
		bass_url: null,
		guitar_url: null,
		keyboard_url: null,
		piano_url: null,
		percussion_url: null,
		strings_url: null,
		synth_url: null,
		fx_url: null,
		brass_url: null,
		woodwinds_url: null,
		response_data: null,
		created_at: timestamp(),
		updated_at: timestamp(),
		...overrides
	};
}

/**
 * Create a completed `StemSeparation` with vocal/instrumental URLs populated.
 */
export function createCompletedStemSeparation(
	overrides: Partial<StemSeparation> = {}
): StemSeparation {
	const id = overrides.id ?? nextStemSeparationId++;
	return createStemSeparation({
		id,
		status: 'success',
		task_id: `stem-task-${id}`,
		vocal_url: `https://cdn.example.com/stems/${id}/vocal.mp3`,
		instrumental_url: `https://cdn.example.com/stems/${id}/instrumental.mp3`,
		response_data: JSON.stringify({ taskId: `stem-task-${id}` }),
		...overrides
	});
}

/**
 * Create a test `VariationAnnotation` with sensible defaults.
 */
export function createAnnotation(
	overrides: Partial<VariationAnnotation> = {}
): VariationAnnotation {
	const id = overrides.id ?? nextAnnotationId++;
	return {
		id,
		generation_id: overrides.generation_id ?? 1,
		audio_id: overrides.audio_id ?? 'audio-1-1',
		starred: 0,
		comment: null,
		labels: [],
		created_at: timestamp(),
		updated_at: timestamp(),
		...overrides
	};
}

/**
 * Create a starred `VariationAnnotation` with a comment and labels.
 */
export function createStarredAnnotation(
	overrides: Partial<VariationAnnotation> = {}
): VariationAnnotation {
	const id = overrides.id ?? nextAnnotationId++;
	return createAnnotation({
		id,
		starred: 1,
		comment: 'Great variation!',
		labels: ['favorite', 'verse'],
		...overrides
	});
}

/**
 * Create a test `Label`.
 */
export function createLabel(overrides: Partial<Label> = {}): Label {
	const id = overrides.id ?? nextLabelId++;
	return {
		id,
		name: `label-${id}`,
		created_at: timestamp(),
		updated_at: timestamp(),
		last_used_at: timestamp(),
		...overrides
	};
}

/**
 * Create a test `Setting`.
 */
export function createSetting(overrides: Partial<Setting> = {}): Setting {
	return {
		key: overrides.key ?? 'test_setting',
		value: overrides.value ?? 'test_value',
		created_at: timestamp(),
		updated_at: timestamp(),
		...overrides
	};
}

// ============================================================================
// KIE API request/response factories
// ============================================================================

/**
 * Create a `GenerateMusicRequest` with sensible defaults.
 */
export function createGenerateMusicRequest(
	overrides: Partial<GenerateMusicRequest> = {}
): GenerateMusicRequest {
	return {
		prompt: 'A catchy pop song about summer',
		style: 'pop, upbeat, energetic',
		title: 'Summer Vibes',
		customMode: true,
		instrumental: false,
		model: 'V4_5',
		callBackUrl: 'https://example.com/callback',
		...overrides
	};
}

/**
 * Create an `ExtendMusicRequest` with sensible defaults.
 */
export function createExtendMusicRequest(
	overrides: Partial<ExtendMusicRequest> = {}
): ExtendMusicRequest {
	return {
		defaultParamFlag: false,
		audioId: 'audio-1-1',
		prompt: 'Continue the melody',
		style: 'pop, upbeat',
		title: 'Summer Vibes (Extended)',
		continueAt: 180,
		model: 'V4_5',
		callBackUrl: 'https://example.com/callback',
		...overrides
	};
}

/**
 * Create a successful `GenerateMusicResponse`.
 */
export function createGenerateMusicResponse(
	overrides: Partial<GenerateMusicResponse> = {}
): GenerateMusicResponse {
	return {
		code: 200,
		msg: 'success',
		data: { taskId: 'task-abc-123' },
		...overrides
	};
}

/**
 * Create a `SunoTrack` with sensible defaults.
 */
export function createSunoTrack(overrides: Partial<SunoTrack> = {}): SunoTrack {
	return {
		id: 'suno-track-1',
		audioUrl: 'https://cdn.example.com/audio/track1.mp3',
		streamAudioUrl: 'https://cdn.example.com/stream/track1.mp3',
		imageUrl: 'https://cdn.example.com/img/track1.jpg',
		prompt: 'A catchy pop song',
		modelName: 'V4_5',
		title: 'Summer Vibes',
		tags: 'pop, upbeat',
		createTime: DEFAULT_TIMESTAMP,
		duration: 180,
		...overrides
	};
}

/**
 * Create a successful `MusicDetailsResponse` with completed tracks.
 */
export function createMusicDetailsResponse(
	overrides: Partial<MusicDetailsResponse> = {}
): MusicDetailsResponse {
	const defaults: MusicDetailsResponse = {
		code: 200,
		msg: 'success',
		data: {
			taskId: 'task-abc-123',
			parentMusicId: '',
			param: '',
			response: {
				taskId: 'task-abc-123',
				sunoData: [createSunoTrack({ id: 'track-1' }), createSunoTrack({ id: 'track-2' })]
			},
			status: 'SUCCESS',
			type: 'generate',
			errorCode: null,
			errorMessage: null
		}
	};
	return {
		...defaults,
		...overrides,
		data: {
			...defaults.data,
			...(overrides.data as Partial<MusicDetailsResponse['data']>)
		}
	};
}

/**
 * Create a pending `MusicDetailsResponse` (still processing).
 */
export function createPendingMusicDetailsResponse(
	overrides: Partial<MusicDetailsResponse> = {}
): MusicDetailsResponse {
	return createMusicDetailsResponse({
		data: {
			taskId: 'task-abc-123',
			parentMusicId: '',
			param: '',
			response: { taskId: 'task-abc-123', sunoData: [] },
			status: 'PENDING',
			type: 'generate',
			errorCode: null,
			errorMessage: null
		},
		...overrides
	});
}

/**
 * Create a failed `MusicDetailsResponse`.
 */
export function createErrorMusicDetailsResponse(
	overrides: Partial<MusicDetailsResponse> = {}
): MusicDetailsResponse {
	return createMusicDetailsResponse({
		data: {
			taskId: 'task-abc-123',
			parentMusicId: '',
			param: '',
			response: { taskId: 'task-abc-123', sunoData: [] },
			status: 'CREATE_TASK_FAILED',
			type: 'generate',
			errorCode: 'ERR_001',
			errorMessage: 'Task creation failed'
		},
		...overrides
	});
}

/**
 * Create a `StemSeparationRequest` with sensible defaults.
 */
export function createStemSeparationRequest(
	overrides: Partial<StemSeparationRequest> = {}
): StemSeparationRequest {
	return {
		taskId: 'task-abc-123',
		audioId: 'audio-1-1',
		type: 'separate_vocal',
		callBackUrl: 'https://example.com/callback',
		...overrides
	};
}

/**
 * Create a successful `StemSeparationResponse`.
 */
export function createStemSeparationResponse(
	overrides: Partial<StemSeparationResponse> = {}
): StemSeparationResponse {
	return {
		code: 200,
		msg: 'success',
		data: { taskId: 'stem-task-abc-123' },
		...overrides
	};
}

/**
 * Create a successful `StemSeparationDetailsResponse`.
 */
export function createStemSeparationDetailsResponse(
	overrides: Partial<StemSeparationDetailsResponse> = {}
): StemSeparationDetailsResponse {
	const defaults: StemSeparationDetailsResponse = {
		code: 200,
		msg: 'success',
		data: {
			taskId: 'stem-task-abc-123',
			musicId: 'music-1',
			callbackUrl: 'https://example.com/callback',
			audioId: 'audio-1-1',
			completeTime: Date.now(),
			response: {
				originUrl: 'https://cdn.example.com/stems/origin.mp3',
				instrumentalUrl: 'https://cdn.example.com/stems/instrumental.mp3',
				vocalUrl: 'https://cdn.example.com/stems/vocal.mp3',
				backingVocalsUrl: null,
				drumsUrl: null,
				bassUrl: null,
				guitarUrl: null,
				pianoUrl: null,
				keyboardUrl: null,
				percussionUrl: null,
				stringsUrl: null,
				synthUrl: null,
				fxUrl: null,
				brassUrl: null,
				woodwindsUrl: null
			},
			successFlag: 'SUCCESS',
			createTime: Date.now(),
			errorCode: null,
			errorMessage: null
		}
	};
	return {
		...defaults,
		...overrides,
		data: {
			...defaults.data,
			...(overrides.data as Partial<StemSeparationDetailsResponse['data']>)
		}
	};
}
