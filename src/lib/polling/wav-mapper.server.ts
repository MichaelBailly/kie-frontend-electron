import type { WavDetailsResponse } from '$lib/kie-api.server';

export interface WavCompletionMapping {
	wavUrl: string;
	responseData: string;
	ssePayload: {
		status: 'success';
		wav_url: string;
	};
}

export function mapWavCompletion(details: WavDetailsResponse): WavCompletionMapping | null {
	const wavUrl = details.data.response?.audioWavUrl;
	if (!wavUrl) {
		return null;
	}

	return {
		wavUrl,
		responseData: JSON.stringify(details.data),
		ssePayload: {
			status: 'success',
			wav_url: wavUrl
		}
	};
}
