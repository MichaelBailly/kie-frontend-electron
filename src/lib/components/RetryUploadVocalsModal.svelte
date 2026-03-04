<script lang="ts">
	import type { Generation } from '$lib/types';
	import AddVocalsForm from '$lib/components/AddVocalsForm.svelte';

	let {
		isOpen = $bindable(false),
		onClose,
		generation,
		sourceAudioLocalUrl,
		onRetry
	}: {
		isOpen: boolean;
		onClose: () => void;
		generation: Generation;
		sourceAudioLocalUrl: string;
		onRetry: (data: {
			title: string;
			prompt: string;
			style: string;
			negativeTags: string;
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

	async function handleSubmit(data: {
		title: string;
		prompt: string;
		style: string;
		negativeTags: string;
	}) {
		await onRetry(data);
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
		aria-labelledby="retry-upload-vocals-modal-title"
		tabindex="0"
	>
		<div
			class="relative max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl dark:bg-gray-900"
			role="document"
		>
			<div
				class="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-900"
			>
				<h2
					id="retry-upload-vocals-modal-title"
					class="text-lg font-semibold text-gray-900 dark:text-gray-100"
				>
					Retry Add Vocals
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
				<AddVocalsForm
					{generation}
					song={{
						id: String(generation.id),
						imageUrl: null,
						title: generation.title
					}}
					stemType="uploaded_audio"
					stemUrl={sourceAudioLocalUrl}
					onSubmit={handleSubmit}
					onCancel={onClose}
				/>
			</div>
		</div>
	</div>
{/if}
