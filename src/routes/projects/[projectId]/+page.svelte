<script lang="ts">
	import type { LayoutData } from './$types';
	import GenerationForm from '$lib/components/GenerationForm.svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import { browser } from '$app/environment';
	import { resolve } from '$app/paths';
	import { SvelteMap } from 'svelte/reactivity';
	import type { VariationAnnotation } from '$lib/types';

	let { data }: { data: LayoutData } = $props();

	// Storage key unique to this project
	let storageKey = $derived(`generation-form-${data.activeProject.id}`);

	// Form state managed here to enable persistence
	let title = $state('');
	let style = $state('');
	let lyrics = $state('');
	let labelFilterQuery = $state('');
	let selectedLabel = $state<string | null>(null);

	// Track initialization to prevent saving during initial load
	let isInitializing = $state(true);

	// Get latest generation for initial pre-fill
	let latestGeneration = $derived(
		data.activeProject.generations.length > 0 ? data.activeProject.generations[0] : null
	);

	// On mount or project change: restore from sessionStorage or pre-fill from latest generation
	$effect(() => {
		if (!browser) return;

		isInitializing = true;

		// Check for saved form state specific to this project
		const saved = sessionStorage.getItem(storageKey);
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				// Only use saved state if it has actual content
				if (parsed.title || parsed.style || parsed.lyrics) {
					title = parsed.title ?? '';
					style = parsed.style ?? '';
					lyrics = parsed.lyrics ?? '';
					isInitializing = false;
					return;
				}
			} catch {
				// Invalid JSON, fall through to pre-fill from latest generation
			}
		}

		// No saved state (or empty saved state), pre-fill from latest generation
		title = latestGeneration?.title || '';
		style = latestGeneration?.style || '';
		lyrics = latestGeneration?.lyrics || '';

		isInitializing = false;
	});

	// Save form state to sessionStorage on every change (but not during initialization)
	$effect(() => {
		if (!browser || isInitializing) return;
		sessionStorage.setItem(storageKey, JSON.stringify({ title, style, lyrics }));
	});

	async function handleNewGeneration(formTitle: string, formStyle: string, formLyrics: string) {
		const response = await fetch('/api/generations', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: data.activeProject.id,
				title: formTitle,
				style: formStyle,
				lyrics: formLyrics
			})
		});

		if (response.ok) {
			const newGeneration = await response.json();
			// Clear saved form state after successful generation
			sessionStorage.removeItem(storageKey);
			// Refresh data to get the latest generation
			await invalidateAll();
			// Navigate to the new generation
			await goto(resolve(`/projects/${data.activeProject.id}/generations/${newGeneration.id}`));
		}
	}

	function normalizeLabel(label: string): string {
		return label.trim().toLowerCase();
	}

	function formatLabel(label: string): string {
		const normalized = normalizeLabel(label);
		return normalized.replace(/(^|[\s/-])([a-z0-9])/g, (_match, sep, char) => {
			return `${sep}${char.toUpperCase()}`;
		});
	}

	interface LabeledVariation {
		generationId: number;
		audioId: string;
		trackNumber: number;
		generationTitle: string;
		style: string;
		imageUrl: string | null;
		duration: number | null;
		updatedAt: string;
	}

	interface LabelEntry {
		label: string;
		count: number;
		lastUsedAt: string;
		variations: LabeledVariation[];
	}

	let labelEntries = $derived.by(() => {
		const annotations = (data.annotations ?? []) as VariationAnnotation[];
		const map = new SvelteMap<string, LabelEntry>();
		const generations = data.activeProject.generations ?? [];

		for (const annotation of annotations) {
			if (!annotation.labels || annotation.labels.length === 0) continue;
			const generation = generations.find((g) => g.id === annotation.generation_id);
			if (!generation) continue;

			let variation: LabeledVariation | null = null;
			if (annotation.audio_id === generation.track1_audio_id) {
				variation = {
					generationId: generation.id,
					audioId: generation.track1_audio_id || '',
					trackNumber: 1,
					generationTitle: generation.title,
					style: generation.style,
					imageUrl: generation.track1_image_url,
					duration: generation.track1_duration,
					updatedAt: annotation.updated_at
				};
			} else if (annotation.audio_id === generation.track2_audio_id) {
				variation = {
					generationId: generation.id,
					audioId: generation.track2_audio_id || '',
					trackNumber: 2,
					generationTitle: generation.title,
					style: generation.style,
					imageUrl: generation.track2_image_url,
					duration: generation.track2_duration,
					updatedAt: annotation.updated_at
				};
			}

			if (!variation) continue;

			for (const label of annotation.labels) {
				const normalized = normalizeLabel(label);
				const entry = map.get(normalized) ?? {
					label: normalized,
					count: 0,
					lastUsedAt: annotation.updated_at,
					variations: []
				};
				entry.count += 1;
				entry.variations.push(variation);
				if (annotation.updated_at > entry.lastUsedAt) {
					entry.lastUsedAt = annotation.updated_at;
				}
				map.set(normalized, entry);
			}
		}

		return Array.from(map.values()).sort((a, b) => (a.lastUsedAt < b.lastUsedAt ? 1 : -1));
	});

	let filteredLabels = $derived.by(() => {
		const query = normalizeLabel(labelFilterQuery);
		if (!query) return labelEntries;
		return labelEntries.filter((entry) => entry.label.includes(query));
	});

	$effect(() => {
		if (filteredLabels.length === 0) {
			selectedLabel = null;
			return;
		}
		if (!selectedLabel || !filteredLabels.some((entry) => entry.label === selectedLabel)) {
			selectedLabel = filteredLabels[0].label;
		}
	});

	let activeLabelEntry = $derived(
		selectedLabel ? (filteredLabels.find((entry) => entry.label === selectedLabel) ?? null) : null
	);

	function formatDuration(seconds: number | null): string {
		if (!seconds || Number.isNaN(seconds)) return '0:00';
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<GenerationForm bind:title bind:style bind:lyrics onNewGeneration={handleNewGeneration} />

<section class="mt-10">
	<div class="mb-4 flex items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Labels</h2>
			<p class="text-sm text-gray-500 dark:text-gray-400">Browse variations by shared labels</p>
		</div>
		<span
			class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
		>
			{labelEntries.length} label{labelEntries.length === 1 ? '' : 's'}
		</span>
	</div>

	{#if labelEntries.length === 0}
		<div
			class="rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400"
		>
			No labels yet. Add labels to variations to start organizing your project.
		</div>
	{:else}
		<div class="grid gap-6 lg:grid-cols-[260px_1fr]">
			<div
				class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
			>
				<label
					for="label-filter-input"
					class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Filter</label
				>
				<input
					id="label-filter-input"
					value={labelFilterQuery}
					oninput={(event) => (labelFilterQuery = (event.target as HTMLInputElement).value)}
					placeholder="Search labels"
					class="mt-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 transition outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
				/>

				<div class="mt-4 max-h-[420px] space-y-1 overflow-y-auto pr-1">
					{#each filteredLabels as entry (entry.label)}
						<button
							onclick={() => (selectedLabel = entry.label)}
							class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors {selectedLabel ===
							entry.label
								? 'bg-indigo-50 text-indigo-700 shadow-sm dark:bg-indigo-900/30 dark:text-indigo-200'
								: 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/60'}"
						>
							<span class="truncate font-medium">{formatLabel(entry.label)}</span>
							<span class="text-xs text-gray-400">{entry.count}</span>
						</button>
					{/each}
				</div>
			</div>

			<div
				class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900/40"
			>
				{#if activeLabelEntry}
					<div class="mb-4 flex items-center justify-between">
						<div>
							<h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
								{formatLabel(activeLabelEntry.label)}
							</h3>
							<p class="text-xs text-gray-400">
								{activeLabelEntry.count} variation{activeLabelEntry.count === 1 ? '' : 's'}
							</p>
						</div>
						<span
							class="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200"
						>
							Label focus
						</span>
					</div>

					<div class="space-y-3">
						{#each activeLabelEntry.variations as variation (variation.audioId)}
							<a
								href={resolve(
									`/projects/${data.activeProject.id}/generations/${variation.generationId}/song/${variation.audioId}`
								)}
								class="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-700"
							>
								<div class="h-14 w-14 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
									{#if variation.imageUrl}
										<img
											src={variation.imageUrl}
											alt={variation.generationTitle}
											class="h-full w-full object-cover"
										/>
									{:else}
										<div
											class="flex h-full w-full items-center justify-center bg-linear-to-br from-indigo-500 to-purple-600"
										>
											<svg
												class="h-6 w-6 text-white"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
												/>
											</svg>
										</div>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<h4
											class="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-700 dark:text-gray-100 dark:group-hover:text-indigo-300"
										>
											{variation.generationTitle}
										</h4>
										<span
											class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300"
										>
											V{variation.trackNumber}
										</span>
									</div>
									<p class="mt-1 truncate text-xs text-gray-400">{variation.style}</p>
								</div>
								<div class="text-xs text-gray-400">
									{formatDuration(variation.duration)}
								</div>
							</a>
						{/each}
					</div>
				{:else}
					<div
						class="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-200 p-10 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
					>
						Select a label to view its variations.
					</div>
				{/if}
			</div>
		</div>
	{/if}
</section>
