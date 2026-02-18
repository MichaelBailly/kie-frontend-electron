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
import { DEFAULT_TIMESTAMP } from './state';

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
