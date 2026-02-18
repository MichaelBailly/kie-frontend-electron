import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { audioStore } from '$lib/stores/audio.svelte';
import type {
	Generation,
	Project,
	SSEMessage,
	StemSeparation,
	VariationAnnotation
} from '$lib/types';
import { SvelteMap } from 'svelte/reactivity';
import { showCompletionNotification } from './notifications';

type ProjectWithGenerations = Project & { generations: Generation[] };

type ProjectLayoutData = {
	projects: ProjectWithGenerations[];
	activeProject: ProjectWithGenerations;
	annotations?: VariationAnnotation[];
};

function isGenerationInProgress(status: string) {
	return ['pending', 'processing', 'text_success', 'first_success'].includes(status);
}

export function useProjectState(getData: () => ProjectLayoutData) {
	let projects = $state<ProjectWithGenerations[]>([]);
	const stemSeparationUpdates = new SvelteMap<number, Partial<StemSeparation>>();
	const annotationsMap = new SvelteMap<string, VariationAnnotation>();

	$effect(() => {
		const data = getData();
		projects = data.projects;
		annotationsMap.clear();
		for (const annotation of data.annotations ?? []) {
			annotationsMap.set(`${annotation.generation_id}:${annotation.audio_id}`, annotation);
		}
	});

	const activeProjectId = $derived(getData().activeProject.id);
	const activeProject = $derived(
		projects.find((project) => project.id === activeProjectId) ?? getData().activeProject
	);
	const generations = $derived(activeProject?.generations ?? []);

	const selectedGenerationId = $derived.by(() => {
		const match = page.url.pathname.match(/\/projects\/\d+\/generations\/(\d+)/);
		return match ? parseInt(match[1]) : null;
	});

	function handleSseMessage(message: SSEMessage) {
		if (
			message.type === 'stem_separation_update' ||
			message.type === 'stem_separation_complete' ||
			message.type === 'stem_separation_error'
		) {
			if (message.stemSeparationId) {
				stemSeparationUpdates.set(
					message.stemSeparationId,
					message.data as Partial<StemSeparation>
				);
			}
			return;
		}

		if (message.type === 'annotation_update') {
			if (message.audioId) {
				const key = `${message.generationId}:${message.audioId}`;
				annotationsMap.set(key, message.data as VariationAnnotation);
			}
			return;
		}

		updateLocalGeneration(message.generationId, message.data as Partial<Generation>);
	}

	function updateLocalGeneration(generationId: number, generationPatch: Partial<Generation>) {
		const generationExists = projects.some((project) =>
			project.generations.some((generation) => generation.id === generationId)
		);

		if (!generationExists) {
			void refetchProjectGenerations(activeProjectId);
			return;
		}

		projects = projects.map((project) => ({
			...project,
			generations: project.generations.map((generation) =>
				generation.id === generationId ? { ...generation, ...generationPatch } : generation
			)
		}));

		const updatedGeneration = projects
			.flatMap((project) => project.generations)
			.find((generation) => generation.id === generationId);

		if (!updatedGeneration) return;

		if (generationPatch.status === 'success') {
			showCompletionNotification(updatedGeneration);
		}

		if (
			updatedGeneration.track1_audio_id &&
			(generationPatch.track1_audio_url || generationPatch.track1_stream_url)
		) {
			audioStore.updateTrackUrls(updatedGeneration.track1_audio_id, {
				streamUrl: generationPatch.track1_stream_url,
				audioUrl: generationPatch.track1_audio_url,
				duration: generationPatch.track1_duration
			});
		}

		if (
			updatedGeneration.track2_audio_id &&
			(generationPatch.track2_audio_url || generationPatch.track2_stream_url)
		) {
			audioStore.updateTrackUrls(updatedGeneration.track2_audio_id, {
				streamUrl: generationPatch.track2_stream_url,
				audioUrl: generationPatch.track2_audio_url,
				duration: generationPatch.track2_duration
			});
		}
	}

	async function refetchProjectGenerations(projectId: number) {
		try {
			const response = await fetch(`/api/projects/${projectId}`);
			if (!response.ok) return;

			const projectData = await response.json();
			projects = projects.map((project) =>
				project.id === projectId ? { ...project, generations: projectData.generations } : project
			);
		} catch (error) {
			console.error('Failed to refetch generations:', error);
		}
	}

	async function createNewProject() {
		const response = await fetch('/api/projects', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: `Project ${projects.length + 1}` })
		});

		if (!response.ok) return;

		const newProject = await response.json();
		projects = [...projects, { ...newProject, generations: [] }];

		await goto(
			resolve('/projects/[projectId]', {
				projectId: String(newProject.id)
			})
		);
	}

	async function closeProjectTab(projectId: number) {
		await fetch(`/api/projects/${projectId}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ is_open: false })
		});

		const projectIndex = projects.findIndex((project) => project.id === projectId);
		projects = projects.filter((project) => project.id !== projectId);

		if (projectId !== activeProjectId) return;

		const nextProject = projects[projectIndex] ?? projects[projectIndex - 1] ?? projects[0];
		if (nextProject) {
			await goto(
				resolve('/projects/[projectId]', {
					projectId: String(nextProject.id)
				})
			);
			return;
		}

		await goto(resolve('/'));
	}

	return {
		get projects() {
			return projects;
		},
		get activeProjectId() {
			return activeProjectId;
		},
		get activeProject() {
			return activeProject;
		},
		get generations() {
			return generations;
		},
		get selectedGenerationId() {
			return selectedGenerationId;
		},
		get stemSeparationUpdates() {
			return stemSeparationUpdates;
		},
		get annotationsMap() {
			return annotationsMap;
		},
		hasAnyGenerationInProgress(projectId: number) {
			const project = projects.find((candidate) => candidate.id === projectId);
			if (!project) return false;
			return project.generations.some((generation) => isGenerationInProgress(generation.status));
		},
		handleSseMessage,
		createNewProject,
		closeProjectTab
	};
}
