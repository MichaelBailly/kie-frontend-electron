<script lang="ts">
	let {
		src = null,
		alt = '',
		imageClass = 'h-full w-full object-cover',
		fallbackClass = 'flex h-full w-full items-center justify-center bg-linear-to-br from-indigo-500 to-purple-600',
		iconClass = 'h-6 w-6 text-white'
	}: {
		src?: string | null;
		alt?: string;
		imageClass?: string;
		fallbackClass?: string;
		iconClass?: string;
	} = $props();

	let hasError = $state(false);

	$effect(() => {
		if (src !== undefined) {
			hasError = false;
		}
	});
</script>

{#if src && !hasError}
	<img {src} {alt} class={imageClass} onerror={() => (hasError = true)} />
{:else}
	<div class={fallbackClass}>
		<svg class={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
			/>
		</svg>
	</div>
{/if}
