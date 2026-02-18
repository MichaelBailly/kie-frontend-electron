import type {
	Project,
	Generation,
	StemSeparation,
	StemSeparationType,
	VariationAnnotation,
	Label,
	Setting
} from '$lib/types';
import {
	fixtureTimestamp,
	nextAnnotationFixtureId,
	nextGenerationFixtureId,
	nextLabelFixtureId,
	nextProjectFixtureId,
	nextStemSeparationFixtureId
} from './state';

export function createProject(overrides: Partial<Project> = {}): Project {
	const id = overrides.id ?? nextProjectFixtureId();
	return {
		id,
		name: `Test Project ${id}`,
		is_open: true,
		created_at: fixtureTimestamp(),
		updated_at: fixtureTimestamp(),
		...overrides
	};
}

export function createGeneration(overrides: Partial<Generation> = {}): Generation {
	const id = overrides.id ?? nextGenerationFixtureId();
	return {
		id,
		project_id: overrides.project_id ?? 1,
		task_id: null,
		title: `Test Generation ${id}`,
		style: 'pop, upbeat',
		lyrics: 'La la la',
		status: 'pending',
		error_message: null,
		track1_stream_url: null,
		track1_audio_url: null,
		track1_image_url: null,
		track1_duration: null,
		track2_stream_url: null,
		track2_audio_url: null,
		track2_image_url: null,
		track2_duration: null,
		track1_audio_id: null,
		track2_audio_id: null,
		response_data: null,
		extends_generation_id: null,
		extends_audio_id: null,
		continue_at: null,
		created_at: fixtureTimestamp(),
		updated_at: fixtureTimestamp(),
		...overrides
	};
}

export function createCompletedGeneration(overrides: Partial<Generation> = {}): Generation {
	const id = overrides.id ?? nextGenerationFixtureId();
	return createGeneration({
		id,
		status: 'success',
		task_id: `task-${id}`,
		track1_stream_url: `https://cdn.example.com/stream/${id}/track1.mp3`,
		track1_audio_url: `https://cdn.example.com/audio/${id}/track1.mp3`,
		track1_image_url: `https://cdn.example.com/img/${id}/track1.jpg`,
		track1_duration: 180,
		track1_audio_id: `audio-${id}-1`,
		track2_stream_url: `https://cdn.example.com/stream/${id}/track2.mp3`,
		track2_audio_url: `https://cdn.example.com/audio/${id}/track2.mp3`,
		track2_image_url: `https://cdn.example.com/img/${id}/track2.jpg`,
		track2_duration: 175,
		track2_audio_id: `audio-${id}-2`,
		response_data: JSON.stringify({ taskId: `task-${id}` }),
		...overrides
	});
}

export function createErrorGeneration(overrides: Partial<Generation> = {}): Generation {
	const id = overrides.id ?? nextGenerationFixtureId();
	return createGeneration({
		id,
		status: 'error',
		error_message: 'Generation failed: API timeout',
		...overrides
	});
}

export function createExtendGeneration(overrides: Partial<Generation> = {}): Generation {
	const id = overrides.id ?? nextGenerationFixtureId();
	return createGeneration({
		id,
		extends_generation_id: 1,
		extends_audio_id: 'audio-1-1',
		continue_at: 180,
		...overrides
	});
}

export function createStemSeparation(overrides: Partial<StemSeparation> = {}): StemSeparation {
	const id = overrides.id ?? nextStemSeparationFixtureId();
	return {
		id,
		generation_id: overrides.generation_id ?? 1,
		audio_id: overrides.audio_id ?? 'audio-1-1',
		task_id: null,
		type: 'separate_vocal' as StemSeparationType,
		status: 'pending',
		error_message: null,
		vocal_url: null,
		instrumental_url: null,
		backing_vocals_url: null,
		drums_url: null,
		bass_url: null,
		guitar_url: null,
		keyboard_url: null,
		piano_url: null,
		percussion_url: null,
		strings_url: null,
		synth_url: null,
		fx_url: null,
		brass_url: null,
		woodwinds_url: null,
		response_data: null,
		created_at: fixtureTimestamp(),
		updated_at: fixtureTimestamp(),
		...overrides
	};
}

export function createCompletedStemSeparation(
	overrides: Partial<StemSeparation> = {}
): StemSeparation {
	const id = overrides.id ?? nextStemSeparationFixtureId();
	return createStemSeparation({
		id,
		status: 'success',
		task_id: `stem-task-${id}`,
		vocal_url: `https://cdn.example.com/stems/${id}/vocal.mp3`,
		instrumental_url: `https://cdn.example.com/stems/${id}/instrumental.mp3`,
		response_data: JSON.stringify({ taskId: `stem-task-${id}` }),
		...overrides
	});
}

export function createAnnotation(
	overrides: Partial<VariationAnnotation> = {}
): VariationAnnotation {
	const id = overrides.id ?? nextAnnotationFixtureId();
	return {
		id,
		generation_id: overrides.generation_id ?? 1,
		audio_id: overrides.audio_id ?? 'audio-1-1',
		starred: 0,
		comment: null,
		labels: [],
		created_at: fixtureTimestamp(),
		updated_at: fixtureTimestamp(),
		...overrides
	};
}

export function createStarredAnnotation(
	overrides: Partial<VariationAnnotation> = {}
): VariationAnnotation {
	const id = overrides.id ?? nextAnnotationFixtureId();
	return createAnnotation({
		id,
		starred: 1,
		comment: 'Great variation!',
		labels: ['favorite', 'verse'],
		...overrides
	});
}

export function createLabel(overrides: Partial<Label> = {}): Label {
	const id = overrides.id ?? nextLabelFixtureId();
	return {
		id,
		name: `label-${id}`,
		created_at: fixtureTimestamp(),
		updated_at: fixtureTimestamp(),
		last_used_at: fixtureTimestamp(),
		...overrides
	};
}

export function createSetting(overrides: Partial<Setting> = {}): Setting {
	return {
		key: overrides.key ?? 'test_setting',
		value: overrides.value ?? 'test_value',
		created_at: fixtureTimestamp(),
		updated_at: fixtureTimestamp(),
		...overrides
	};
}
