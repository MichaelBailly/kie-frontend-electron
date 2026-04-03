import type { Generation } from '$lib/types';
import { prepareStmt } from '../database.server';

export interface GenerationTrackUpdate {
	streamUrl?: string;
	audioUrl?: string;
	imageUrl?: string;
	duration?: number;
	audioId?: string;
}

export interface CompletedGenerationTrack {
	streamUrl: string;
	audioUrl: string;
	imageUrl: string;
	duration: number;
	audioId: string;
}

export interface ExtendedParentGeneration extends Generation {
	project_name: string;
	extension_count: number;
}

export function touchProject(projectId: number): void {
	prepareStmt('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(projectId);
}
