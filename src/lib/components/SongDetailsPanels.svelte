<script lang="ts">
	let { style, lyrics }: { style: string; lyrics: string | null } = $props();

	let lyricsExpanded = $state(false);
	let styleExpanded = $state(false);
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
	<div
		class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
	>
		<button
			onclick={() => (styleExpanded = !styleExpanded)}
			class="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
		>
			<div class="flex items-center gap-3">
				<svg
					class="h-5 w-5 text-indigo-600 dark:text-indigo-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
					/>
				</svg>
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Style</h2>
			</div>
			<svg
				class="h-5 w-5 text-gray-400 transition-transform {styleExpanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		{#if styleExpanded}
			<div class="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
				<div class="p-4">
					<div class="mb-3 flex justify-end">
						<button
							onclick={() => copyToClipboard(style, 'style')}
							class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700"
						>
							{#if styleCopied}
								<svg
									class="h-4 w-4 text-green-600 dark:text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
								Copied!
							{:else}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
									/>
								</svg>
								Copy
							{/if}
						</button>
					</div>
					<p class="text-gray-700 dark:text-gray-300">{style}</p>
				</div>
			</div>
		{/if}
	</div>

	{#if lyrics}
		<div
			class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
		>
			<button
				onclick={() => (lyricsExpanded = !lyricsExpanded)}
				class="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
			>
				<div class="flex items-center gap-3">
					<svg
						class="h-5 w-5 text-indigo-600 dark:text-indigo-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Lyrics</h2>
				</div>
				<svg
					class="h-5 w-5 text-gray-400 transition-transform {lyricsExpanded ? 'rotate-180' : ''}"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{#if lyricsExpanded}
				<div class="border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
					<div class="p-4">
						<div class="mb-3 flex justify-end">
							<button
								onclick={() => copyToClipboard(lyrics, 'lyrics')}
								class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 transition-colors hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600 dark:hover:bg-gray-700"
							>
								{#if lyricsCopied}
									<svg
										class="h-4 w-4 text-green-600 dark:text-green-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									Copied!
								{:else}
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
										/>
									</svg>
									Copy
								{/if}
							</button>
						</div>
						<p class="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
							{lyrics}
						</p>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
