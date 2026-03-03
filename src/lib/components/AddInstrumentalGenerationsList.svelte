<script lang="ts">
	import { resolve } from '$app/paths';

	type AddInstrumentalGeneration = {
		id: number;
		project_id: number;
		title: string;
		status: string;
		extends_stem_type?: string | null;
	};

	let { generations }: { generations: AddInstrumentalGeneration[] } = $props();
</script>

{#if generations.length > 0}
	<div class="space-y-2">
		{#each generations as generation (generation.id)}
			<a
				href={resolve('/projects/[projectId]/generations/[generationId]', {
					projectId: String(generation.project_id),
					generationId: String(generation.id)
				})}
				class="flex items-center gap-3 rounded-lg bg-white p-3 shadow-sm transition-colors hover:bg-teal-100 dark:bg-teal-900/40 dark:hover:bg-teal-800/50"
			>
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-800"
				>
					<svg
						class="h-5 w-5 text-teal-600 dark:text-teal-300"
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
				<div class="flex-1">
					<p class="font-medium text-teal-900 dark:text-teal-100">{generation.title}</p>
					<p class="text-sm text-teal-700 dark:text-teal-300">
						Add Instrumental · {generation.status === 'success' ? 'Complete' : generation.status}
					</p>
				</div>
				<svg
					class="h-5 w-5 text-teal-600 dark:text-teal-300"
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
