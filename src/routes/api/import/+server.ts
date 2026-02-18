import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseImportRequest } from '$lib/server/import/parse.server';
import { importSongFromTask } from '$lib/server/import/service.server';

type HttpErrorShape = {
	status: number;
	body?: {
		message?: string;
	};
};

function normalizeError(err: unknown): { status: number; message: string } {
	if (typeof err === 'object' && err !== null && 'status' in err) {
		const candidate = err as HttpErrorShape;
		if (typeof candidate.status === 'number') {
			const message =
				typeof candidate.body?.message === 'string'
					? candidate.body.message
					: err instanceof Error
						? err.message
						: 'Request failed';
			return {
				status: candidate.status,
				message
			};
		}
	}

	return {
		status: 500,
		message: 'Failed to import song. Please try again.'
	};
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const input = await parseImportRequest(request);
		const result = await importSongFromTask(input);

		return json({
			success: true,
			...result
		});
	} catch (err) {
		const normalized = normalizeError(err);
		return json({ error: normalized.message }, { status: normalized.status });
	}
};
