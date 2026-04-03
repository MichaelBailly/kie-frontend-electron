<script lang="ts">
	import AddInstrumentalGenerationsList from '$lib/components/AddInstrumentalGenerationsList.svelte';
	import AddVocalsGenerationsList from '$lib/components/AddVocalsGenerationsList.svelte';
	import ExtendedGenerationsList from '$lib/components/ExtendedGenerationsList.svelte';
	import StemSeparationResults from '$lib/components/StemSeparationResults.svelte';
	import type { StemSeparation, WavConversion } from '$lib/types';

	type GenerationListItem = {
		id: number;
		project_id: number;
		title: string;
		status: string;
		continue_at?: number | null;
	};

	let {
		vocalSeparation,
		stemSeparation,
		pendingVocalSeparation,
		pendingStemSeparation,
		wavConversion,
		pendingWavConversion,
		projectId,
		songTitle,
		imageUrl,
		addVocalsGenerations,
		addInstrumentalGenerations,
		extendedGenerations,
		onExtendStem,
		onAddInstrumental,
		onAddVocals
	}: {
		vocalSeparation: StemSeparation | undefined;
		stemSeparation: StemSeparation | undefined;
		pendingVocalSeparation: StemSeparation | undefined;
		pendingStemSeparation: StemSeparation | undefined;
		wavConversion: WavConversion | undefined;
		pendingWavConversion: WavConversion | undefined;
		projectId: number;
		songTitle: string;
		imageUrl: string | null;
		addVocalsGenerations: GenerationListItem[];
		addInstrumentalGenerations: GenerationListItem[];
		extendedGenerations: GenerationListItem[];
		onExtendStem: (stemType: string, stemUrl: string) => void;
		onAddInstrumental: (stemType: string, stemUrl: string) => void;
		onAddVocals: (stemType: string, stemUrl: string) => void;
	} = $props();

	let stemsCollapsed = $state(false);
	let addVocalsCollapsed = $state(false);
	let addInstrumentalCollapsed = $state(false);
	let extensionsCollapsed = $state(false);

	const hasStemContent = $derived(
		!!vocalSeparation ||
			!!stemSeparation ||
			!!pendingVocalSeparation ||
			!!pendingStemSeparation ||
			!!wavConversion ||
			!!pendingWavConversion
	);
</script>

