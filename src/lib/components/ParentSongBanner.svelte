<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatTime } from '$lib/utils/format';

	let {
		parentGenerationId,
		parentGenerationProjectId,
		parentSongId,
		parentSongTitle,
		continueAt,
		variant = 'banner',
		label,
		generationType = 'extend'
	}: {
		parentGenerationId: number;
		parentGenerationProjectId: number;
		parentSongId: string;
		parentSongTitle: string;
		continueAt: number | null;
		variant?: 'banner' | 'compact';
		label?: string;
		generationType?: string;
	} = $props();

	const isInstrumental = $derived(generationType === 'add_instrumental');
</script>

{#if variant === 'compact'}
	{#if isInstrumental}
		<a
			href={resolve(
				`/projects/${parentGenerationProjectId}/generations/${parentGenerationId}/song/${parentSongId}`
			)}
			class="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-teal-200/60 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 transition-colors hover:border-teal-300 hover:bg-teal-100 dark:border-teal-700/40 dark:bg-teal-900/20 dark:text-teal-300 dark:hover:bg-teal-900/40"
		>
			<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
				/>
			</svg>
			<span class="font-semibold text-teal-500 dark:text-teal-400">Instrumental</span>
			<span class="text-teal-600/70 dark:text-teal-400/70">·</span>
			{label ?? 'Generated from stem of:'}
			<span class="font-semibold">{parentSongTitle}</span>
		</a>
	{:else}
		<a
			href={resolve(
				`/projects/${parentGenerationProjectId}/generations/${parentGenerationId}/song/${parentSongId}`
			)}
			class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-800/40"
		>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 7l5 5m0 0l-5 5m5-5H6"
				/>
			</svg>
			{label ?? 'Extends from:'}
			{parentSongTitle}
		</a>
	{/if}
{:else}
	{#if isInstrumental}
		<div
			class="mb-4 overflow-hidden rounded-xl border border-teal-200/80 bg-linear-to-r from-teal-50 to-cyan-50 p-4 shadow-sm dark:border-teal-800/50 dark:from-teal-950/40 dark:to-cyan-950/30"
		>
			<div class="flex items-start gap-3">
				<div
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-800/60"
				>
					<svg
						class="h-4.5 w-4.5 text-teal-600 dark:text-teal-300"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>
				<div class="flex-1 min-w-0">
					<p class="text-xs font-semibold tracking-wider text-teal-500 uppercase dark:text-teal-400">Instrumental Generation</p>
					<p class="mt-0.5 text-sm text-teal-800 dark:text-teal-200">
						{label ?? 'Generated from stem of:'}
						<a
							href={resolve('/projects/[projectId]/generations/[generationId]/song/[songId]', {
								projectId: String(parentGenerationProjectId),
								generationId: String(parentGenerationId),
								songId: String(parentSongId)
							})}
							class="font-semibold text-teal-700 underline decoration-teal-400/50 underline-offset-2 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100"
						>
							{parentSongTitle}
						</a>
					</p>
				</div>
			</div>
		</div>
	{:else}
		<div
			class="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-900/30"
		>
			<div class="flex items-center gap-2">
				<svg
					class="h-5 w-5 text-purple-600 dark:text-purple-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
					/>
				</svg>
				<span class="text-sm text-purple-700 dark:text-purple-300">
					{label ?? 'Extended from'}
					<a
						href={resolve('/projects/[projectId]/generations/[generationId]/song/[songId]', {
							projectId: String(parentGenerationProjectId),
							generationId: String(parentGenerationId),
							songId: String(parentSongId)
						})}
						class="font-medium underline hover:text-purple-900 dark:hover:text-purple-100"
					>
						{parentSongTitle}
					</a>
					{#if continueAt}
						<span class="text-purple-600 dark:text-purple-400">at {formatTime(continueAt)}</span>
					{/if}
				</span>
			</div>
		</div>
	{/if}
{/if}
