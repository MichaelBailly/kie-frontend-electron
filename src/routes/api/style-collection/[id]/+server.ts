import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStyle, updateStyle, deleteStyle } from '$lib/db.server';
import {
	parseJsonBody,
	parsePositiveIntParam,
	parseStyleCollectionPatchBody
} from '$lib/api-helpers.server';

export const GET: RequestHandler = async ({ params }) => {
	const id = parsePositiveIntParam(params.id);
	const style = getStyle(id);
	if (!style) throw error(404, 'Style not found');
	return json(style);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parsePositiveIntParam(params.id);
	const existing = getStyle(id);
	if (!existing) throw error(404, 'Style not found');

	const body = await parseJsonBody(request);
	const fields = parseStyleCollectionPatchBody(body);

	const updated = updateStyle(id, fields);
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parsePositiveIntParam(params.id);
	const existing = getStyle(id);
	if (!existing) throw error(404, 'Style not found');

	deleteStyle(id);
	return new Response(null, { status: 204 });
};