<div class="mt-4 space-y-4">
	{#if hasStemContent}
		<div
			class="overflow-hidden rounded-2xl border border-cyan-200/80 bg-linear-to-br from-cyan-50 to-white p-5 shadow-sm dark:border-cyan-800/50 dark:from-cyan-950/30 dark:to-gray-900"
		>
			<button
				onclick={() => (stemsCollapsed = !stemsCollapsed)}
				class="flex w-full cursor-pointer items-center justify-between"
			>
				<h3 class="flex items-center gap-2 text-sm font-semibold text-cyan-900 dark:text-cyan-100">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
						/>
					</svg>
					Stem Separation
					{#if pendingVocalSeparation || pendingStemSeparation}
						<span class="ml-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-cyan-500"></span>
					{/if}
				</h3>
				<svg
					class="h-4 w-4 text-cyan-400 transition-transform {stemsCollapsed ? '' : 'rotate-180'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{#if !stemsCollapsed}
				<div class="mt-4">
					<StemSeparationResults
						{vocalSeparation}
						{stemSeparation}
						{pendingVocalSeparation}
						{pendingStemSeparation}
						{projectId}
						{songTitle}
						{imageUrl}
						{onExtendStem}
						{onAddInstrumental}
						{onAddVocals}
					/>
				</div>
				{#if pendingWavConversion || wavConversion}
					<div
						class="mt-4 overflow-hidden rounded-xl border border-cyan-200/60 bg-linear-to-br from-cyan-50/70 to-white p-4 shadow-sm dark:border-cyan-700/30 dark:from-cyan-950/30 dark:to-gray-900/80"
					>
						<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div class="min-w-0 flex-1">
								<div class="mb-3 flex items-center gap-2.5">
									<span
										class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600 dark:bg-cyan-900/50 dark:text-cyan-300"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
											/>
										</svg>
									</span>
									<div>
										<h4 class="text-sm font-semibold text-cyan-900 dark:text-cyan-100">
											WAV Export
										</h4>
										<p class="text-xs text-cyan-700/60 dark:text-cyan-400/60">
											High-fidelity render for DAWs, mastering, and precise editing.
										</p>
									</div>
								</div>
								<div
									class="rounded-lg border border-cyan-200/60 bg-white/60 px-3 py-2.5 dark:border-cyan-800/40 dark:bg-cyan-950/30"
								>
									{#if pendingWavConversion}
										<div class="flex items-center gap-2.5 text-sm text-cyan-800 dark:text-cyan-200">
											<span
												class="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400"
											></span>
											<span>Converting this variation to WAV...</span>
										</div>
										<p class="mt-1.5 text-xs text-cyan-600/70 dark:text-cyan-400/50">
											KIE keeps generated WAV files for 14 days. Larger file size, cleaner
											downstream workflow.
										</p>
									{:else if wavConversion?.wav_url}
										<div class="flex items-center gap-2.5 text-sm text-cyan-800 dark:text-cyan-200">
											<span class="h-2 w-2 shrink-0 rounded-full bg-cyan-500 dark:bg-cyan-400"
											></span>
											<span>WAV export ready</span>
										</div>
										<p class="mt-1.5 text-xs text-cyan-600/70 dark:text-cyan-400/50">
											Perfect when you need full-resolution audio instead of the usual compressed
											delivery file.
										</p>
									{/if}
								</div>
							</div>

							<div class="flex shrink-0 items-center gap-3">
								{#if pendingWavConversion}
									<div
										class="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-white/80 px-3 py-2 text-xs font-medium text-cyan-700 dark:border-cyan-700/50 dark:bg-cyan-900/40 dark:text-cyan-300"
									>
										<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
										Rendering...
									</div>
								{:else if wavConversion?.wav_url}
									<a
										href={wavConversion.wav_url}
										rel="external"
										download={`${songTitle}.wav`}
										class="inline-flex items-center gap-2 rounded-lg border border-cyan-300 bg-white px-4 py-2 text-sm font-semibold text-cyan-700 shadow-sm transition-all hover:border-cyan-400 hover:bg-cyan-50 hover:shadow-md dark:border-cyan-600/70 dark:bg-cyan-900/40 dark:text-cyan-200 dark:hover:bg-cyan-800/60"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
											/>
										</svg>
										Download WAV
									</a>
								{/if}
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>
	{/if}

	{#if addVocalsGenerations.length > 0}
		<div
			class="overflow-hidden rounded-2xl border border-violet-200/80 bg-linear-to-br from-violet-50 to-white p-5 shadow-sm dark:border-violet-800/50 dark:from-violet-950/30 dark:to-gray-900"
		>
			<button
				onclick={() => (addVocalsCollapsed = !addVocalsCollapsed)}
				class="flex w-full cursor-pointer items-center justify-between"
			>
				<h3
					class="flex items-center gap-2 text-sm font-semibold text-violet-900 dark:text-violet-100"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 18.5c4.142 0 7.5-3.134 7.5-7s-3.358-7-7.5-7-7.5 3.134-7.5 7 3.358 7 7.5 7zM12 18.5v3"
						/>
					</svg>
					Vocal Versions
					<span
						class="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
					>
						{addVocalsGenerations.length}
					</span>
				</h3>
				<svg
					class="h-4 w-4 text-violet-400 transition-transform {addVocalsCollapsed
						? ''
						: 'rotate-180'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{#if !addVocalsCollapsed}
				<div class="mt-4">
					<AddVocalsGenerationsList generations={addVocalsGenerations} />
				</div>
			{/if}
		</div>
	{/if}

	{#if addInstrumentalGenerations.length > 0}
		<div
			class="overflow-hidden rounded-2xl border border-teal-200/80 bg-linear-to-br from-teal-50 to-white p-5 shadow-sm dark:border-teal-800/50 dark:from-teal-950/30 dark:to-gray-900"
		>
			<button
				onclick={() => (addInstrumentalCollapsed = !addInstrumentalCollapsed)}
				class="flex w-full cursor-pointer items-center justify-between"
			>
				<h3 class="flex items-center gap-2 text-sm font-semibold text-teal-900 dark:text-teal-100">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					Instrumental Versions
					<span
						class="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
					>
						{addInstrumentalGenerations.length}
					</span>
				</h3>
				<svg
					class="h-4 w-4 text-teal-400 transition-transform {addInstrumentalCollapsed
						? ''
						: 'rotate-180'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{#if !addInstrumentalCollapsed}
				<div class="mt-4">
					<AddInstrumentalGenerationsList generations={addInstrumentalGenerations} />
				</div>
			{/if}
		</div>
	{/if}

	{#if extendedGenerations.length > 0}
		<div
			class="overflow-hidden rounded-2xl border border-green-200/80 bg-linear-to-br from-green-50 to-white p-5 shadow-sm dark:border-green-800/50 dark:from-green-950/30 dark:to-gray-900"
		>
			<button
				onclick={() => (extensionsCollapsed = !extensionsCollapsed)}
				class="flex w-full cursor-pointer items-center justify-between"
			>
				<h3
					class="flex items-center gap-2 text-sm font-semibold text-green-900 dark:text-green-100"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 5l7 7-7 7M5 5l7 7-7 7"
						/>
					</svg>
					Extended Versions
					<span
						class="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/50 dark:text-green-300"
					>
						{extendedGenerations.length}
					</span>
				</h3>
				<svg
					class="h-4 w-4 text-green-400 transition-transform {extensionsCollapsed
						? ''
						: 'rotate-180'}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{#if !extensionsCollapsed}
				<div class="mt-4">
					<ExtendedGenerationsList {extendedGenerations} />
				</div>
			{/if}
		</div>
	{/if}
</div>
