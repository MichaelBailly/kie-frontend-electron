<script lang="ts">
	import { untrack } from 'svelte';
	import ExpandableTextarea from './ExpandableTextarea.svelte';

	let {
		style,
		onClose,
		onSaved
	}: {
		style: string;
		onClose: () => void;
		onSaved?: (name: string) => void;
	} = $props();

	let name = $state('');
	let description = $state('');
	// untrack() marks the intentional one-time capture of the initial prop value for local editing.
	let editedStyle = $state(untrack(() => style));
	let saving = $state(false);
	let error = $state<string | null>(null);

	async function handleSave(e: Event) {
		e.preventDefault();
		if (!name.trim() || !editedStyle.trim()) return;

		saving = true;
		error = null;

		try {
			const res = await fetch('/api/style-collection', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					style: editedStyle.trim(),
					description: description.trim()
				})
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				error = (data as { message?: string }).message ?? 'Failed to save style';
				return;
			}

			onSaved?.(name.trim());
			onClose();
		} catch {
			error = 'An error occurred while saving';
		} finally {
			saving = false;
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
>
	<div
		class="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
		role="dialog"
		aria-modal="true"
		aria-labelledby="save-style-title"
	>
		<!-- Header -->
		<div
			class="flex items-center justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800"
		>
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600"
				>
					<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
				</div>
				<div>
					<h2
						id="save-style-title"
						class="text-base font-semibold text-gray-900 dark:text-gray-100"
					>
						Save to Style Collection
					</h2>
					<p class="text-xs text-gray-500 dark:text-gray-400">
						Reuse this style in future generations
					</p>
				</div>
			</div>
			<button
				type="button"
				onclick={onClose}
				aria-label="Close"
				class="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
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

		<!-- Form -->
		<form onsubmit={handleSave} class="space-y-4 p-6">
			{#if error}
				<div
					class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400"
				>
					{error}
				</div>
			{/if}

			<div>
				<label
					class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
					for="style-name"
				>
					Name <span class="text-red-500">*</span>
				</label>
				<input
					id="style-name"
					type="text"
					bind:value={name}
					placeholder="e.g. Cinematic Orchestral, Dark Trap, Lo-Fi Chill…"
					maxlength="100"
					required
					class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
				/>
			</div>

			<div>
				<label
					class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
					for="style-description"
				>
					Description
					<span class="ml-1 text-xs font-normal text-gray-400">(optional)</span>
				</label>
				<input
					id="style-description"
					type="text"
					bind:value={description}
					placeholder="Short note about when to use this style…"
					maxlength="500"
					class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
				/>
			</div>

			<div>
				<label
					class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
					for="style-text"
				>
					Style prompt <span class="text-red-500">*</span>
				</label>
				<ExpandableTextarea
					bind:value={editedStyle}
					id="style-text"
					label="Style Prompt"
					rows={4}
					maxlength={2000}
					textareaClass="w-full resize-y rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
				/>
				<p class="mt-1 text-right text-xs text-gray-400">{editedStyle.length}/2000</p>
			</div>

			<div class="flex justify-end gap-3 pt-2">
				<button
					type="button"
					onclick={onClose}
					class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={saving || !name.trim() || !editedStyle.trim()}
					class="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if saving}
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
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						Saving…
					{:else}
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						Save to Collection
					{/if}
				</button>
			</div>
		</form>
	</div>
</div>
