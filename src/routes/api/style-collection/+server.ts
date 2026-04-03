import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllStyles, createStyle, searchStyles } from '$lib/db.server';
import {
	parseJsonBody,
	parseStyleCollectionBody,
	parseStyleCollectionLimit,
	parseStyleCollectionQuery
} from '$lib/api-helpers.server';

export const GET: RequestHandler = async ({ url }) => {
	const query = parseStyleCollectionQuery(url.searchParams.get('q'));
	const limit = parseStyleCollectionLimit(url.searchParams.get('limit'));
	const styles = query ? searchStyles(query, limit) : getAllStyles();
	return json({ styles });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await parseJsonBody(request);
	const { name, style, description } = parseStyleCollectionBody(body);
	const created = createStyle(name, style, description);
	return json(created, { status: 201 });
};
