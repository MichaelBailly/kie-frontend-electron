import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbMock, pollingMock } = vi.hoisted(() => ({
	dbMock: {
		getPendingGenerations: vi.fn(),
		getPendingStemSeparations: vi.fn(),
		getPendingWavConversions: vi.fn()
	},
	pollingMock: {
		recoverIncompleteGenerations: vi.fn(),
		recoverIncompleteStemSeparations: vi.fn(),
		recoverIncompleteWavConversions: vi.fn()
	}
}));

vi.mock('$lib/db.server', () => dbMock);
vi.mock('$lib/polling.server', () => pollingMock);

import { runStartupRecovery } from './startup.server';

beforeEach(() => {
	vi.clearAllMocks();
	dbMock.getPendingGenerations.mockReturnValue([{ id: 1 }, { id: 2 }]);
	dbMock.getPendingStemSeparations.mockReturnValue([{ id: 3 }]);
	dbMock.getPendingWavConversions.mockReturnValue([{ id: 4 }]);
});

describe('runStartupRecovery', () => {
	it('loads pending work and resumes recovery for each task type', () => {
		runStartupRecovery();

		expect(dbMock.getPendingGenerations).toHaveBeenCalledTimes(1);
		expect(dbMock.getPendingStemSeparations).toHaveBeenCalledTimes(1);
		expect(dbMock.getPendingWavConversions).toHaveBeenCalledTimes(1);
		expect(pollingMock.recoverIncompleteGenerations).toHaveBeenCalledWith([{ id: 1 }, { id: 2 }]);
		expect(pollingMock.recoverIncompleteStemSeparations).toHaveBeenCalledWith([{ id: 3 }]);
		expect(pollingMock.recoverIncompleteWavConversions).toHaveBeenCalledWith([{ id: 4 }]);
	});
});
