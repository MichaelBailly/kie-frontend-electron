<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		icon,
		children
	}: {
		title: string;
		icon?: Snippet;
		children: Snippet;
	} = $props();

	let expanded = $state(false);
</script>

<div
	class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
>
	<button
		onclick={() => (expanded = !expanded)}
		class="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
		aria-expanded={expanded}
	>
		<div class="flex items-center gap-3">
			{#if icon}
				{@render icon()}
			{/if}
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
		</div>
		<svg
			class="h-5 w-5 text-gray-400 transition-transform {expanded ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
		</svg>
	</button>
	{#if expanded}
		<div class="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
			{@render children()}
		</div>
	{/if}
</div>
