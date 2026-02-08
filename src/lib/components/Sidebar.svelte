<script lang="ts">
	import type { Project, Generation, VariationAnnotation } from '$lib/types';
	import GenerationCard from './GenerationCard.svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	let {
		project,
		generations,
		selectedGenerationId,
		annotationsMap = new Map()
	}: {
		project: Project;
		generations: Generation[];
		selectedGenerationId: number | null;
		annotationsMap?: Map<string, VariationAnnotation>;
	} = $props();

	let isEditing = $state(false);
	let editedName = $state('');
	let inputElement: HTMLInputElement | undefined = $state();

	// Reset edited name when project changes
	$effect(() => {
		editedName = project.name;
	});

	function startEditing() {
		isEditing = true;
		editedName = project.name;
		// Focus input after it's rendered
		setTimeout(() => inputElement?.focus(), 0);
	}

	function cancelEditing() {
		isEditing = false;
		editedName = project.name;
	}

	async function saveProjectName() {
		const trimmedName = editedName.trim();
		if (!trimmedName || trimmedName === project.name) {
			cancelEditing();
			return;
		}

		try {
			const response = await fetch(`/api/projects/${project.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: trimmedName })
			});

			if (response.ok) {
				isEditing = false;
				await invalidateAll();
			}
		} catch (error) {
			console.error('Failed to rename project:', error);
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			saveProjectName();
		} else if (event.key === 'Escape') {
			cancelEditing();
		}
	}

	function hasAnyStarred(gen: Generation): boolean {
		if (gen.track1_audio_id && annotationsMap.get(`${gen.id}:${gen.track1_audio_id}`)?.starred === 1) return true;
		if (gen.track2_audio_id && annotationsMap.get(`${gen.id}:${gen.track2_audio_id}`)?.starred === 1) return true;
		return false;
	}

	let starredCount = $derived.by(() => {
		let count = 0;
		for (const ann of annotationsMap.values()) {
			if (ann.starred === 1) count++;
		}
		return count;
	});

	let isOnStarredPage = $derived(page.url.pathname.includes('/starred'));
</script>

<div
	class="flex h-full flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
>
	<!-- Header -->
	<div class="border-b border-gray-200 p-4 dark:border-gray-700">
		{#if isEditing}
			<div class="flex items-center gap-2">
				<input
					bind:this={inputElement}
					bind:value={editedName}
					onkeydown={handleKeydown}
					onblur={saveProjectName}
					type="text"
					class="min-w-0 flex-1 rounded border-gray-300 bg-white px-2 py-1 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
				/>
			</div>
		{:else}
			<div class="flex items-center gap-2">
				<h3 class="flex-1 truncate font-semibold text-gray-900 dark:text-gray-100">
					{project.name}
				</h3>
				<button
					onclick={startEditing}
					class="cursor-pointer rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					aria-label="Rename project"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
						/>
					</svg>
				</button>
			</div>
		{/if}
		<p class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
			<span>{generations.length} generation{generations.length !== 1 ? 's' : ''}</span>
			{#if starredCount > 0}
				<span class="text-gray-300 dark:text-gray-600">·</span>
				<a
					href="/projects/{project.id}/starred"
					class="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium transition-colors {isOnStarredPage
						? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400'
						: 'text-amber-500 hover:bg-amber-50 hover:text-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/30'}"
					title="View starred variations"
				>
					<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
						<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
					</svg>
					{starredCount} starred
				</a>
			{/if}
		</p>
	</div>

	<!-- New generation button -->
	<div class="p-3">
		<a
			href="/projects/{project.id}"
			class="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/30 dark:hover:text-indigo-400"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
			New Generation
		</a>
	</div>

	<!-- Generation list -->
	<div class="flex-1 space-y-2 overflow-y-auto p-3">
		{#each generations as generation (generation.id)}
			<a href="/projects/{project.id}/generations/{generation.id}">
				<GenerationCard {generation} selected={selectedGenerationId === generation.id} hasStarred={hasAnyStarred(generation)} />
			</a>
		{/each}

		{#if generations.length === 0}
			<div class="py-8 text-center text-gray-500 dark:text-gray-400">
				<svg
					class="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1.5"
						d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
					/>
				</svg>
				<p class="mt-3 text-sm">No generations yet</p>
				<p class="mt-1 text-xs">Create your first song!</p>
			</div>
		{/if}
	</div>
</div>
