<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatTime } from '$lib/utils/format';

	type ExtendedGeneration = {
		id: number;
		project_id: number;
		title: string;
		continue_at?: number | null;
		status: string;
	};

	let { extendedGenerations }: { extendedGenerations: ExtendedGeneration[] } = $props();
</script>

{#if extendedGenerations.length > 0}
	<div
		class="mb-10 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/30"
	>
		<h3 class="mb-3 flex items-center gap-2 font-semibold text-green-900 dark:text-green-100">
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 5l7 7-7 7M5 5l7 7-7 7"
				/>
			</svg>
			Extended Versions ({extendedGenerations.length})
		</h3>
		<div class="space-y-2">
			{#each extendedGenerations as extGen (extGen.id)}
				<a
					href={resolve('/projects/[projectId]/generations/[generationId]', {
						projectId: String(extGen.project_id),
						generationId: String(extGen.id)
					})}
					class="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm transition-colors hover:bg-green-100 dark:bg-green-900/40 dark:hover:bg-green-800/50"
				>
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-800"
					>
						<svg
							class="h-5 w-5 text-green-600 dark:text-green-400"
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
					<div class="flex-1">
						<p class="font-medium text-green-900 dark:text-green-100">{extGen.title}</p>
						<p class="text-sm text-green-700 dark:text-green-300">
							{#if extGen.continue_at}
								Continues from {formatTime(extGen.continue_at)}
							{/if}
							· {extGen.status === 'success' ? 'Complete' : extGen.status}
						</p>
					</div>
					<svg
						class="h-5 w-5 text-green-600 dark:text-green-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</a>
			{/each}
		</div>
	</div>
{/if}
