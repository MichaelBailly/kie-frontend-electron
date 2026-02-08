<script lang="ts">
	import type { Generation } from '$lib/types';
	import { getStatusLabel, isGenerating } from '$lib/types';

	let {
		generation,
		selected = false,
		hasStarred = false
	}: { generation: Generation; selected?: boolean; hasStarred?: boolean } = $props();

	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div
	class="group w-full rounded-lg border p-3 text-left transition-all duration-200 {selected
		? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/30'
		: 'dark:hover:bg-gray-750 border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'}"
>
	<div class="flex items-start gap-3">
		<div class="relative shrink-0">
			{#if generation.track1_image_url}
				<img
					src={generation.track1_image_url}
					alt={generation.title}
					class="h-12 w-12 rounded-md object-cover"
				/>
			{:else}
				<div
					class="flex h-12 w-12 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600"
				>
					<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
						/>
					</svg>
				</div>
			{/if}
			{#if hasStarred}
				<div class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 shadow-sm">
					<svg class="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
						<path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
					</svg>
				</div>
			{/if}
		</div>
		<div class="min-w-0 flex-1">
			<h4 class="truncate font-medium text-gray-900 dark:text-gray-100">
				{generation.title}
			</h4>
			<p class="truncate text-sm text-gray-500 dark:text-gray-400">
				{generation.style}
			</p>
			<div class="mt-1 flex flex-wrap items-center gap-2">
				{#if generation.extends_generation_id && typeof generation.extends_generation_id === 'number'}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
						title="Extended from another song"
					>
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 7l5 5m0 0l-5 5m5-5H6"
							/>
						</svg>
						Extended
					</span>
				{/if}
				{#if isGenerating(generation.status)}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
					>
						<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500"></span>
						{getStatusLabel(generation.status)}
					</span>
				{:else if generation.status === 'success'}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
					>
						<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
						Complete
					</span>
				{:else if generation.status === 'error'}
					<span
						class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
					>
						<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
								clip-rule="evenodd"
							/>
						</svg>
						Failed
					</span>
				{/if}
				<span class="text-xs text-gray-400 dark:text-gray-500">
					{formatDate(generation.created_at)}
				</span>
			</div>
		</div>
	</div>
</div>
