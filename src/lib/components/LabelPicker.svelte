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
		isOpen = true;
		queueSuggestions();
	}

	function handleBlur() {
		if (blurTimer) clearTimeout(blurTimer);
		blurTimer = setTimeout(() => {
			isOpen = false;
			highlightedIndex = -1;
		}, 120);
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
			isOpen = false;
			highlightedIndex = -1;
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
</script>

<div class="mt-2">
	<div class="relative">
		<div
			class="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition-all focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-900/40 dark:focus-within:border-indigo-500"
		>
			{#each currentLabels as label (label)}
				<span
					class="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 shadow-sm shadow-indigo-500/5 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-200"
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
			<input
				bind:this={inputEl}
				value={inputValue}
				oninput={handleInput}
				onfocus={handleFocus}
				onblur={handleBlur}
				onkeydown={handleKeyDown}
				placeholder={currentLabels.length === 0 ? placeholder : ''}
				aria-expanded={isOpen}
				aria-controls="label-suggestions"
				class="min-w-[6rem] flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200"
				maxlength="128"
			/>
		</div>

		{#if isOpen && (suggestions.length > 0 || inputValue.trim().length > 0)}
			<div
				id="label-suggestions"
				role="listbox"
				aria-label="Label suggestions"
				tabindex="-1"
				class="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-200/40 dark:border-gray-700 dark:bg-gray-900"
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
							class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors {highlightedIndex ===
							index
								? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
								: 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/70'}"
						>
							<span>{formatLabel(suggestion)}</span>
							<span class="text-[11px] text-gray-400">Press enter</span>
						</button>
					{/each}
				{:else}
					<div class="px-3 py-2 text-xs text-gray-400">
						Press enter to add “{formatLabel(inputValue)}”
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="mt-1 flex items-center justify-between text-[11px] text-gray-400">
		<span>Type to add labels · Enter to create · Tab to accept</span>
		{#if isSaving}
			<span class="text-indigo-500">Saving…</span>
		{/if}
	</div>
</div>
