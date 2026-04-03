<script lang="ts">
	import { ANNOTATION_COMMENT_MAX_LENGTH } from '$lib/constants';
	import type { VariationAnnotation } from '$lib/types';

	let {
		generationId,
		audioId,
		annotation
	}: {
		generationId: number;
		audioId: string;
		annotation: VariationAnnotation | null;
	} = $props();

	let notesComment = $state('');
	let notesDraft = $state('');
	let notesSaving = $state(false);
	let notesSaved = $state(false);
	let lastAnnotationComment = $state('');
	let lastAudioId = $state('');
	const notesCharCount = $derived(notesDraft.length);

	$effect(() => {
		const nextComment = annotation?.comment ?? '';
		const audioChanged = audioId !== lastAudioId;

		notesComment = nextComment;
		if (audioChanged || notesDraft === lastAnnotationComment || notesDraft === '') {
			notesDraft = nextComment;
		}

		lastAnnotationComment = nextComment;
		lastAudioId = audioId;
	});

	let notesDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	$effect(() => {
		return () => {
			if (notesDebounceTimer) {
				clearTimeout(notesDebounceTimer);
			}
		};
	});

	function handleNotesInput() {
		if (notesDebounceTimer) clearTimeout(notesDebounceTimer);
		notesDebounceTimer = setTimeout(() => saveNotes(), 800);
	}

	async function saveNotes() {
		if (notesDraft === notesComment) return;
		notesSaving = true;

		try {
			await fetch(`/api/generations/${generationId}/annotations`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ audioId, comment: notesDraft })
			});
			notesComment = notesDraft;
			notesSaved = true;
			setTimeout(() => (notesSaved = false), 2000);
		} catch {
			console.error('Failed to save notes');
		} finally {
			notesSaving = false;
		}
	}
</script>

<div
	class="flex flex-col overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-b from-amber-50 to-amber-100 shadow-sm dark:border-amber-800/30 dark:from-amber-950/40 dark:to-amber-900/20"
>
	<div
		class="flex shrink-0 items-center justify-between border-b border-amber-200/50 bg-white/50 px-6 py-4 backdrop-blur-sm dark:border-amber-800/30 dark:bg-gray-800/30"
	>
		<div class="flex items-center gap-3">
			<div
				class="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-amber-400 to-amber-600"
			>
				<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
					/>
				</svg>
			</div>
			<div>
				<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
				<p class="text-xs text-gray-500 dark:text-gray-400">Annotate this variation</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if notesSaving}
				<span class="text-xs font-medium text-amber-600 dark:text-amber-400">Saving...</span>
			{:else if notesSaved}
				<span
					class="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400"
				>
					<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
						<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
					</svg>
					Saved
				</span>
			{/if}
		</div>
	</div>

	<div class="flex min-h-0 flex-1 flex-col p-6">
		<textarea
			bind:value={notesDraft}
			oninput={handleNotesInput}
			onblur={saveNotes}
			placeholder="Add notes about this variation - production notes, arrangement ideas, directions for future versions..."
			maxlength={ANNOTATION_COMMENT_MAX_LENGTH}
			class="min-h-0 w-full flex-1 resize-none rounded-xl border border-amber-200/60 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder-gray-400 transition-colors focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none dark:border-amber-800/40 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-amber-500 dark:focus:ring-amber-500/30"
		></textarea>
		<div class="mt-3 flex items-center justify-between pt-3">
			<p class="text-xs text-gray-500 dark:text-gray-400">Auto-saves as you type</p>
			<span
				class="text-xs font-medium {notesCharCount > ANNOTATION_COMMENT_MAX_LENGTH * 0.9
					? 'text-amber-600 dark:text-amber-400'
					: 'text-gray-400 dark:text-gray-500'}"
			>
				{notesCharCount}/{ANNOTATION_COMMENT_MAX_LENGTH}
			</span>
		</div>
	</div>
</div>
