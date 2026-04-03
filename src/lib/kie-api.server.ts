import { getApiKey } from './db.server';
import { KIE_API_BASE } from './constants';
import { KIE_API_KEY } from './constants.server';
import type { CreditInfo } from './types';

export class KieApiError extends Error {
	status: number;

	constructor(status: number, statusText: string) {
		super(`KIE API error: ${status} ${statusText}`);
		this.name = 'KieApiError';
		this.status = status;
	}
}

// Get API key from database first, fallback to environment variable
function getEffectiveApiKey(): string {
	const dbKey = getApiKey();
	if (dbKey && dbKey.length > 0) {
		return dbKey;
	}
	return KIE_API_KEY;
}

interface KieRequestOptions {
	method?: 'GET' | 'POST';
	body?: unknown;
}

async function kieRequest<T>(path: string, options: KieRequestOptions = {}): Promise<T> {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${getEffectiveApiKey()}`
	};

	if (options.body !== undefined) {
		headers['Content-Type'] = 'application/json';
	}

	const response = await fetch(`${KIE_API_BASE}${path}`, {
		method: options.method ?? 'GET',
		headers,
		body: options.body !== undefined ? JSON.stringify(options.body) : undefined
	});

	if (!response.ok) {
		throw new KieApiError(response.status, response.statusText);
	}

	return response.json() as Promise<T>;
}

// V6 family is current; older values are discontinued by KIE but still part of the API enum.
export type KieMusicModel =
	'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5' | 'V5_5' | 'V6' | 'V6_MINI' | 'V6_WILD';

export type KieAddAudioModel = 'V4_5PLUS' | 'V5' | 'V5_5' | 'V6' | 'V6_MINI' | 'V6_WILD';

export interface GenerateMusicRequest {
	// Used as lyrics in custom mode; omit for instrumental tracks.
	prompt?: string;
	style: string;
	title: string;
	customMode: boolean;
	instrumental: boolean;
	model: KieMusicModel;
	callBackUrl: string;
	negativeTags?: string;
}

export interface ExtendMusicRequest {
	audioId: string;
	// Used as lyrics; must be omitted when instrumental is true.
	prompt?: string;
	style: string;
	title: string;
	continueAt: number;
	instrumental: boolean;
	model: KieMusicModel;
	callBackUrl: string;
	negativeTags?: string;
}

export interface UploadExtendMusicRequest {
	uploadUrl: string;
	// Used as lyrics; must be omitted when instrumental is true.
	prompt?: string;
	style: string;
	title: string;
	continueAt: number;
	instrumental: boolean;
	model: KieMusicModel;
	callBackUrl: string;
	negativeTags?: string;
}

export interface AddInstrumentalRequest {
	uploadUrl: string;
	title: string;
	tags: string;
	negativeTags: string;
	model?: KieAddAudioModel;
	callBackUrl: string;
}

export interface AddVocalsRequest {
	uploadUrl: string;
	prompt: string;
	style: string;
	title: string;
	negativeTags: string;
	model?: KieAddAudioModel;
	callBackUrl: string;
}

export interface GenerateMusicResponse {
	code: number;
	msg: string;
	data: {
		taskId: string;
	};
}

export interface SunoTrack {
	id: string;
	audioUrl: string;
	streamAudioUrl: string;
	imageUrl: string;
	prompt: string;
	modelName: string;
	title: string;
	tags: string;
	createTime: string;
	duration: number;
}

export interface MusicDetailsResponse {
	code: number;
	msg: string;
	data: {
		taskId: string;
		parentMusicId: string;
		param: string;
		response: {
			taskId: string;
			sunoData: SunoTrack[];
		};
		status:
			| 'PENDING'
			| 'TEXT_SUCCESS'
			| 'FIRST_SUCCESS'
			| 'SUCCESS'
			| 'CREATE_TASK_FAILED'
			| 'GENERATE_AUDIO_FAILED'
			| 'CALLBACK_EXCEPTION'
			| 'SENSITIVE_WORD_ERROR';
		type: string;
		errorCode: string | null;
		errorMessage: string | null;
	};
}

export async function generateMusic(request: GenerateMusicRequest): Promise<GenerateMusicResponse> {
	return kieRequest<GenerateMusicResponse>('/generate', {
		method: 'POST',
		body: request
	});
}

export async function extendMusic(request: ExtendMusicRequest): Promise<GenerateMusicResponse> {
	return kieRequest<GenerateMusicResponse>('/generate/extend', {
		method: 'POST',
		body: request
	});
}

export async function uploadExtendMusic(
	request: UploadExtendMusicRequest
): Promise<GenerateMusicResponse> {
	return kieRequest<GenerateMusicResponse>('/generate/upload-extend', {
		method: 'POST',
		body: request
	});
}

export async function addInstrumental(
	request: AddInstrumentalRequest
): Promise<GenerateMusicResponse> {
	return kieRequest<GenerateMusicResponse>('/generate/add-instrumental', {
		method: 'POST',
		body: request
	});
}

export async function addVocals(request: AddVocalsRequest): Promise<GenerateMusicResponse> {
	return kieRequest<GenerateMusicResponse>('/generate/add-vocals', {
		method: 'POST',
		body: request
	});
}

export async function getMusicDetails(taskId: string): Promise<MusicDetailsResponse> {
	return kieRequest<MusicDetailsResponse>(`/generate/record-info?taskId=${taskId}`);
}

export function isErrorStatus(status: string): boolean {
	return [
		'CREATE_TASK_FAILED',
		'GENERATE_AUDIO_FAILED',
		'CALLBACK_EXCEPTION',
		'SENSITIVE_WORD_ERROR'
	].includes(status);
}

export function isCompleteStatus(status: string): boolean {
	return status === 'SUCCESS';
}

export function isInProgressStatus(status: string): boolean {
	return ['PENDING', 'TEXT_SUCCESS', 'FIRST_SUCCESS'].includes(status);
}

// Stem Separation API

export type StemSeparationType = 'separate_vocal' | 'split_stem';

export interface StemSeparationRequest {
	taskId: string;
	audioId: string;
	type: StemSeparationType;
	callBackUrl: string;
}

export interface StemSeparationResponse {
	code: number;
	msg: string;
	data: {
		taskId: string;
	};
}

export interface StemSeparationDetailsResponse {
	code: number;
	msg: string;
	data: {
		taskId: string;
		musicId: string;
		callbackUrl: string;
		audioId: string;
		completeTime: number | null;
		response: {
			originUrl: string | null;
			instrumentalUrl: string | null;
			vocalUrl: string | null;
			backingVocalsUrl: string | null;
			drumsUrl: string | null;
			bassUrl: string | null;
			guitarUrl: string | null;
			pianoUrl: string | null;
			keyboardUrl: string | null;
			percussionUrl: string | null;
			stringsUrl: string | null;
			synthUrl: string | null;
			fxUrl: string | null;
			brassUrl: string | null;
			woodwindsUrl: string | null;
		} | null;
		successFlag:
			'PENDING' | 'SUCCESS' | 'CREATE_TASK_FAILED' | 'GENERATE_AUDIO_FAILED' | 'CALLBACK_EXCEPTION';
		createTime: number;
		errorCode: number | null;
		errorMessage: string | null;
	};
}

export async function separateVocals(
	request: StemSeparationRequest
): Promise<StemSeparationResponse> {
	return kieRequest<StemSeparationResponse>('/vocal-removal/generate', {
		method: 'POST',
		body: request
	});
}

export async function getStemSeparationDetails(
	taskId: string
): Promise<StemSeparationDetailsResponse> {
	return kieRequest<StemSeparationDetailsResponse>(`/vocal-removal/record-info?taskId=${taskId}`);
}

export function isStemSeparationErrorStatus(status: string): boolean {
	return ['CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION'].includes(status);
}

export function isStemSeparationCompleteStatus(status: string): boolean {
	return status === 'SUCCESS';
}

// WAV Conversion API

export interface ConvertToWavRequest {
	taskId: string;
	audioId: string;
	callBackUrl: string;
}

export interface ConvertToWavResponse {
	code: number;
	msg: string;
	data: {
		taskId: string;
	};
}

export interface WavDetailsResponse {
	code: number;
	msg: string;
	data: {
		taskId: string;
		musicId: string;
		callbackUrl: string;
		musicIndex: number;
		completeTime: string | null;
		response: {
			audioWavUrl: string;
		} | null;
		successFlag:
			'PENDING' | 'SUCCESS' | 'CREATE_TASK_FAILED' | 'GENERATE_WAV_FAILED' | 'CALLBACK_EXCEPTION';
		createTime: string;
		errorCode: number | null;
		errorMessage: string | null;
	};
}

export async function convertToWav(request: ConvertToWavRequest): Promise<ConvertToWavResponse> {
	return kieRequest<ConvertToWavResponse>('/wav/generate', {
		method: 'POST',
		body: request
	});
}

export async function getWavDetails(taskId: string): Promise<WavDetailsResponse> {
	return kieRequest<WavDetailsResponse>(`/wav/record-info?taskId=${taskId}`);
}

export function isWavErrorStatus(status: string): boolean {
	return ['CREATE_TASK_FAILED', 'GENERATE_WAV_FAILED', 'CALLBACK_EXCEPTION'].includes(status);
}

export function isWavCompleteStatus(status: string): boolean {
	return status === 'SUCCESS';
}

// Account / Credits API

interface KieCreditResponse {
	code: number;
	msg: string;
	data: number | { credit?: number; credits?: number; balance?: number } | null;
}

interface KieAccountInfoResponse {
	code: number;
	msg: string;
	data: {
		credit?: number;
		credits?: number;
		balance?: number;
		[key: string]: unknown;
	} | null;
}

function extractCredits(data: unknown): number | null {
	if (typeof data === 'number') return data;
	if (data && typeof data === 'object') {
		const obj = data as Record<string, unknown>;
		// Try common field names for credit balance
		for (const key of ['credit', 'credits', 'balance', 'remaining', 'amount']) {
			if (typeof obj[key] === 'number') return obj[key] as number;
		}
	}
	return null;
}

export async function getCreditInfo(): Promise<CreditInfo> {
	const apiKey = getEffectiveApiKey();
	if (!apiKey) {
		throw new Error('No API key configured');
	}

	const headers: Record<string, string> = {
		Authorization: `Bearer ${apiKey}`
	};

	// Strategy 1: Try /chat/credit (documented in quickstart)
	try {
		const response = await fetch(`${KIE_API_BASE}/chat/credit`, {
			method: 'GET',
			headers
		});

		if (response.ok) {
			const result = (await response.json()) as KieCreditResponse;
			if (result.code === 200) {
				const credits = extractCredits(result.data);
				if (credits !== null) {
					return { credits };
				}
			}
		}
	} catch {
		// Fall through to next strategy
	}

	// Strategy 2: Try /account/info (used in validation, may contain credit info)
	try {
		const response = await fetch(`${KIE_API_BASE}/account/info`, {
			method: 'GET',
			headers
		});

		if (response.ok) {
			const result = (await response.json()) as KieAccountInfoResponse;
			if (result.code === 200 && result.data) {
				const credits = extractCredits(result.data);
				if (credits !== null) {
					return { credits };
				}
			}
		}
	} catch {
		// Fall through
	}

	throw new Error('Unable to retrieve credit information from KIE API');
}
