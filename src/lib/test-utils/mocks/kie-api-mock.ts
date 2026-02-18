import { vi } from 'vitest';
import type { MockFn } from './types';

export interface KieApiMock {
	generateMusic: MockFn;
	extendMusic: MockFn;
	getMusicDetails: MockFn;
	separateVocals: MockFn;
	getStemSeparationDetails: MockFn;
	isErrorStatus: MockFn;
	isCompleteStatus: MockFn;
	isInProgressStatus: MockFn;
	isStemSeparationErrorStatus: MockFn;
	isStemSeparationCompleteStatus: MockFn;
	__reset: () => void;
}

function clearAllMockCalls(mockObject: Record<string, unknown>): void {
	for (const value of Object.values(mockObject)) {
		if (typeof value === 'function' && 'mockClear' in value) {
			(value as MockFn).mockClear();
		}
	}
}

export function createKieApiMock(): KieApiMock {
	const mock: KieApiMock = {
		generateMusic: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: { taskId: 'task-mock-001' }
		}),
		extendMusic: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: { taskId: 'task-mock-002' }
		}),
		getMusicDetails: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: {
				taskId: 'task-mock-001',
				parentMusicId: '',
				param: '',
				response: { taskId: 'task-mock-001', sunoData: [] },
				status: 'PENDING',
				type: 'generate',
				errorCode: null,
				errorMessage: null
			}
		}),
		separateVocals: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: { taskId: 'stem-task-mock-001' }
		}),
		getStemSeparationDetails: vi.fn().mockResolvedValue({
			code: 200,
			msg: 'success',
			data: {
				taskId: 'stem-task-mock-001',
				musicId: 'music-1',
				callbackUrl: '',
				audioId: 'audio-1-1',
				completeTime: null,
				response: null,
				successFlag: 'PENDING',
				createTime: Date.now(),
				errorCode: null,
				errorMessage: null
			}
		}),
		isErrorStatus: vi.fn((status: string) =>
			[
				'CREATE_TASK_FAILED',
				'GENERATE_AUDIO_FAILED',
				'CALLBACK_EXCEPTION',
				'SENSITIVE_WORD_ERROR'
			].includes(status)
		),
		isCompleteStatus: vi.fn((status: string) => status === 'SUCCESS'),
		isInProgressStatus: vi.fn((status: string) =>
			['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'].includes(status)
		),
		isStemSeparationErrorStatus: vi.fn((status: string) =>
			['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION'].includes(status)
		),
		isStemSeparationCompleteStatus: vi.fn((status: string) => status === 'SUCCESS'),
		__reset() {
			clearAllMockCalls(mock as unknown as Record<string, unknown>);
		}
	};

	return mock;
}
