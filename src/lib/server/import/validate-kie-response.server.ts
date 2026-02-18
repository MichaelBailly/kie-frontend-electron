import { error } from '@sveltejs/kit';
import { isCompleteStatus, isErrorStatus } from '$lib/kie-api.server';

export interface KIETrack {
	id: string;
	audioUrl: string;
	streamAudioUrl?: string;
	imageUrl?: string;
	title?: string;
	tags?: string;
	prompt?: string;
	duration?: number;
}

interface KIEResponseData {
	status: string;
	errorMessage?: string | null;
	response?: {
		sunoData?: unknown[];
	} | null;
}

interface KIEMusicDetailsResponse {
	code: number;
	msg?: string;
	data?: unknown;
}

interface ImportableMusicDetails {
	responseData: KIEResponseData;
	track1: KIETrack;
	track2: KIETrack | null;
}

function isKIETrack(value: unknown): value is KIETrack {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof (value as KIETrack).id === 'string' &&
		(value as KIETrack).id.length > 0 &&
		'audioUrl' in value &&
		typeof (value as KIETrack).audioUrl === 'string' &&
		(value as KIETrack).audioUrl.length > 0
	);
}

function isKIEResponseData(value: unknown): value is KIEResponseData {
	return (
		typeof value === 'object' &&
		value !== null &&
		'status' in value &&
		typeof (value as KIEResponseData).status === 'string'
	);
}

function isKIEMusicDetailsResponse(value: unknown): value is KIEMusicDetailsResponse {
	return (
		typeof value === 'object' &&
		value !== null &&
		'code' in value &&
		typeof (value as KIEMusicDetailsResponse).code === 'number'
	);
}

export function validateImportableMusicDetails(details: unknown): ImportableMusicDetails {
	if (!isKIEMusicDetailsResponse(details)) {
		console.error('Invalid KIE API response structure:', details);
		throw error(502, 'Invalid response from KIE API');
	}

	if (details.code !== 200) {
		console.error('KIE API returned error code:', details.code, details.msg);
		throw error(502, `KIE API error: ${details.msg || 'Unknown error'}`);
	}

	if (!isKIEResponseData(details.data)) {
		console.error('KIE API response missing or invalid data field:', details.data);
		throw error(502, 'Invalid response structure from KIE API');
	}

	const responseData = details.data;
	const { status, errorMessage, response } = responseData;

	if (isErrorStatus(status)) {
		const statusMessages: Record<string, string> = {
			CREATE_TASK_FAILED: 'The generation task failed to start',
			GENERATE_AUDIO_FAILED: 'Audio generation failed',
			CALLBACK_EXCEPTION: 'A processing error occurred',
			SENSITIVE_WORD_ERROR: 'Content was flagged for policy violations'
		};
		const friendlyMessage = statusMessages[status] || status;
		throw error(
			400,
			`Cannot import: ${friendlyMessage}${errorMessage ? ` - ${errorMessage}` : ''}`
		);
	}

	if (!isCompleteStatus(status)) {
		const statusMessages: Record<string, string> = {
			PENDING: 'still queued',
			TEXT_SUCCESS: 'generating audio',
			FIRST_SUCCESS: 'finishing up'
		};
		const friendlyStatus = statusMessages[status] || status;
		throw error(
			400,
			`Cannot import: generation is ${friendlyStatus}. Please wait until it completes and try again.`
		);
	}

	const sunoData = response?.sunoData;
	if (!Array.isArray(sunoData) || sunoData.length === 0) {
		console.error('KIE API response missing sunoData array');
		throw error(400, 'No tracks found in this generation');
	}

	const track1Raw = sunoData[0];
	const track2Raw = sunoData[1];

	if (!isKIETrack(track1Raw)) {
		console.error('Track 1 missing required fields or invalid:', track1Raw);
		throw error(400, 'Track 1 data is incomplete or corrupted');
	}

	let track2: KIETrack | null = null;
	if (track2Raw !== undefined) {
		if (!isKIETrack(track2Raw)) {
			console.error('Track 2 missing required fields or invalid:', track2Raw);
			throw error(400, 'Track 2 data is incomplete or corrupted');
		}
		track2 = track2Raw;
	}

	return {
		responseData,
		track1: track1Raw,
		track2
	};
}
