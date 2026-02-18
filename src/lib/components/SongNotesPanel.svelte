<script lang="ts">
	import type { VariationAnnotation } from '$lib/types';
	import SectionBodyFrame from './SectionBodyFrame.svelte';

	let {
		generationId,
		audioId,
		annotation
	}: {
		generationId: number;
		audioId: string;
		annotation: VariationAnnotation | null;
	} = $props();

	let comment = $state('');
	let commentDraft = $state('');
	let notesExpanded = $state(false);
	let commentSaving = $state(false);
	let commentSaved = $state(false);
	let commentCharCount = $derived(commentDraft.length);
	let lastAnnotationComment = $state('');
	let lastAudioId = $state('');

	$effect(() => {
		const nextComment = annotation?.comment ?? '';
		const audioChanged = audioId !== lastAudioId;
		comment = nextComment;
		if (audioChanged || commentDraft === lastAnnotationComment) {
			commentDraft = nextComment;
		}
		if (audioChanged) {
			notesExpanded = !!nextComment;
		}
		lastAnnotationComment = nextComment;
		lastAudioId = audioId;
	});

	let commentDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleCommentInput() {
		if (commentDebounceTimer) clearTimeout(commentDebounceTimer);
		commentDebounceTimer = setTimeout(() => saveComment(), 800);
	}

	async function saveComment() {
		if (commentDraft === comment) return;
		commentSaving = true;

		try {
			await fetch(`/api/generations/${generationId}/annotations`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ audioId, comment: commentDraft })
			});
			comment = commentDraft;
			commentSaved = true;
			setTimeout(() => (commentSaved = false), 2000);
		} catch {
			console.error('Failed to save comment');
		} finally {
			commentSaving = false;
		}
	}
</script>

<div
	class="overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm transition-all dark:border-amber-800/50 dark:bg-gray-800"
>
	<button
		onclick={() => (notesExpanded = !notesExpanded)}
		class="flex w-full cursor-pointer items-center justify-between p-4 text-left transition-colors hover:bg-amber-50/50 dark:hover:bg-amber-900/10"
	>
		<div class="flex items-center gap-3">
			<svg
				class="h-5 w-5 text-amber-500 dark:text-amber-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
				/>
			</svg>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Notes</h2>
			{#if comment && !notesExpanded}
				<span class="ml-1 max-w-xs truncate text-sm text-gray-400 dark:text-gray-500">
					— {comment}
				</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			{#if commentSaving}
				<span class="text-xs text-gray-400">Saving...</span>
			{:else if commentSaved}
				<span class="text-xs text-green-500">Saved ✓</span>
			{/if}
			<svg
				class="h-5 w-5 text-gray-400 transition-transform {notesExpanded ? 'rotate-180' : ''}"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	</button>
	{#if notesExpanded}
		<SectionBodyFrame tone="amber" className="p-4">
			<textarea
				bind:value={commentDraft}
				oninput={handleCommentInput}
				onblur={saveComment}
				placeholder="Add notes about this variation — what you like, what to change, ideas for next steps..."
				maxlength="500"
				rows="3"
				class="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/20"
			></textarea>
			<div class="mt-1.5 flex items-center justify-between">
				<p class="text-xs text-gray-400 dark:text-gray-500">Auto-saves as you type</p>
				<span
					class="text-xs {commentCharCount > 450
						? 'text-amber-500'
						: 'text-gray-400'} dark:text-gray-500"
				>
					{commentCharCount}/500
				</span>
			</div>
		</SectionBodyFrame>
	{/if}
</div>
