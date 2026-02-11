<script lang="ts">
	import { resolve } from '$app/paths';
	import LabelPicker from '$lib/components/LabelPicker.svelte';

	let {
		projectId,
		generationId,
		title,
		labels,
		audioId
	}: {
		projectId: number;
		generationId: number;
		title: string;
		labels: string[];
		audioId: string;
	} = $props();
</script>

<div class="mb-6">
	<a
		href={resolve('/projects/[projectId]/generations/[generationId]', {
			projectId: String(projectId),
			generationId: String(generationId)
		})}
		class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
	>
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
		Back to generation
	</a>

	<h1 class="mt-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
		{title}
	</h1>
	<div class="mt-3 max-w-2xl">
		<LabelPicker {labels} {generationId} {audioId} placeholder="Add a label to this variation" />
	</div>
</div>
