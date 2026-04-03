import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { FORWARDED_MEDIA_REQUEST_HEADERS, FORWARDED_MEDIA_RESPONSE_HEADERS } from '$lib/constants';

function parseRemoteUrl(rawUrl: string | null): URL {
	if (!rawUrl) {
		throw error(400, 'Missing media url');
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(rawUrl);
	} catch {
		throw error(400, 'Invalid media url');
	}

	if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
		throw error(400, 'Unsupported media protocol');
	}

	return parsedUrl;
}

function buildRequestHeaders(request: Request): Headers {
	const headers = new Headers();

	for (const headerName of FORWARDED_MEDIA_REQUEST_HEADERS) {
		const value = request.headers.get(headerName);
		if (value) {
			headers.set(headerName, value);
		}
	}

	return headers;
}

function buildResponseHeaders(sourceHeaders: Headers): Headers {
	const headers = new Headers();

	for (const headerName of FORWARDED_MEDIA_RESPONSE_HEADERS) {
		const value = sourceHeaders.get(headerName);
		if (value) {
			headers.set(headerName, value);
		}
	}

	headers.set('Cache-Control', 'private, max-age=3600');

	return headers;
}

export const GET: RequestHandler = async ({ url, request }) => {
	const remoteUrl = parseRemoteUrl(url.searchParams.get('url'));

	let response: Response;
	try {
		response = await fetch(remoteUrl, {
			headers: buildRequestHeaders(request),
			redirect: 'follow'
		});
	} catch {
		throw error(502, 'Unable to fetch remote media');
	}

	if (!response.ok && response.status !== 206) {
		throw error(response.status, 'Remote media request failed');
	}

	return new Response(response.body, {
		status: response.status,
		headers: buildResponseHeaders(response.headers)
	});
};
