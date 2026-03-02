<script lang="ts">
	import type { Generation } from '$lib/types';
	import ExtendSongForm from '$lib/components/ExtendSongForm.svelte';

	let {
		isOpen = $bindable(false),
		onClose,
		generation,
		sourceSong,
		initialContinueAt = null,
		onExtend
	}: {
		isOpen: boolean;
		onClose: () => void;
		generation: Generation;
		sourceSong: {
			id: string;
			title: string;
			streamUrl: string | null;
			audioUrl: string | null;
			imageUrl: string | null;
			duration: number | null;
		};
		initialContinueAt?: number | null;
		onExtend: (data: {
			title: string;
			style: string;
			lyrics: string;
			continueAt: number;
			instrumental: boolean;
		}) => void | Promise<void>;
	} = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			onClose();
		}
	}

	function handleBackdropClick(event: MouseEvent) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.target !== event.currentTarget) {
			return;
		}
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onClose();
		}
	}

	async function handleExtend(data: {
		title: string;
		style: string;
		lyrics: string;
		continueAt: number;
		instrumental: boolean;
	}) {
		await onExtend(data);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="retry-extend-modal-title"
		tabindex="0"
	>
		<div
			class="relative max-h-[calc(100dvh-2rem)] w-full max-w-5xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900"
			role="document"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900"
			>
				<h2
					id="retry-extend-modal-title"
					class="text-lg font-semibold text-gray-900 dark:text-gray-100"
				>
					Retry Extension
				</h2>
				<button
					onclick={onClose}
					class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
					aria-label="Close modal"
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
			<div class="p-6">
				<ExtendSongForm
					{generation}
					song={sourceSong}
					{initialContinueAt}
					onExtend={handleExtend}
					onCancel={onClose}
				/>
			</div>
		</div>
	</div>
{/if}
