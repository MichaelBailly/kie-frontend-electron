import { error } from '@sveltejs/kit';
import { parseJsonBody } from '$lib/api-helpers.server';

export interface ImportRequestInput {
	taskId: string;
	projectName?: string;
}

export async function parseImportRequest(request: Request): Promise<ImportRequestInput> {
	const body = await parseJsonBody(request);

	if (typeof body.taskId !== 'string') {
		throw error(400, 'Task ID is required and must be a string');
	}

	const taskId = body.taskId.trim();
	if (!taskId) {
		throw error(400, 'Task ID cannot be empty');
	}

	let projectName: string | undefined;
	if (body.projectName !== undefined) {
		if (typeof body.projectName !== 'string') {
			throw error(400, 'projectName must be a string');
		}
		projectName = body.projectName;
	}

	return {
		taskId,
		projectName
	};
}
