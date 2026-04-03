import { getContext, setContext } from 'svelte';
import type { Generation, StemSeparation, VariationAnnotation, WavConversion } from '$lib/types';

const activeProjectContextKey = Symbol('active-project-context');
const stemSeparationsContextKey = Symbol('stem-separations-context');
const wavConversionsContextKey = Symbol('wav-conversions-context');
const annotationsContextKey = Symbol('annotations-context');

export interface ActiveProjectContext {
	current: {
		id: number;
		generations: Generation[];
	};
}

export interface StemSeparationsContext {
	updates: Map<number, Partial<StemSeparation>>;
	set: (id: number, data: Partial<StemSeparation>) => void;
}

export interface WavConversionsContext {
	updates: Map<number, Partial<WavConversion>>;
	set: (id: number, data: Partial<WavConversion>) => void;
}

export interface AnnotationsContext {
	map: Map<string, VariationAnnotation>;
	get: (generationId: number, audioId: string) => VariationAnnotation | undefined;
	isStarred: (generationId: number, audioId: string) => boolean;
	hasAnyStarred: (generationId: number) => boolean;
}

export function setActiveProjectContext(context: ActiveProjectContext): ActiveProjectContext {
	setContext(activeProjectContextKey, context);
	return context;
}

export function getActiveProjectContext(): ActiveProjectContext | undefined {
	return getContext<ActiveProjectContext | undefined>(activeProjectContextKey);
}

export function setStemSeparationsContext(context: StemSeparationsContext): StemSeparationsContext {
	setContext(stemSeparationsContextKey, context);
	return context;
}

export function getStemSeparationsContext(): StemSeparationsContext | undefined {
	return getContext<StemSeparationsContext | undefined>(stemSeparationsContextKey);
}

export function setWavConversionsContext(context: WavConversionsContext): WavConversionsContext {
	setContext(wavConversionsContextKey, context);
	return context;
}

export function getWavConversionsContext(): WavConversionsContext | undefined {
	return getContext<WavConversionsContext | undefined>(wavConversionsContextKey);
}

export function setAnnotationsContext(context: AnnotationsContext): AnnotationsContext {
	setContext(annotationsContextKey, context);
	return context;
}

export function getAnnotationsContext(): AnnotationsContext | undefined {
	return getContext<AnnotationsContext | undefined>(annotationsContextKey);
}
