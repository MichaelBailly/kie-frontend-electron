import {
	getPendingGenerations,
	getPendingStemSeparations,
	getPendingWavConversions
} from '$lib/db.server';
import {
	recoverIncompleteGenerations,
	recoverIncompleteStemSeparations,
	recoverIncompleteWavConversions
} from '$lib/polling.server';

export function runStartupRecovery(): void {
	recoverIncompleteGenerations(getPendingGenerations());
	recoverIncompleteStemSeparations(getPendingStemSeparations());
	recoverIncompleteWavConversions(getPendingWavConversions());
}
