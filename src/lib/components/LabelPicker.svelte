<script lang="ts">
	let {
		labels = [],
		generationId,
		audioId,
		placeholder = 'Add label'
	}: {
		labels?: string[];
		generationId: number;
		audioId: string;
		placeholder?: string;
	} = $props();

	let currentLabels = $state<string[]>([]);
	let inputValue = $state('');
	let suggestions = $state<string[]>([]);
	let isOpen = $state(false);
	let isLoading = $state(false);
	let highlightedIndex = $state(-1);
	let isSaving = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();
	let popoverEl: HTMLDivElement | undefined = $state();
	let addButtonEl: HTMLButtonElement | undefined = $state();
	let blurTimer: ReturnType<typeof setTimeout> | null = null;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	let saveId = $state(0);

	$effect(() => {
		const incoming = labels ?? [];
		const current = currentLabels ?? [];
		if (incoming.length !== current.length || incoming.some((v, i) => v !== current[i])) {
			currentLabels = [...incoming];
		}
	});

	function normalizeLabel(label: string): string {
		return label.trim().toLowerCase();
	}

	function formatLabel(label: string): string {
		const normalized = normalizeLabel(label);
		return normalized.replace(/(^|[\s\/-])([a-z0-9])/g, (_match, sep, char) => {
			return `${sep}${char.toUpperCase()}`;
		});
	}

	function updateLabels(nextLabels: string[]) {
		const previous = currentLabels;
		currentLabels = nextLabels;
		saveLabels(nextLabels, previous);
	}

	async function saveLabels(nextLabels: string[], previous: string[]) {
		saveId += 1;
		const localSaveId = saveId;
		isSaving = true;

		try {
			const response = await fetch(`/api/generations/${generationId}/annotations`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ audioId, action: 'set_labels', labels: nextLabels })
			});

			if (!response.ok) {
				throw new Error('Failed to save labels');
			}

			const updated = (await response.json()) as { labels?: string[] };
			if (localSaveId === saveId && updated.labels) {
				currentLabels = updated.labels;
			}
		} catch {
			if (localSaveId === saveId) {
				currentLabels = previous;
			}
		} finally {
			if (localSaveId === saveId) {
				isSaving = false;
			}
		}
	}

	function addLabel(label: string) {
		const normalized = normalizeLabel(label);
		if (!normalized || normalized.length > 128) return;
		if (currentLabels.some((existing) => normalizeLabel(existing) === normalized)) {
			inputValue = '';
			highlightedIndex = -1;
			return;
		}
		const nextLabels = [...currentLabels, normalized];
		updateLabels(nextLabels);
		inputValue = '';
		highlightedIndex = -1;
		void loadSuggestions('');
	}

	function removeLabel(label: string) {
		const normalized = normalizeLabel(label);
		const nextLabels = currentLabels.filter((existing) => normalizeLabel(existing) !== normalized);
		updateLabels(nextLabels);
		void loadSuggestions(inputValue);
	}

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		inputValue = target.value;
		isOpen = true;
		highlightedIndex = -1;
		queueSuggestions();
	}

	function handleFocus() {
		queueSuggestions();
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			if (!isOpen) isOpen = true;
			const next = highlightedIndex + 1;
			highlightedIndex = Math.min(next, suggestions.length - 1);
			return;
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			const next = highlightedIndex - 1;
			highlightedIndex = Math.max(next, -1);
			return;
		}

		if (event.key === 'Enter' || event.key === 'Tab') {
			if (event.key === 'Tab' && inputValue.trim() === '') return;
			event.preventDefault();
			if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
				addLabel(suggestions[highlightedIndex]);
			} else {
				addLabel(inputValue);
			}
			return;
		}

		if (event.key === 'Backspace' && inputValue.trim() === '') {
			if (currentLabels.length > 0) {
				event.preventDefault();
				removeLabel(currentLabels[currentLabels.length - 1]);
			}
		}

		if (event.key === 'Escape') {
			closePopover();
		}
	}

	function queueSuggestions() {
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			void loadSuggestions(inputValue);
		}, 180);
	}

	async function loadSuggestions(query: string) {
		isLoading = true;
		try {
			const response = await fetch(`/api/labels?query=${encodeURIComponent(query)}&limit=8`);
			if (!response.ok) throw new Error('Failed');
			const data = (await response.json()) as { suggestions: string[] };
			const filtered = data.suggestions.filter(
				(label) => !currentLabels.some((existing) => normalizeLabel(existing) === label)
			);
			suggestions = filtered;
		} catch {
			suggestions = [];
		} finally {
			isLoading = false;
		}
	}

	function handleSuggestionClick(label: string) {
		addLabel(label);
		inputEl?.focus();
	}

	function openPopover() {
		isOpen = true;
		highlightedIndex = -1;
		queueSuggestions();
	}

	function closePopover() {
		isOpen = false;
		highlightedIndex = -1;
	}

	$effect(() => {
		if (!isOpen) return;
		if (typeof document === 'undefined') return;
		const handleClick = (event: MouseEvent) => {
			const target = event.target as Node;
			if (popoverEl?.contains(target)) return;
			if (addButtonEl?.contains(target)) return;
			closePopover();
		};
		document.addEventListener('mousedown', handleClick);
		return () => {
			document.removeEventListener('mousedown', handleClick);
		};
	});

	$effect(() => {
		if (!isOpen) return;
		if (blurTimer) clearTimeout(blurTimer);
		blurTimer = setTimeout(() => {
			inputEl?.focus();
		}, 0);
	});
