import type { MusicDetailsResponse } from '$lib/kie-api.server';

export interface GenerationTrackData {
	streamUrl: string;
	audioUrl: string;
	imageUrl: string;
	duration: number;
	audioId: string;
}

export interface GenerationTrackUpdate {
	streamUrl?: string;
	imageUrl?: string;
	audioId?: string;
}

export interface GenerationCompletionMapping {
	track1: GenerationTrackData;
	track2: GenerationTrackData;
	responseData: string;
	ssePayload: {
		status: 'success';
		track1_stream_url: string;
		track1_audio_url: string;
		track1_image_url: string;
		track1_duration: number;
		track1_audio_id: string;
		track2_stream_url: string;
		track2_audio_url: string;
		track2_image_url: string;
		track2_duration: number;
		track2_audio_id: string;
		response_data: string;
	};
}

export interface GenerationProgressMapping {
	status: string;
	trackUpdate?: {
		track1: GenerationTrackUpdate;
		track2: GenerationTrackUpdate;
		ssePayload: {
			status: string;
			track1_stream_url?: string;
			track1_image_url?: string;
			track2_stream_url?: string;
			track2_image_url?: string;
		};
	};
	ssePayload: {
		status: string;
	};
}

export function mapGenerationCompletion(
	details: MusicDetailsResponse
): GenerationCompletionMapping | null {
	const sunoData = details.data.response?.sunoData || [];
	const track1 = sunoData[0];
	const track2 = sunoData[1];

	if (!track1 || !track2) {
		return null;
	}

	const mappedTrack1: GenerationTrackData = {
		streamUrl: track1.streamAudioUrl,
		audioUrl: track1.audioUrl,
		imageUrl: track1.imageUrl,
		duration: track1.duration,
		audioId: track1.id
	};
	const mappedTrack2: GenerationTrackData = {
		streamUrl: track2.streamAudioUrl,
		audioUrl: track2.audioUrl,
		imageUrl: track2.imageUrl,
		duration: track2.duration,
		audioId: track2.id
	};
	const responseData = JSON.stringify(details.data);

	return {
		track1: mappedTrack1,
		track2: mappedTrack2,
		responseData,
		ssePayload: {
			status: 'success',
			track1_stream_url: mappedTrack1.streamUrl,
			track1_audio_url: mappedTrack1.audioUrl,
			track1_image_url: mappedTrack1.imageUrl,
			track1_duration: mappedTrack1.duration,
			track1_audio_id: mappedTrack1.audioId,
			track2_stream_url: mappedTrack2.streamUrl,
			track2_audio_url: mappedTrack2.audioUrl,
			track2_image_url: mappedTrack2.imageUrl,
			track2_duration: mappedTrack2.duration,
			track2_audio_id: mappedTrack2.audioId,
			response_data: responseData
		}
	};
}

export function mapGenerationProgress(details: MusicDetailsResponse): GenerationProgressMapping {
	const status = details.data.status;
	const statusMap: Record<string, string> = {
		PENDING: 'processing',
		TEXT_SUCCESS: 'text_success',
		FIRST_SUCCESS: 'first_success'
	};
	const normalizedStatus = statusMap[status] || 'processing';

	if (
		(status === 'TEXT_SUCCESS' || status === 'FIRST_SUCCESS') &&
		details.data.response?.sunoData
	) {
		const sunoData = details.data.response.sunoData;
		const track1 = sunoData[0];
		const track2 = sunoData[1];

		if (track1?.streamAudioUrl || track2?.streamAudioUrl) {
			return {
				status: normalizedStatus,
				trackUpdate: {
					track1: {
						streamUrl: track1?.streamAudioUrl,
						imageUrl: track1?.imageUrl,
						audioId: track1?.id
					},
					track2: {
						streamUrl: track2?.streamAudioUrl,
						imageUrl: track2?.imageUrl,
						audioId: track2?.id
					},
					ssePayload: {
						status: normalizedStatus,
						track1_stream_url: track1?.streamAudioUrl,
						track1_image_url: track1?.imageUrl,
						track2_stream_url: track2?.streamAudioUrl,
						track2_image_url: track2?.imageUrl
					}
				},
				ssePayload: { status: normalizedStatus }
			};
		}
	}

	return {
		status: normalizedStatus,
		ssePayload: { status: normalizedStatus }
	};
}
