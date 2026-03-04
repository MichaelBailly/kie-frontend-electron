<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		valueClass = '',
		HeaderRight,
		children
	}: {
		label: string;
		valueClass?: string;
		HeaderRight?: Snippet;
		children: Snippet;
	} = $props();
</script>

<div>
	<div class="mb-1.5 flex items-center justify-between">
		<h4 class="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</h4>
		{#if HeaderRight}
			{@render HeaderRight()}
		{/if}
	</div>
	<div
		class={`w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 ${valueClass}`}
	>
		{@render children()}
	</div>
</div>
