<script lang="ts">
	import type { StyleCollection } from '$lib/types';
	import { tick } from 'svelte';

	let {
		onSelect
	}: {
		onSelect: (style: StyleCollection) => void;
	} = $props();

	let isOpen = $state(false);
	let query = $state('');
	let styles = $state<StyleCollection[]>([]);
	let loading = $state(false);
	let panelEl: HTMLDivElement | undefined = $state();
	let inputEl: HTMLInputElement | undefined = $state();

	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function fetchStyles(q: string) {
		loading = true;
		try {
			const qParam = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : '';
			const res = await fetch(`/api/style-collection?limit=12${qParam}`);
			if (!res.ok) return;
			const data = await res.json();
			styles = data.styles;
		} catch {
			// ignore
		} finally {
			loading = false;
		}
	}

	async function open() {
		isOpen = true;
		void fetchStyles(query);
		await tick();
		inputEl?.focus();
	}

	function close() {
		isOpen = false;
		query = '';
	}

	function handleSearchInput() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => fetchStyles(query), 200);
	}

	function pick(style: StyleCollection) {
		onSelect(style);
		close();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	function handleOutsideClick(e: MouseEvent) {
		if (panelEl && !panelEl.contains(e.target as Node)) close();
	}

	$effect(() => {
		document.addEventListener('mousedown', handleOutsideClick);
		return () => document.removeEventListener('mousedown', handleOutsideClick);
	});

	$effect(() => {
		return () => {
			if (debounceTimer) {
				clearTimeout(debounceTimer);
			}
		};
	});
</script>

<div class="relative" bind:this={panelEl}>
	<button
		type="button"
		onclick={open}
		class="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
		title="Pick from style collection"
	>
		<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
			/>
		</svg>
		My Styles
	</button>

	{#if isOpen}
		<div
			class="absolute top-full right-0 z-50 mt-1.5 w-md overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-black/10 dark:border-gray-700 dark:bg-gray-900"
			onkeydown={handleKeydown}
			role="dialog"
			tabindex="-1"
			aria-label="Style collection picker"
		>
			<!-- Search -->
			<div class="border-b border-gray-100 p-3 dark:border-gray-800">
				<div class="relative">
					<svg
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
						/>
					</svg>
					<input
						bind:this={inputEl}
						bind:value={query}
						oninput={handleSearchInput}
						onkeydown={handleKeydown}
						type="text"
						placeholder="Search styles…"
						class="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pr-3 pl-9 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-400/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-500 dark:focus:bg-gray-700"
					/>
				</div>
			</div>

			<!-- List -->
			<div class="max-h-72 overflow-y-auto">
				{#if loading}
					<div class="flex items-center justify-center py-8">
						<svg class="h-5 w-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					</div>
				{:else if styles.length === 0}
					<div class="py-10 text-center">
						<div
							class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800"
						>
							<svg
								class="h-6 w-6 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
								/>
							</svg>
						</div>
						<p class="text-sm font-medium text-gray-900 dark:text-gray-100">
							{query.trim() ? 'No styles match' : 'No styles saved yet'}
						</p>
						<p class="mt-1 text-xs text-gray-500">
							{query.trim() ? 'Try a different search' : 'Save a style from a song page'}
						</p>
					</div>
				{:else}
					{#each styles as s (s.id)}
						<button
							type="button"
							onclick={() => pick(s)}
							class="group w-full border-b border-gray-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-indigo-50 dark:border-gray-800 dark:hover:bg-indigo-900/20"
						>
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<p
										class="truncate text-sm font-semibold text-gray-900 group-hover:text-indigo-700 dark:text-gray-100 dark:group-hover:text-indigo-300"
									>
										{s.name}
									</p>
									{#if s.description}
										<p class="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
											{s.description}
										</p>
									{/if}
									<p
										class="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300"
									>
										{s.style}
									</p>
								</div>
								<span
									class="shrink-0 rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-indigo-900/50 dark:text-indigo-300"
								>
									Use
								</span>
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	{/if}
</div>
