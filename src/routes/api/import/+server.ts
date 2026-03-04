import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseImportRequest } from '$lib/server/import/parse.server';
import { normalizeImportRouteError } from '$lib/server/import/errors';
import { importSongFromTask } from '$lib/server/import/service.server';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const input = await parseImportRequest(request);
		const result = await importSongFromTask(input);

		return json({
			success: true,
			...result
		});
	} catch (err) {
		const normalized = normalizeImportRouteError(err);
		return json({ error: normalized.message }, { status: normalized.status });
	}
};
