import { vi } from 'vitest';
import type { MockFn } from './types';

export interface SseMock {
	addClient: MockFn;
	removeClient: MockFn;
	notifyClients: MockFn;
	notifyStemSeparationClients: MockFn;
	notifyAnnotationClients: MockFn;
	__reset: () => void;
}

export interface PollingMock {
	pollForResults: MockFn;
	pollForStemSeparationResults: MockFn;
	recoverIncompleteGenerations: MockFn;
	recoverIncompleteStemSeparations: MockFn;
	__reset: () => void;
}

function clearAllMockCalls(mockObject: Record<string, unknown>): void {
	for (const value of Object.values(mockObject)) {
		if (typeof value === 'function' && 'mockClear' in value) {
			(value as MockFn).mockClear();
		}
	}
}

export function createSseMock(): SseMock {
	const mock: SseMock = {
		addClient: vi.fn(),
		removeClient: vi.fn(),
		notifyClients: vi.fn(),
		notifyStemSeparationClients: vi.fn(),
		notifyAnnotationClients: vi.fn(),
		__reset() {
			clearAllMockCalls(mock as unknown as Record<string, unknown>);
		}
	};

	return mock;
}

export function createPollingMock(): PollingMock {
	const mock: PollingMock = {
		pollForResults: vi.fn(),
		pollForStemSeparationResults: vi.fn(),
		recoverIncompleteGenerations: vi.fn(),
		recoverIncompleteStemSeparations: vi.fn(),
		__reset() {
			clearAllMockCalls(mock as unknown as Record<string, unknown>);
		}
	};

	return mock;
}
