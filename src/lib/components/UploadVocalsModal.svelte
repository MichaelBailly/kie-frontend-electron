<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		GENERATION_LYRICS_MAX_LENGTH,
		GENERATION_STYLE_MAX_LENGTH,
		GENERATION_TITLE_MAX_LENGTH,
		NEGATIVE_TAGS_MAX_LENGTH
	} from '$lib/constants';
	import StylePicker from './StylePicker.svelte';
	import ExpandableTextarea from './ExpandableTextarea.svelte';

	let {
		isOpen = $bindable(false),
		onClose
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	let title = $state('');
	let prompt = $state('');
	let style = $state('');
	let negativeTags = $state('');
	let selectedFileName = $state('');
	let selectedFileSize = $state(0);
	let isDragging = $state(false);
	let isUploading = $state(false);
	let isSubmitting = $state(false);
	let uploadError = $state('');
	let submitError = $state('');
	let remoteUrl = $state('');
	let temporaryFileName = $state('');
	let fileInput: HTMLInputElement | undefined = $state();
	let hasNegativeTagsOverflow = $derived(negativeTags.length > NEGATIVE_TAGS_MAX_LENGTH);

	const canSubmit = $derived(
		!!remoteUrl &&
			!!temporaryFileName &&
			!!title.trim() &&
			!!prompt.trim() &&
			!!style.trim() &&
			!hasNegativeTagsOverflow &&
			!isSubmitting &&
			!isUploading
	);

	const uploadStateLabel = $derived.by(() => {
		if (isUploading) return 'Uploading audio…';
		if (remoteUrl) return 'Upload complete';
		if (uploadError) return 'Upload failed';
		return 'Select an audio file';
	});

	$effect(() => {
		if (!isOpen) {
			resetForm();
		}
	});

	function resetForm() {
		title = '';
		prompt = '';
		style = '';
		negativeTags = '';
		selectedFileName = '';
		selectedFileSize = 0;
		isDragging = false;
		isUploading = false;
		isSubmitting = false;
		uploadError = '';
		submitError = '';
		remoteUrl = '';
		temporaryFileName = '';
		if (fileInput) {
			fileInput.value = '';
		}
	}

	function closeModal() {
		onClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			closeModal();
		}
	}

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.target !== event.currentTarget) {
			return;
		}

		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			closeModal();
		}
	}

	function fileSizeLabel(size: number): string {
		if (size <= 0) return '';
		const units = ['B', 'KB', 'MB', 'GB'];
		let value = size;
		let unitIndex = 0;
		while (value >= 1024 && unitIndex < units.length - 1) {
			value /= 1024;
			unitIndex += 1;
		}
		return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
	}

	function stemFromFileName(fileName: string): string {
		const sanitized = fileName.split('/').pop()?.split('\\').pop() ?? fileName;
		const stem = sanitized.replace(/\.[a-z0-9]{1,6}$/i, '');
		return stem.replace(/[_-]+/g, ' ').trim();
	}

	async function uploadFile(file: File) {
		isUploading = true;
		uploadError = '';
		submitError = '';
		remoteUrl = '';
		temporaryFileName = '';

		selectedFileName = file.name;
		selectedFileSize = file.size;
		if (!title.trim()) {
			title = stemFromFileName(file.name);
		}

		try {
			const formData = new FormData();
			formData.set('file', file);

			const response = await fetch('/api/upload-audio', {
				method: 'POST',
				body: formData
			});

			const payload = await response.json();
			if (!response.ok) {
				uploadError = payload?.message || 'Failed to upload audio file';
				return;
			}

			remoteUrl = payload.remoteUrl;
			temporaryFileName = payload.temporaryFileName;
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Failed to upload audio file';
		} finally {
			isUploading = false;
		}
	}

	function handleInputChange(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) {
			return;
		}
		void uploadFile(file);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		const file = event.dataTransfer?.files?.[0];
		if (!file) return;
		void uploadFile(file);
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!canSubmit) {
			return;
		}

		isSubmitting = true;
		submitError = '';
		try {
			const response = await fetch('/api/generations/upload-vocals', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: title.trim(),
					projectName: title.trim(),
					prompt: prompt.trim(),
					style: style.trim(),
					negativeTags: negativeTags.trim(),
					remoteUrl,
					temporaryFileName
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				submitError = payload?.message || 'Failed to create vocals generation';
				return;
			}

			closeModal();
			await invalidateAll();
			await goto(resolve(`/projects/${payload.project.id}/generations/${payload.generation.id}`));
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Failed to create vocals generation';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		role="dialog"
		aria-modal="true"
		aria-labelledby="upload-vocals-title"
		tabindex="0"
	>
		<div
			class="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
		>
			<div class="h-1 bg-linear-to-r from-violet-500 via-purple-500 to-fuchsia-500"></div>

			<div
				class="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700"
			>
				<div>
					<h2
						id="upload-vocals-title"
						class="text-lg font-semibold text-gray-900 dark:text-gray-100"
					>
						Upload Audio to Add Vocals
					</h2>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Upload once, keep local traceability, then generate your vocal version.
					</p>
				</div>
				<button
					type="button"
					onclick={closeModal}
					class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
					aria-label="Close"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<form onsubmit={handleSubmit} class="space-y-5 p-6">
				<div
					class="rounded-xl border-2 border-dashed p-6 transition-all {isDragging
						? 'border-violet-400 bg-violet-50 dark:border-violet-500 dark:bg-violet-900/20'
						: remoteUrl
							? 'border-emerald-300 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-900/20'
							: 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/70'}"
				>
					<div class="flex flex-col items-center gap-3 text-center">
						<div
							class="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
						>
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 18.5c4.142 0 7.5-3.134 7.5-7s-3.358-7-7.5-7-7.5 3.134-7.5 7 3.358 7 7.5 7zM12 18.5v3"
								/>
							</svg>
						</div>
						<p class="text-sm font-medium text-gray-800 dark:text-gray-100">{uploadStateLabel}</p>
						{#if selectedFileName}
							<p class="text-xs text-gray-500 dark:text-gray-400">
								{selectedFileName} • {fileSizeLabel(selectedFileSize)}
							</p>
						{/if}
						<div class="flex flex-wrap justify-center gap-2">
							<input
								bind:this={fileInput}
								type="file"
								accept="audio/*"
								onchange={handleInputChange}
								class="hidden"
								id="upload-vocals-file"
							/>
							<label
								for="upload-vocals-file"
								class="cursor-pointer rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700"
							>
								Browse audio file
							</label>
						</div>
						{#if isUploading}
							<div
								class="h-1.5 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-900/50"
							>
								<div
									class="h-full w-1/2 animate-pulse bg-linear-to-r from-violet-500 to-purple-500"
								></div>
							</div>
						{/if}
					</div>
				</div>

				{#if uploadError}
					<div
						class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
					>
						{uploadError}
					</div>
				{/if}

				<div class="grid gap-4 md:grid-cols-2">
					<div class="md:col-span-2">
						<label
							class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
							for="upload-vocals-title">Title</label
						>
						<input
							id="upload-vocals-title"
							type="text"
							bind:value={title}
							maxlength={GENERATION_TITLE_MAX_LENGTH}
							placeholder="My vocals track"
							class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
						/>
					</div>

					<div class="md:col-span-2">
						<label
							class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
							for="upload-vocals-prompt">Prompt / Lyrics</label
						>
						<ExpandableTextarea
							bind:value={prompt}
							id="upload-vocals-prompt"
							label="Prompt / Lyrics"
							rows={4}
							maxlength={GENERATION_LYRICS_MAX_LENGTH}
							mono={true}
							placeholder="[Verse] Midnight train..."
							textareaClass="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
						/>
					</div>

					<div class="md:col-span-2">
						<div class="mb-1.5 flex items-center justify-between">
							<label
								class="block text-sm font-medium text-gray-700 dark:text-gray-300"
								for="upload-vocals-style">Style</label
							>
							<StylePicker
								onSelect={(selectedStyle) => {
									style = selectedStyle.style;
								}}
							/>
						</div>
						<ExpandableTextarea
							bind:value={style}
							id="upload-vocals-style"
							label="Style"
							rows={3}
							maxlength={GENERATION_STYLE_MAX_LENGTH}
							placeholder="synthpop, dreamy, emotional"
							textareaClass="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
						/>
					</div>

					<div class="md:col-span-2">
						<label
							class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
							for="upload-vocals-negative-tags">Negative Tags</label
						>
						<textarea
							id="upload-vocals-negative-tags"
							bind:value={negativeTags}
							rows="2"
							maxlength={NEGATIVE_TAGS_MAX_LENGTH}
							placeholder="screamo, distortion"
							class="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400"
						></textarea>
						<p
							class={`mt-1 text-xs ${hasNegativeTagsOverflow ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
						>
							{negativeTags.length}/{NEGATIVE_TAGS_MAX_LENGTH} characters
						</p>
					</div>
				</div>

				{#if submitError}
					<div
						class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
					>
						{submitError}
					</div>
				{/if}

				<div class="flex justify-end gap-3">
					<button
						type="button"
						onclick={closeModal}
						disabled={isSubmitting}
						class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!canSubmit}
						class="inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-violet-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:from-violet-700 hover:to-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if isSubmitting}
							<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								></path>
							</svg>
							Generating...
						{:else}
							Generate Vocals
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
