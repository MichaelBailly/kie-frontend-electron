<script lang="ts">
	import CollapsiblePanel from './CollapsiblePanel.svelte';

	let { style, lyrics }: { style: string; lyrics: string | null } = $props();

	let lyricsCopied = $state(false);
	let styleCopied = $state(false);

	async function copyToClipboard(text: string, type: 'lyrics' | 'style') {
		try {
			await navigator.clipboard.writeText(text);
			if (type === 'lyrics') {
				lyricsCopied = true;
				setTimeout(() => (lyricsCopied = false), 2000);
			} else {
				styleCopied = true;
				setTimeout(() => (styleCopied = false), 2000);
			}
		} catch (err) {
			console.error('Failed to copy:', err);
		}
	}
</script>

<div class="space-y-3">
	<CollapsiblePanel title="Style">
		{#snippet icon()}
			<svg
				class="h-5 w-5 text-indigo-600 dark:text-indigo-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
				/>
			</svg>
		{/snippet}
		<div class="relative p-4">
			<button
				onclick={() => copyToClipboard(style, 'style')}
				aria-label="Copy style"
				class="group absolute top-3 right-3 inline-flex cursor-pointer items-center overflow-hidden rounded-lg bg-white p-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 transition-all hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700"
			>
				{#if styleCopied}
					<span
						class="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-xs group-hover:pr-1.5"
						>Copied!</span
					>
					<svg
						class="h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M5 13l4 4L19 7"
						/>
					</svg>
				{:else}
					<span
						class="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-xs group-hover:pr-1.5"
						>Copy</span
					>
					<svg
						class="h-4 w-4 shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
				{/if}
			</button>
			<p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{style.trim()}</p>
		</div>
	</CollapsiblePanel>

	{#if lyrics}
		<CollapsiblePanel title="Lyrics">
			{#snippet icon()}
				<svg
					class="h-5 w-5 text-indigo-600 dark:text-indigo-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			{/snippet}
			<div class="relative p-4">
				<button
					onclick={() => copyToClipboard(lyrics, 'lyrics')}
					aria-label="Copy lyrics"
					class="group absolute top-3 right-3 inline-flex cursor-pointer items-center overflow-hidden rounded-lg bg-white p-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 transition-all hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700"
				>
					{#if lyricsCopied}
						<span
							class="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-xs group-hover:pr-1.5"
							>Copied!</span
						>
						<svg
							class="h-4 w-4 shrink-0 text-green-600 dark:text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					{:else}
						<span
							class="max-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 group-hover:max-w-xs group-hover:pr-1.5"
							>Copy</span
						>
						<svg
							class="h-4 w-4 shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
					{/if}
				</button>
				<p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">{lyrics.trim()}</p>
			</div>
		</CollapsiblePanel>
	{/if}
</div>
