import type { StemSeparationDetailsResponse } from '$lib/kie-api.server';

export interface StemCompletionData {
	vocalUrl?: string;
	instrumentalUrl?: string;
	backingVocalsUrl?: string;
	drumsUrl?: string;
	bassUrl?: string;
	guitarUrl?: string;
	keyboardUrl?: string;
	pianoUrl?: string;
	percussionUrl?: string;
	stringsUrl?: string;
	synthUrl?: string;
	fxUrl?: string;
	brassUrl?: string;
	woodwindsUrl?: string;
}

export interface StemCompletionMapping {
	data: StemCompletionData;
	responseData: string;
	ssePayload: {
		status: 'success';
		vocal_url: string | null;
		instrumental_url: string | null;
		backing_vocals_url: string | null;
		drums_url: string | null;
		bass_url: string | null;
		guitar_url: string | null;
		keyboard_url: string | null;
		piano_url: string | null;
		percussion_url: string | null;
		strings_url: string | null;
		synth_url: string | null;
		fx_url: string | null;
		brass_url: string | null;
		woodwinds_url: string | null;
	};
}

export function mapStemCompletion(
	details: StemSeparationDetailsResponse
): StemCompletionMapping | null {
	const response = details.data.response;
	if (!response) {
		return null;
	}

	const data: StemCompletionData = {
		vocalUrl: response.vocalUrl || undefined,
		instrumentalUrl: response.instrumentalUrl || undefined,
		backingVocalsUrl: response.backingVocalsUrl || undefined,
		drumsUrl: response.drumsUrl || undefined,
		bassUrl: response.bassUrl || undefined,
		guitarUrl: response.guitarUrl || undefined,
		keyboardUrl: response.keyboardUrl || undefined,
		pianoUrl: response.pianoUrl || undefined,
		percussionUrl: response.percussionUrl || undefined,
		stringsUrl: response.stringsUrl || undefined,
		synthUrl: response.synthUrl || undefined,
		fxUrl: response.fxUrl || undefined,
		brassUrl: response.brassUrl || undefined,
		woodwindsUrl: response.woodwindsUrl || undefined
	};

	return {
		data,
		responseData: JSON.stringify(details.data),
		ssePayload: {
			status: 'success',
			vocal_url: response.vocalUrl,
			instrumental_url: response.instrumentalUrl,
			backing_vocals_url: response.backingVocalsUrl,
			drums_url: response.drumsUrl,
			bass_url: response.bassUrl,
			guitar_url: response.guitarUrl,
			keyboard_url: response.keyboardUrl,
			piano_url: response.pianoUrl,
			percussion_url: response.percussionUrl,
			strings_url: response.stringsUrl,
			synth_url: response.synthUrl,
			fx_url: response.fxUrl,
			brass_url: response.brassUrl,
			woodwinds_url: response.woodwindsUrl
		}
	};
}
