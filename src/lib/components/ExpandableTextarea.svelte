<script lang="ts">
	let {
		value = $bindable(''),
		label,
		id,
		placeholder,
		rows = 3,
		maxlength,
		textareaClass = '',
		mono = false
	}: {
		value: string;
		label: string;
		id?: string;
		placeholder?: string;
		rows?: number;
		maxlength?: number;
		/** Full Tailwind class string for the inline textarea. */
		textareaClass?: string;
		/** When true, applies font-mono text-sm to the focus-mode textarea. */
		mono?: boolean;
	} = $props();

	let expanded = $state(false);
	let inlineTextarea: HTMLTextAreaElement | undefined = $state();
	let focusTextarea: HTMLTextAreaElement | undefined = $state();

	function open() {
		expanded = true;
	}

	function close() {
		expanded = false;
		// Return focus to the inline textarea
		setTimeout(() => inlineTextarea?.focus(), 0);
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) close();
	}

	function handleBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') close();
	}

	// When expanded, move focus into the focus-mode textarea
	$effect(() => {
		if (expanded) {
			setTimeout(() => {
				if (focusTextarea) {
					focusTextarea.focus();
					focusTextarea.setSelectionRange(focusTextarea.value.length, focusTextarea.value.length);
				}
			}, 0);
		}
	});
</script>

<!-- Inline wrapper with expand button -->
<div class="group/expandable relative">
	<textarea
		bind:this={inlineTextarea}
		bind:value
		{id}
		{placeholder}
		{rows}
		{maxlength}
		class={textareaClass}
	></textarea>

	<!-- Expand button — top-right corner, subtle until hover -->
	<button
		type="button"
		onclick={open}
		tabindex="-1"
		aria-label="Expand {label} editor"
		title="Expand editor"
		class="absolute top-2 right-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded-md bg-white/80 text-gray-400 opacity-0 shadow-sm ring-1 ring-gray-200/70 transition-all duration-150 group-hover/expandable:opacity-100 hover:bg-white hover:text-gray-700 hover:shadow focus:opacity-100 dark:bg-gray-700/80 dark:text-gray-500 dark:ring-gray-600/60 dark:hover:bg-gray-700 dark:hover:text-gray-200"
	>
		<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
			/>
		</svg>
	</button>
</div>

<!-- Focus Mode Overlay -->
{#if expanded}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		onclick={handleBackdropClick}
		onkeydown={handleBackdropKeydown}
		tabindex="-1"
	>
		<div
			class="flex h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
			role="dialog"
			aria-modal="true"
			aria-label="{label} — Focus editor"
		>
			<!-- Header -->
			<div
				class="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800"
			>
				<div class="flex items-center gap-3">
					<div
						class="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600"
					>
						<svg
							class="h-4.5 w-4.5 text-white"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">{label}</h2>
						<p class="text-xs text-gray-500 dark:text-gray-400">
							Focus mode — press Escape to close
						</p>
					</div>
				</div>

				<div class="flex items-center gap-3">
					{#if maxlength}
						<span
							class="text-xs text-gray-400 tabular-nums dark:text-gray-500"
							class:text-amber-500={value.length > maxlength * 0.9}
							class:dark:text-amber-400={value.length > maxlength * 0.9}
						>
							{value.length}/{maxlength}
						</span>
					{/if}
					<button
						type="button"
						onclick={close}
						class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-200"
						aria-label="Close focus editor"
						title="Close (Escape)"
					>
						<svg
							class="h-4 w-4"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Textarea body -->
			<div class="flex min-h-0 flex-1 flex-col p-6">
				<textarea
					bind:this={focusTextarea}
					bind:value
					{placeholder}
					{maxlength}
					class="min-h-0 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50/50 px-5 py-4 text-gray-900 placeholder-gray-400 transition-colors focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-100 dark:placeholder-gray-600 dark:focus:border-indigo-600 dark:focus:bg-gray-800{mono
						? ' font-mono text-sm'
						: ''}"
				></textarea>
			</div>
		</div>
	</div>
{/if}
