<script lang="ts">
	let { imageUrl, title }: { imageUrl: string; title: string } = $props();
</script>

<div
	class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
>
	<div class="p-4">
		<div class="mb-3 flex items-center gap-3">
			<svg
				class="h-5 w-5 text-indigo-600 dark:text-indigo-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Cover Art</h2>
		</div>
		<img src={imageUrl} alt={title} class="w-full rounded-lg object-cover" />
	</div>
</div>
