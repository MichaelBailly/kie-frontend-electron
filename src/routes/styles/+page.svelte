<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import type { StyleCollection } from '$lib/types';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();

	// Local reactive list — untrack() explicitly marks the intentional one-time initialisation from server data;
	// subsequent mutations (add / edit / delete) are managed locally without re-syncing to data.styles.
	let styles = $state<StyleCollection[]>(untrack(() => data.styles));

	// Filter
	let filterText = $state('');
	let filteredStyles = $derived(
		filterText.trim()
			? styles.filter(
					(s) =>
						s.name.toLowerCase().includes(filterText.toLowerCase()) ||
						s.description.toLowerCase().includes(filterText.toLowerCase()) ||
						s.style.toLowerCase().includes(filterText.toLowerCase())
				)
			: styles
	);

	// New style form
	let showNewForm = $state(false);
	let newName = $state('');
	let newDescription = $state('');
	let newStyle = $state('');
	let newSaving = $state(false);

	async function createStyle(e: Event) {
		e.preventDefault();
		if (!newName.trim() || !newStyle.trim()) return;
		newSaving = true;
		try {
			const res = await fetch('/api/style-collection', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newName.trim(),
					style: newStyle.trim(),
					description: newDescription.trim()
				})
			});
			if (res.ok) {
				const created = await res.json();
				styles = [created, ...styles];
				newName = '';
				newDescription = '';
				newStyle = '';
				showNewForm = false;
			}
		} finally {
			newSaving = false;
		}
	}

	// Editing
	let editingId = $state<number | null>(null);
	let editName = $state('');
	let editDescription = $state('');
	let editStyle = $state('');
	let editSaving = $state(false);

	function startEdit(s: StyleCollection) {
		editingId = s.id;
		editName = s.name;
		editDescription = s.description;
		editStyle = s.style;
	}

	function cancelEdit() {
		editingId = null;
	}

	async function saveEdit(e: Event) {
		e.preventDefault();
		if (!editingId || !editName.trim() || !editStyle.trim()) return;
		editSaving = true;
		try {
			const res = await fetch(`/api/style-collection/${editingId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: editName.trim(),
					style: editStyle.trim(),
					description: editDescription.trim()
				})
			});
			if (res.ok) {
				const updated = await res.json();
				styles = styles.map((s) => (s.id === editingId ? updated : s));
				editingId = null;
			}
		} finally {
			editSaving = false;
		}
	}

	// Delete
	let deletingId = $state<number | null>(null);
	let deleteConfirmId = $state<number | null>(null);

	async function confirmDelete(id: number) {
		deletingId = id;
		deleteConfirmId = null;
		try {
			const res = await fetch(`/api/style-collection/${id}`, { method: 'DELETE' });
			if (res.ok) {
				styles = styles.filter((s) => s.id !== id);
			}
		} finally {
			deletingId = null;
		}
	}

	// Copy style text
	let copiedId = $state<number | null>(null);

	async function copyStyle(s: StyleCollection) {
		await navigator.clipboard.writeText(s.style).catch(() => {});
		copiedId = s.id;
		setTimeout(() => {
			if (copiedId === s.id) copiedId = null;
		}, 2000);
	}

	function formatDate(d: string): string {
		return new Date(d).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Style Collection – KIE Music</title>
</svelte:head>

<div class="min-h-screen bg-linear-to-br from-gray-900 via-gray-900 to-indigo-950">
	<!-- Header -->
	<header class="border-b border-white/10 bg-black/20 backdrop-blur-sm">
		<div class="mx-auto max-w-6xl px-6 py-8">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-4">
					<a
						href={resolve('/')}
						class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
						title="Back to Projects"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 19l-7-7 7-7"
							/>
						</svg>
					</a>
					<div>
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-500 to-purple-600"
							>
								<svg
									class="h-5 w-5 text-white"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/>
								</svg>
							</div>
							<div>
								<h1 class="text-3xl font-bold text-white">Style Collection</h1>
								<p class="mt-1 text-gray-400">
									{styles.length} saved style{styles.length !== 1 ? 's' : ''}
									· Reuse them in any generation
								</p>
							</div>
						</div>
					</div>
				</div>

				<button
					onclick={() => {
						showNewForm = true;
						filterText = '';
					}}
					class="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/30 active:scale-95"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					New Style
				</button>
			</div>

			<!-- Search -->
			{#if styles.length > 0 || filterText}
				<div class="mt-6">
					<div class="relative max-w-sm">
						<svg
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
							/>
						</svg>
						<input
							type="text"
							bind:value={filterText}
							placeholder="Filter styles…"
							class="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pr-4 pl-10 text-sm text-white placeholder-gray-500 backdrop-blur-sm transition-colors focus:border-indigo-500/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
						/>
					</div>
				</div>
			{/if}
		</div>
	</header>

	<!-- Content -->
	<main class="mx-auto max-w-6xl px-6 py-10">
		<!-- New style form card -->
		{#if showNewForm}
			<div
				class="mb-8 overflow-hidden rounded-2xl border border-indigo-500/40 bg-white/5 shadow-2xl shadow-indigo-500/10 backdrop-blur-sm"
			>
				<div
					class="flex items-center justify-between border-b border-white/10 bg-indigo-600/10 px-6 py-4"
				>
					<div class="flex items-center gap-2">
						<div class="h-2 w-2 rounded-full bg-indigo-400"></div>
						<span class="text-sm font-semibold text-indigo-300">New Style</span>
					</div>
					<button
						onclick={() => (showNewForm = false)}
						aria-label="Close"
						class="rounded-lg p-1 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
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
				<form onsubmit={createStyle} class="grid gap-4 p-6 sm:grid-cols-2">
					<div>
						<label
							class="mb-1.5 block text-xs font-semibold tracking-wider text-gray-400 uppercase"
							for="new-name"
						>
							Name <span class="text-red-400">*</span>
						</label>
						<input
							id="new-name"
							type="text"
							bind:value={newName}
							placeholder="Cinematic Orchestral"
							maxlength="100"
							required
							class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-indigo-500/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
						/>
					</div>
					<div>
						<label
							class="mb-1.5 block text-xs font-semibold tracking-wider text-gray-400 uppercase"
							for="new-desc"
						>
							Description
						</label>
						<input
							id="new-desc"
							type="text"
							bind:value={newDescription}
							placeholder="When to use this style…"
							maxlength="500"
							class="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-indigo-500/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
						/>
					</div>
					<div class="sm:col-span-2">
						<label
							class="mb-1.5 block text-xs font-semibold tracking-wider text-gray-400 uppercase"
							for="new-style"
						>
							Style prompt <span class="text-red-400">*</span>
						</label>
						<textarea
							id="new-style"
							bind:value={newStyle}
							rows="3"
							maxlength="2000"
							required
							placeholder="Describe the musical style in detail…"
							class="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 transition-colors focus:border-indigo-500/60 focus:bg-white/10 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
						></textarea>
						<p class="mt-1 text-right text-xs text-gray-600">{newStyle.length}/2000</p>
					</div>
					<div class="flex justify-end gap-3 sm:col-span-2">
						<button
							type="button"
							onclick={() => (showNewForm = false)}
							class="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-gray-400 transition-colors hover:border-white/20 hover:text-white"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={newSaving || !newName.trim() || !newStyle.trim()}
							class="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
						>
							{#if newSaving}
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
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
									></path>
								</svg>
							{/if}
							Save Style
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Empty state -->
		{#if styles.length === 0 && !showNewForm}
			<div class="py-24 text-center">
				<div
					class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10"
				>
					<svg
						class="h-10 w-10 text-gray-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
				</div>
				<h2 class="text-xl font-semibold text-white">No styles saved yet</h2>
				<p class="mt-2 text-gray-400">
					Save a style from any song page, or create one from scratch.
				</p>
				<button
					onclick={() => (showNewForm = true)}
					class="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Create your first style
				</button>
			</div>
		{:else if filteredStyles.length === 0 && filterText}
			<!-- No filter results -->
			<div class="py-16 text-center">
				<p class="text-gray-400">No styles match "<span class="text-white">{filterText}</span>"</p>
				<button
					onclick={() => (filterText = '')}
					class="mt-3 text-sm text-indigo-400 hover:text-indigo-300"
				>
					Clear filter
				</button>
			</div>
		{:else}
			<!-- Style cards grid -->
			<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{#each filteredStyles as s (s.id)}
					<div
						class="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/4 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-white/15 hover:bg-white/7 hover:shadow-xl"
					>
						{#if editingId === s.id}
							<!-- Edit form -->
							<form onsubmit={saveEdit} class="flex flex-col gap-3 p-5">
								<div>
									<label
										class="mb-1 block text-xs font-semibold tracking-wider text-gray-400 uppercase"
										for="edit-name-{s.id}"
									>
										Name
									</label>
									<input
										id="edit-name-{s.id}"
										type="text"
										bind:value={editName}
										maxlength="100"
										required
										class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500/60 focus:bg-white/10 focus:outline-none"
									/>
								</div>
								<div>
									<label
										class="mb-1 block text-xs font-semibold tracking-wider text-gray-400 uppercase"
										for="edit-desc-{s.id}"
									>
										Description
									</label>
									<input
										id="edit-desc-{s.id}"
										type="text"
										bind:value={editDescription}
										maxlength="500"
										class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500/60 focus:bg-white/10 focus:outline-none"
									/>
								</div>
								<div>
									<label
										class="mb-1 block text-xs font-semibold tracking-wider text-gray-400 uppercase"
										for="edit-style-{s.id}"
									>
										Style prompt
									</label>
									<textarea
										id="edit-style-{s.id}"
										bind:value={editStyle}
										rows="4"
										maxlength="2000"
										required
										class="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500/60 focus:bg-white/10 focus:outline-none"
									></textarea>
									<p class="mt-0.5 text-right text-xs text-gray-600">{editStyle.length}/2000</p>
								</div>
								<div class="flex gap-2">
									<button
										type="submit"
										disabled={editSaving}
										class="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
									>
										{#if editSaving}
											<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
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
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
												></path>
											</svg>
										{:else}
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M5 13l4 4L19 7"
												/>
											</svg>
										{/if}
										Save
									</button>
									<button
										type="button"
										onclick={cancelEdit}
										class="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-400 transition-colors hover:border-white/20 hover:text-white"
									>
										Cancel
									</button>
								</div>
							</form>
						{:else}
							<!-- View mode -->
							<div class="flex flex-1 flex-col p-5">
								<!-- Card header -->
								<div class="mb-3 flex items-start justify-between gap-2">
									<div class="min-w-0">
										<h3 class="truncate text-base font-bold text-white">{s.name}</h3>
										{#if s.description}
											<p class="mt-0.5 text-xs text-gray-400">{s.description}</p>
										{/if}
									</div>
									<!-- Action buttons — show on hover -->
									<div
										class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100"
									>
										<!-- Copy -->
										<button
											type="button"
											onclick={() => copyStyle(s)}
											class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
											title="Copy style"
										>
											{#if copiedId === s.id}
												<svg
													class="h-3.5 w-3.5 text-emerald-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2.5"
														d="M5 13l4 4L19 7"
													/>
												</svg>
											{:else}
												<svg
													class="h-3.5 w-3.5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
													/>
												</svg>
											{/if}
										</button>
										<!-- Edit -->
										<button
											type="button"
											onclick={() => startEdit(s)}
											class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
											title="Edit style"
										>
											<svg
												class="h-3.5 w-3.5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
												/>
											</svg>
										</button>
										<!-- Delete -->
										{#if deleteConfirmId === s.id}
											<button
												type="button"
												onclick={() => confirmDelete(s.id)}
												disabled={deletingId === s.id}
												class="flex h-7 items-center gap-1 rounded-lg bg-red-500/20 px-2 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/30"
												title="Confirm delete"
											>
												{#if deletingId === s.id}
													<svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
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
															d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
														></path>
													</svg>
												{:else}
													Confirm
												{/if}
											</button>
										{:else}
											<button
												type="button"
												onclick={() => (deleteConfirmId = s.id)}
												class="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-500/20 hover:text-red-400"
												title="Delete style"
											>
												<svg
													class="h-3.5 w-3.5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
													/>
												</svg>
											</button>
										{/if}
									</div>
								</div>

								<!-- Style text -->
								<div class="relative flex-1 overflow-hidden rounded-xl bg-black/30 p-3.5">
									<p class="line-clamp-6 font-mono text-xs leading-relaxed text-gray-300">
										{s.style}
									</p>
									<!-- Fade at bottom if long -->
									<div
										class="pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-linear-to-t from-black/30 to-transparent"
									></div>
								</div>
							</div>

							<!-- Card footer -->
							<div class="shrink-0 border-t border-white/5 px-5 py-3">
								<p class="text-xs text-gray-600">Saved {formatDate(s.created_at)}</p>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</main>
</div>

<!-- Click outside to dismiss delete confirm -->
{#if deleteConfirmId !== null}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-0"
		onclick={() => (deleteConfirmId = null)}
		onkeydown={(e) => e.key === 'Escape' && (deleteConfirmId = null)}
	></div>
{/if}
