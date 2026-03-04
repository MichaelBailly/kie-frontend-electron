import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStyle, updateStyle, deleteStyle } from '$lib/db.server';

function parseId(param: string): number {
	const id = Number(param);
	if (!Number.isInteger(id) || id < 1) throw error(400, 'Invalid id');
	return id;
}

export const GET: RequestHandler = async ({ params }) => {
	const id = parseId(params.id);
	const style = getStyle(id);
	if (!style) throw error(404, 'Style not found');
	return json(style);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const id = parseId(params.id);
	const existing = getStyle(id);
	if (!existing) throw error(404, 'Style not found');

	const body = await request.json().catch(() => null);
	if (!body || typeof body !== 'object') throw error(400, 'Invalid request body');

	const fields: Record<string, string> = {};
	const { name, style, description } = body as Record<string, unknown>;

	if (name !== undefined) {
		if (typeof name !== 'string' || !name.trim()) throw error(400, 'name cannot be empty');
		if (name.trim().length > 100) throw error(400, 'name must be 100 characters or less');
		fields.name = name;
	}
	if (style !== undefined) {
		if (typeof style !== 'string' || !style.trim()) throw error(400, 'style cannot be empty');
		if (style.trim().length > 2000) throw error(400, 'style must be 2000 characters or less');
		fields.style = style;
	}
	if (description !== undefined) {
		if (typeof description !== 'string') throw error(400, 'description must be a string');
		if (description.trim().length > 500)
			throw error(400, 'description must be 500 characters or less');
		fields.description = description;
	}

	const updated = updateStyle(id, fields);
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params }) => {
	const id = parseId(params.id);
	const existing = getStyle(id);
	if (!existing) throw error(404, 'Style not found');

	deleteStyle(id);
	return new Response(null, { status: 204 });
};
