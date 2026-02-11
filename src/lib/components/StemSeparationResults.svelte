<script lang="ts">
	import StemPlayer from '$lib/components/StemPlayer.svelte';
	import type { StemSeparation } from '$lib/types';

	let {
		vocalSeparation,
		stemSeparation,
		pendingVocalSeparation,
		pendingStemSeparation
	}: {
		vocalSeparation: StemSeparation | undefined;
		stemSeparation: StemSeparation | undefined;
		pendingVocalSeparation: StemSeparation | undefined;
		pendingStemSeparation: StemSeparation | undefined;
	} = $props();
</script>

{#if vocalSeparation || stemSeparation || pendingVocalSeparation || pendingStemSeparation}
	<div class="mb-10 space-y-4">
		{#if vocalSeparation}
			<div
				class="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-800 dark:bg-cyan-900/30"
			>
				<h3 class="mb-4 flex items-center gap-2 font-semibold text-cyan-900 dark:text-cyan-100">
					<span class="text-xl">🎤</span>
					Vocals + Instrumental
				</h3>
				<StemPlayer separation={vocalSeparation} />
			</div>
		{:else if pendingVocalSeparation}
			<div
				class="rounded-xl border border-cyan-200 bg-cyan-50 p-4 dark:border-cyan-800 dark:bg-cyan-900/30"
			>
				<h3 class="flex items-center gap-2 font-semibold text-cyan-900 dark:text-cyan-100">
					<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Separating Vocals + Instrumental...
				</h3>
				<p class="mt-2 text-sm text-cyan-700 dark:text-cyan-300">
					This usually takes 1-2 minutes. You can leave this page and come back later.
				</p>
			</div>
		{/if}

		{#if stemSeparation}
			<div
				class="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4 dark:border-fuchsia-800 dark:bg-fuchsia-900/30"
			>
				<h3
					class="mb-4 flex items-center gap-2 font-semibold text-fuchsia-900 dark:text-fuchsia-100"
				>
					<span class="text-xl">🎛️</span>
					Full Stem Split
				</h3>
				<StemPlayer separation={stemSeparation} />
			</div>
		{:else if pendingStemSeparation}
			<div
				class="rounded-xl border border-fuchsia-200 bg-fuchsia-50 p-4 dark:border-fuchsia-800 dark:bg-fuchsia-900/30"
			>
				<h3 class="flex items-center gap-2 font-semibold text-fuchsia-900 dark:text-fuchsia-100">
					<svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					Separating Full Stems...
				</h3>
				<p class="mt-2 text-sm text-fuchsia-700 dark:text-fuchsia-300">
					This usually takes 2-5 minutes. You can leave this page and come back later.
				</p>
			</div>
		{/if}
	</div>
{/if}
