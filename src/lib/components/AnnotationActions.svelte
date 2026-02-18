<script lang="ts">
	import LabelPicker from '$lib/components/LabelPicker.svelte';
	import { getContext } from 'svelte';

	let {
		generationId,
		audioId,
		placeholder = 'Add a label to this variation'
	}: {
		generationId: number;
		audioId: string;
		placeholder?: string;
	} = $props();

	const annotationsContext = getContext<
		| {
				get: (
					generationId: number,
					audioId: string
				) => { labels?: string[]; comment?: string; starred?: number } | undefined;
				isStarred: (generationId: number, audioId: string) => boolean;
		  }
		| undefined
	>('annotations');

	let liveStarred = $derived(annotationsContext?.isStarred(generationId, audioId) ?? false);
	let starredOverride = $state<boolean | null>(null);
	let starred = $derived.by(() => starredOverride ?? liveStarred);

	let starAnimClass = $state('');

	$effect(() => {
		if (starredOverride === null) return;
		const live = liveStarred;
		if (live === starredOverride) starredOverride = null;
	});

	let labels = $derived(annotationsContext?.get(generationId, audioId)?.labels ?? []);

	async function toggleStar() {
		if (!audioId) return;
		const was = starred;
		starredOverride = !starred;
		starAnimClass = !was ? 'star-burst' : 'star-unstar';
		setTimeout(() => (starAnimClass = ''), 600);

		try {
			await fetch(`/api/generations/${generationId}/annotations`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ audioId, action: 'toggle_star' })
			});
		} catch {
			starredOverride = was;
		}
	}
</script>

{#if audioId}
	<div class="inline-flex items-center gap-2">
		<button
			onclick={toggleStar}
			class="flex items-center gap-2 rounded p-0.5 transition-colors {starred
				? 'text-amber-500 hover:text-amber-600'
				: 'text-gray-300 hover:text-amber-400 dark:text-gray-600 dark:hover:text-amber-400'}"
			title={starred ? 'Unstar variation' : 'Star variation'}
		>
			<svg
				class="h-4 w-4 {starAnimClass}"
				fill={starred ? 'currentColor' : 'none'}
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
				/>
			</svg>
		</button>

		<LabelPicker {labels} {generationId} {audioId} {placeholder} />
	</div>
{/if}
