<script lang="ts">
	import { resolve } from '$app/paths';

	let {
		parentGenerationId,
		parentGenerationProjectId,
		parentSongId,
		parentSongTitle,
		continueAt,
		variant = 'banner',
		label
	}: {
		parentGenerationId: number;
		parentGenerationProjectId: number;
		parentSongId: string;
		parentSongTitle: string;
		continueAt: number | null;
		variant?: 'banner' | 'compact';
		label?: string;
	} = $props();

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

{#if variant === 'compact'}
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
