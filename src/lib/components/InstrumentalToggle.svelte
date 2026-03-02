<script lang="ts">
	let {
		value = $bindable(false),
		id = 'instrumental-toggle'
	}: {
		value: boolean;
		id?: string;
	} = $props();
</script>

<!--
  InstrumentalToggle — a sophisticated segmented control to choose between
  "With Vocals" and "Instrumental" generation modes.
-->
<div
	role="group"
	aria-label="Vocal mode"
	class="relative inline-flex w-full items-stretch rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800/60"
>
	<!-- With Vocals option -->
	<button
		type="button"
		{id}
		aria-pressed={!value}
		onclick={() => (value = false)}
		class={[
			'relative flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 select-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:outline-none',
			!value
				? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5 dark:bg-gray-700 dark:text-teal-300 dark:ring-white/10'
				: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
		].join(' ')}
	>
		<!-- Microphone icon -->
		<svg
			class="h-4 w-4 shrink-0 transition-transform duration-200 {!value
				? 'scale-110'
				: 'scale-100'}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
			<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
			<line x1="12" y1="19" x2="12" y2="22" />
			<line x1="8" y1="22" x2="16" y2="22" />
		</svg>
		<span>With Vocals</span>
		{#if !value}
			<!-- Active indicator dot -->
			<span
				class="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-teal-500 dark:bg-teal-400"
			></span>
		{/if}
	</button>

	<!-- Instrumental option -->
	<button
		type="button"
		aria-pressed={value}
		onclick={() => (value = true)}
		class={[
			'relative flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 select-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 focus-visible:outline-none',
			value
				? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg ring-1 shadow-indigo-500/25 ring-indigo-500/20'
				: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
		].join(' ')}
	>
		<!-- Piano / music-note icon -->
		<svg
			class="h-4 w-4 shrink-0 transition-transform duration-200 {value ? 'scale-110' : 'scale-100'}"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M9 18V5l12-2v13" />
			<circle cx="6" cy="18" r="3" />
			<circle cx="18" cy="16" r="3" />
		</svg>
		<span>Instrumental</span>
		{#if value}
			<!-- Subtle sparkle effect on active -->
			<span
				class="absolute -top-px -right-px flex h-4 w-4 items-center justify-center rounded-tr-lg rounded-bl-lg bg-white/20"
			>
				<svg
					class="h-2.5 w-2.5 text-white"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
					<path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" />
				</svg>
			</span>
		{/if}
	</button>
</div>
