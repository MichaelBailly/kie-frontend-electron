<script lang="ts">
	/**
	 * CreditsDisplay - A compact credits badge that fetches and displays
	 * the user's KIE credit balance. Supports two visual variants:
	 * - 'dark': For dark-themed standalone pages (home, settings, styles, highlights)
	 * - 'light': For the project workspace tab bar (light/dark mode aware)
	 */

	type Variant = 'dark' | 'light';

	let { variant = 'dark' }: { variant?: Variant } = $props();

	let credits = $state<number | null>(null);
	let loading = $state(true);
	let hasError = $state(false);

	const REFRESH_INTERVAL_MS = 60_000; // Refresh every 60 seconds

	function formatCredits(value: number): string {
		return new Intl.NumberFormat('en-US', {
			maximumFractionDigits: 1
		}).format(value);
	}

	async function fetchCredits() {
		try {
			const response = await fetch('/api/credits');
			if (!response.ok) {
				hasError = true;
				return;
			}
			const data = await response.json();
			if (data.credits !== undefined) {
				credits = data.credits;
				hasError = false;
			} else {
				hasError = true;
			}
		} catch {
			hasError = true;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		fetchCredits();
		const interval = setInterval(fetchCredits, REFRESH_INTERVAL_MS);
		return () => clearInterval(interval);
	});

	// Don't render anything if there's no API key or a persistent error
	let visible = $derived(!hasError && (loading || credits !== null));
</script>

{#if visible}
	{#if variant === 'dark'}
		<!-- Dark variant: Emerald-tinted pill for dark-themed pages -->
		<div
			class="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-300 backdrop-blur-sm transition-all"
			title={credits !== null
				? `${formatCredits(credits)} credits remaining`
				: 'Loading credits...'}
		>
			<!-- Coin/credits icon -->
			<svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<circle cx="12" cy="12" r="9" stroke-width="2" />
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M14.5 9.5a2.5 2.5 0 00-2.5-1h-1a2 2 0 000 4h2a2 2 0 010 4h-1a2.5 2.5 0 01-2.5-1M12 6v1.5m0 9V18"
				/>
			</svg>
			{#if loading}
				<!-- Skeleton loader -->
				<div class="h-4 w-14 animate-pulse rounded bg-emerald-400/20"></div>
			{:else if credits !== null}
				<span class="tabular-nums">{formatCredits(credits)}</span>
			{/if}
		</div>
	{:else}
		<!-- Light variant: Self-contained pill badge for the project workspace tab bar -->
		<div class="flex shrink-0 items-center border-l border-gray-200 px-3 py-3 dark:border-gray-700">
			<div
				class="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-400"
				title={credits !== null
					? `${formatCredits(credits)} credits remaining`
					: 'Loading credits...'}
			>
				<!-- Coin/credits icon -->
				<svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="9" stroke-width="2" />
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M14.5 9.5a2.5 2.5 0 00-2.5-1h-1a2 2 0 000 4h2a2 2 0 010 4h-1a2.5 2.5 0 01-2.5-1M12 6v1.5m0 9V18"
					/>
				</svg>
				{#if loading}
					<div class="h-3 w-10 animate-pulse rounded-full bg-emerald-500/20"></div>
				{:else if credits !== null}
					<span class="tabular-nums">{formatCredits(credits)}</span>
				{/if}
			</div>
		</div>
	{/if}
{/if}
