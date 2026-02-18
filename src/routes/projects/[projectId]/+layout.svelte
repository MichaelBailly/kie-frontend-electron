<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve */
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';
	import type { StemSeparation, VariationAnnotation } from '$lib/types';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { onDestroy, onMount, setContext } from 'svelte';
	import { resolve } from '$app/paths';
	import { useProjectState } from '$lib/routes/project/useProjectState.svelte';
	import { useSSEConnection } from '$lib/routes/project/useSSEConnection.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const projectState = useProjectState(() => data);
	const sseConnection = useSSEConnection({
		onMessage: (message) => projectState.handleSseMessage(message)
	});

	let projects = $derived(projectState.projects);
	let activeProjectId = $derived(projectState.activeProjectId);
	let activeProject = $derived(projectState.activeProject);
	let generations = $derived(projectState.generations);
	let selectedGenerationId = $derived(projectState.selectedGenerationId);
	let annotationsMap = $derived(projectState.annotationsMap);

	// Share live activeProject and stem separation updates via context
	setContext('activeProject', {
		get current() {
			return activeProject;
		}
	});

	setContext('stemSeparations', {
		get updates() {
			return projectState.stemSeparationUpdates;
		},
		set: (id: number, data: Partial<StemSeparation>) => {
			projectState.stemSeparationUpdates.set(id, data);
		}
	});

	// Share annotations via context for child components
	setContext('annotations', {
		get map() {
			return projectState.annotationsMap;
		},
		get: (generationId: number, audioId: string): VariationAnnotation | undefined => {
			return projectState.annotationsMap.get(`${generationId}:${audioId}`);
		},
		isStarred: (generationId: number, audioId: string): boolean => {
			const ann = projectState.annotationsMap.get(`${generationId}:${audioId}`);
			return ann?.starred === 1;
		},
		hasAnyStarred: (generationId: number): boolean => {
			for (const [key, ann] of projectState.annotationsMap) {
				if (key.startsWith(`${generationId}:`) && ann.starred === 1) return true;
			}
			return false;
		}
	});

	// SSE connection for real-time updates
	onMount(() => {
		sseConnection.connect();
	});

	onDestroy(() => {
		sseConnection.disconnect();
	});

	async function createNewProject() {
		await projectState.createNewProject();
	}

	async function closeTab(projectId: number, event: Event) {
		event.stopPropagation();
		event.preventDefault();
		await projectState.closeProjectTab(projectId);
	}
</script>

<div class="flex h-screen flex-col bg-gray-100 dark:bg-gray-950">
	<!-- Tabs header -->
	<div
		class="flex items-center border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
	>
		<div class="flex flex-1 items-center overflow-x-auto" role="tablist">
			{#each projects as project (project.id)}
				<a
					href={project.generations.length > 0
						? resolve('/projects/[projectId]/generations/[generationId]', {
								projectId: String(project.id),
								generationId: String(project.generations[0].id)
							})
						: resolve('/projects/[projectId]', {
								projectId: String(project.id)
							})}
					class="group relative flex max-w-50 min-w-0 shrink-0 items-center gap-2 border-r border-gray-200 px-4 py-3 text-sm font-medium transition-colors dark:border-gray-700 {project.id ===
					activeProjectId
						? 'bg-gray-100 text-indigo-600 dark:bg-gray-800 dark:text-indigo-400'
						: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200'}"
					role="tab"
					tabindex="0"
					aria-selected={project.id === activeProjectId}
				>
					<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
						/>
					</svg>
					<span class="truncate">{project.name}</span>
					{#if projectState.hasAnyGenerationInProgress(project.id)}
						<span class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500"></span>
					{/if}
					<button
						onclick={(e) => closeTab(project.id, e)}
						aria-label="Close tab"
						class="ml-1 shrink-0 rounded-full p-0.5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					>
						<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
					{#if project.id === activeProjectId}
						<div
							class="absolute right-0 bottom-0 left-0 h-0.5 bg-indigo-600 dark:bg-indigo-400"
						></div>
					{/if}
				</a>
			{/each}
		</div>

		<!-- Projects link -->
		<a
			href={resolve('/')}
			class="flex h-full shrink-0 items-center gap-1.5 border-l border-gray-200 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
			title="View all projects"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
				/>
			</svg>
			<span class="hidden sm:inline">Projects</span>
		</a>

		<!-- New tab button -->
		<button
			onclick={createNewProject}
			class="flex h-full shrink-0 items-center gap-1.5 border-l border-gray-200 px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			<span class="hidden sm:inline">New Project</span>
		</button>
	</div>

	<!-- Main content -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar with generations list -->
		<div class="w-80 shrink-0">
			<Sidebar project={activeProject} {generations} {selectedGenerationId} {annotationsMap} />
		</div>

		<!-- Generation form / details -->
		<div class="flex-1 overflow-y-auto bg-white dark:bg-gray-800">
			{@render children()}
		</div>
	</div>
</div>
