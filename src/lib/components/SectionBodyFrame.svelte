<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'neutral' | 'amber';

	let {
		tone = 'neutral',
		className = '',
		children
	}: {
		tone?: Tone;
		className?: string;
		children: Snippet;
	} = $props();

	const toneClasses = {
		neutral: 'border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900',
		amber:
			'border-t border-amber-200/50 bg-amber-50/30 dark:border-amber-800/30 dark:bg-amber-900/10'
	} as const;
</script>

<div class={`${toneClasses[tone]} ${className}`}>
	{@render children()}
</div>
