// Shared types between server and client

export type SunoModel = 'V5' | 'V5_5';

export const DEFAULT_SUNO_MODEL: SunoModel = 'V5';

export const SUNO_MODELS: Array<{ value: SunoModel; label: string }> = [
	{ value: 'V5', label: 'V5' },
	{ value: 'V5_5', label: 'V5.5' }
];

export function getModelLabel(model: SunoModel): string {
	return SUNO_MODELS.find((m) => m.value === model)?.label ?? model;
}

export interface Project {
	id: number;
	name: string;
	is_open: boolean;
	created_at: string;
	updated_at: string;
}

export interface Generation {
	id: number;
	project_id: number;
	task_id: string | null;
	title: string;
	style: string;
	lyrics: string;
	status: string;
	error_message: string | null;
	track1_stream_url: string | null;
	track1_audio_url: string | null;
	track1_image_url: string | null;
	track1_audio_local_url?: string | null;
	track1_image_local_url?: string | null;
	track1_duration: number | null;
	track2_stream_url: string | null;
	track2_audio_url: string | null;
	track2_image_url: string | null;
	track2_audio_local_url?: string | null;
	track2_image_local_url?: string | null;
	track2_duration: number | null;
	track1_audio_id: string | null;
	track2_audio_id: string | null;
	response_data: string | null;
	extends_generation_id: number | null;
	extends_audio_id: string | null;
	continue_at: number | null;
	extends_stem_type: string | null;
	extends_stem_url: string | null;
	instrumental: number;
	generation_type: string;
	negative_tags: string | null;
	source_audio_local_url?: string | null;
	model: SunoModel;
	created_at: string;
	updated_at: string;
}

export type StemSeparationType = 'separate_vocal' | 'split_stem';

export interface StemSeparation {
	id: number;
	generation_id: number;
	audio_id: string;
	task_id: string | null;
	type: StemSeparationType;
	status: string;
	error_message: string | null;
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
	response_data: string | null;
	created_at: string;
	updated_at: string;
}

export interface WavConversion {
	id: number;
	generation_id: number;
	audio_id: string;
	task_id: string | null;
	status: string;
	error_message: string | null;
	wav_url: string | null;
	response_data: string | null;
	created_at: string;
	updated_at: string;
}

export interface VariationAnnotation {
	id: number;
	generation_id: number;
	audio_id: string;
	starred: number;
	comment: string | null;
	labels: string[];
	created_at: string;
	updated_at: string;
}

export interface Label {
	id: number;
	name: string;
	created_at: string;
	updated_at: string;
	last_used_at: string;
}

export interface Setting {
	key: string;
	value: string;
	created_at: string;
	updated_at: string;
}

export interface StyleCollection {
	id: number;
	name: string;
	description: string;
	style: string;
	created_at: string;
	updated_at: string;
}

export interface SSEMessage {
	type:
		| 'generation_update'
		| 'generation_complete'
		| 'generation_error'
		| 'stem_separation_update'
		| 'stem_separation_complete'
		| 'stem_separation_error'
		| 'wav_conversion_update'
		| 'wav_conversion_complete'
		| 'wav_conversion_error'
		| 'annotation_update';
	generationId: number;
	data:
		| Partial<Generation>
		| Partial<StemSeparation>
		| Partial<WavConversion>
		| Partial<VariationAnnotation>;
	stemSeparationId?: number;
	wavConversionId?: number;
	audioId?: string;
}

export type GenerationStatus =
	| 'pending'
	| 'processing'
	| 'text_success'
	| 'first_success'
	| 'success'
	| 'error';

export type GenerationType =
	| 'generate'
	| 'extend'
	| 'add_instrumental'
	| 'add_vocals'
	| 'upload_instrumental'
	| 'upload_vocals';

const generationTypeLabels: Record<GenerationType, string> = {
	generate: 'Generated',
	extend: 'Extended',
	add_instrumental: 'Instrumental',
	add_vocals: 'Vocals',
	upload_instrumental: 'Upload Instrumental',
	upload_vocals: 'Upload Vocals'
};

export function isGenerationType(value: string): value is GenerationType {
	return value in generationTypeLabels;
}

export function isGenerationTypeOneOf(
	value: string,
	allowed: readonly GenerationType[]
): value is GenerationType {
	return isGenerationType(value) && allowed.includes(value);
}

export function getGenerationTypeLabel(value: string): string {
	if (!isGenerationType(value)) {
		return value;
	}

	return generationTypeLabels[value];
}

export function getStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		pending: 'Pending',
		processing: 'Processing',
		text_success: 'Generating audio...',
		first_success: 'Finishing up...',
		success: 'Complete',
		error: 'Failed'
	};
	return labels[status] || status;
}

export function isGenerating(status: string): boolean {
	return ['pending', 'processing', 'text_success', 'first_success'].includes(status);
}
