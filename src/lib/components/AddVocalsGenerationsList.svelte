<script lang="ts">
	import { resolve } from '$app/paths';

	type AddVocalsGeneration = {
		id: number;
		project_id: number;
		title: string;
		status: string;
	};

	let { generations }: { generations: AddVocalsGeneration[] } = $props();
</script>

{#if generations.length > 0}
	<div class="space-y-2">
		{#each generations as generation (generation.id)}
			<a
				href={resolve('/projects/[projectId]/generations/[generationId]', {
					projectId: String(generation.project_id),
					generationId: String(generation.id)
				})}
				class="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm transition-colors hover:bg-violet-100 dark:bg-violet-900/40 dark:hover:bg-violet-800/50"
			>
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-800"
				>
					<svg
						class="h-5 w-5 text-violet-600 dark:text-violet-300"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 18.5c4.142 0 7.5-3.134 7.5-7s-3.358-7-7.5-7-7.5 3.134-7.5 7 3.358 7 7.5 7zM12 18.5v3"
						/>
					</svg>
				</div>
				<div class="flex-1">
					<p class="font-medium text-violet-900 dark:text-violet-100">{generation.title}</p>
					<p class="text-sm text-violet-700 dark:text-violet-300">
						Add Vocals · {generation.status === 'success' ? 'Complete' : generation.status}
					</p>
				</div>
				<svg
					class="h-5 w-5 text-violet-600 dark:text-violet-300"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
				</svg>
			</a>
		{/each}
	</div>
{/if}