</script>

<div class="mt-2">
	<div class="relative">
		<div class="flex flex-wrap items-center gap-2">
			{#each currentLabels as label (label)}
				<span
					class="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 shadow-sm shadow-indigo-500/5 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200"
				>
					{formatLabel(label)}
					<button
						onclick={() => removeLabel(label)}
						class="cursor-pointer rounded-full p-0.5 text-indigo-400 transition-colors hover:text-indigo-700 dark:text-indigo-300 dark:hover:text-indigo-100"
						title="Remove label"
					>
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</span>
			{/each}

			<button
				bind:this={addButtonEl}
				onclick={openPopover}
				class="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-[11px] font-medium text-gray-500 transition-colors hover:border-indigo-300 hover:text-indigo-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-indigo-600 dark:hover:text-indigo-200"
				type="button"
				aria-haspopup="listbox"
				aria-expanded={isOpen}
			>
				<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				<span>{placeholder}</span>
			</button>

			{#if isSaving}
				<span class="text-[11px] text-indigo-500">Saving…</span>
			{/if}
		</div>

		{#if isOpen}
			<div
				bind:this={popoverEl}
				class="absolute z-30 mt-3 w-80 overflow-hidden rounded-2xl border border-white/50 bg-white/85 shadow-2xl ring-1 shadow-black/10 ring-gray-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-gray-950/70 dark:ring-white/10"
			>
				<div
					class="flex items-center gap-2 border-b border-gray-100/80 px-3 py-2.5 dark:border-white/10"
				>
					<div
						class="flex flex-1 items-center gap-2 rounded-xl bg-gray-50/80 px-3 py-2 ring-1 ring-gray-200/70 transition focus-within:ring-2 focus-within:ring-indigo-300/60 dark:bg-gray-900/60 dark:ring-white/10 dark:focus-within:ring-indigo-500/40"
					>
						<input
							bind:this={inputEl}
							value={inputValue}
							oninput={handleInput}
							onfocus={handleFocus}
							onkeydown={handleKeyDown}
							placeholder="Search or add label"
							aria-controls="label-suggestions"
							class="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200"
							maxlength="128"
						/>
					</div>
					<button
						onclick={closePopover}
						class="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100/80 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-gray-200"
						type="button"
						title="Close"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>

				<div
					id="label-suggestions"
					role="listbox"
					aria-label="Label suggestions"
					tabindex="-1"
					class="max-h-60 overflow-auto p-1"
					onmousedown={(event) => event.preventDefault()}
				>
					{#if isLoading}
						<div class="px-3 py-2 text-xs text-gray-400">Loading labels…</div>
					{:else if suggestions.length > 0}
						{#each suggestions as suggestion, index (suggestion)}
							<button
								onclick={() => handleSuggestionClick(suggestion)}
								role="option"
								aria-selected={highlightedIndex === index}
								class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-all {highlightedIndex ===
								index
									? 'bg-indigo-50/80 text-indigo-700 shadow-sm shadow-indigo-500/10 dark:bg-indigo-500/10 dark:text-indigo-200'
									: 'text-gray-700 hover:bg-gray-100/70 dark:text-gray-200 dark:hover:bg-white/10'}"
							>
								<span>{formatLabel(suggestion)}</span>
								<span class="text-[11px] text-gray-400">Press enter</span>
							</button>
						{/each}
					{:else if inputValue.trim().length > 0}
						<div class="px-3 py-2 text-xs text-gray-400">
							Press enter to add “{formatLabel(inputValue)}”
						</div>
					{:else}
						<div class="px-3 py-2 text-xs text-gray-400">Start typing to search labels</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
