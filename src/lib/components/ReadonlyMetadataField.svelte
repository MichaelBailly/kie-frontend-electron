<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		valueClass = '',
		children
	}: {
		label: string;
		valueClass?: string;
		children: Snippet;
	} = $props();
</script>

<div>
	<h4 class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</h4>
	<div
		class={`w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 ${valueClass}`}
	>
		{@render children()}
	</div>
</div>
