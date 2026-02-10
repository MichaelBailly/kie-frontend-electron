<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();

	// Form state
	let apiKey = $state('');
	let showApiKey = $state(false);
	let isSaving = $state(false);
	let isValidating = $state(false);
	let saveMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);
	let validationResult = $state<{ valid: boolean; message?: string; error?: string } | null>(null);

	// Derived state
	let hasExistingKey = $derived(data.hasApiKey);
	let maskedKey = $derived(data.maskedApiKey);

	// Clear messages after delay
	$effect(() => {
		if (saveMessage) {
			const timeout = setTimeout(() => {
				saveMessage = null;
			}, 5000);
			return () => clearTimeout(timeout);
		}
	});

	async function saveApiKey() {
		if (!apiKey.trim() && !hasExistingKey) return;

		isSaving = true;
		saveMessage = null;

		try {
			const response = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apiKey: apiKey.trim() || undefined })
			});

			if (response.ok) {
				const result = await response.json();
				saveMessage = { type: 'success', text: 'API key saved successfully' };
				apiKey = '';
				// Refresh page data
				data = { ...data, hasApiKey: result.hasApiKey, maskedApiKey: result.apiKey };
			} else {
				saveMessage = { type: 'error', text: 'Failed to save API key' };
			}
		} catch {
			saveMessage = { type: 'error', text: 'An error occurred while saving' };
		} finally {
			isSaving = false;
		}
	}

	async function validateApiKey() {
		const keyToValidate = apiKey.trim() || undefined;
		
		isValidating = true;
		validationResult = null;

		try {
			const response = await fetch('/api/settings/validate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apiKey: keyToValidate })
			});

			const result = await response.json();
			validationResult = result;
		} catch {
			validationResult = { valid: false, error: 'Failed to validate API key' };
		} finally {
			isValidating = false;
		}
	}

	async function clearApiKey() {
		if (!confirm('Are you sure you want to remove your API key?')) return;

		isSaving = true;
		saveMessage = null;

		try {
			const response = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ apiKey: '' })
			});

			if (response.ok) {
				saveMessage = { type: 'success', text: 'API key removed' };
				data = { ...data, hasApiKey: false, maskedApiKey: null };
				apiKey = '';
				validationResult = null;
			}
		} catch {
			saveMessage = { type: 'error', text: 'Failed to remove API key' };
		} finally {
			isSaving = false;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			saveApiKey();
		}
	}
</script>

<svelte:head>
	<title>Settings - KIE Music</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950">
	<!-- Header -->
	<header class="border-b border-white/10 bg-black/20 backdrop-blur-sm">
		<div class="mx-auto max-w-3xl px-6 py-8">
			<div class="flex items-center gap-4">
				<a
					href={resolve('/')}
					class="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
					aria-label="Back to projects"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</a>
				<div>
					<h1 class="text-3xl font-bold text-white">Settings</h1>
					<p class="mt-1 text-gray-400">Configure your KIE Music application</p>
				</div>
			</div>
		</div>
	</header>

	<!-- Main content -->
	<main class="mx-auto max-w-3xl px-6 py-10">
		<!-- API Key Section -->
		<section class="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
			<!-- Section Header -->
			<div class="border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-6 py-5">
				<div class="flex items-start gap-4">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
						<svg class="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-semibold text-white">KIE API Key</h2>
						<p class="mt-1 text-sm text-gray-400">
							Your API key is required to generate music. Get one from
							<a
								href="https://kie.ai"
								target="_blank"
								rel="noopener noreferrer"
								class="text-indigo-400 hover:text-indigo-300 hover:underline"
							>
								kie.ai
							</a>
						</p>
					</div>
				</div>
			</div>

			<!-- Section Body -->
			<div class="p-6">
				<!-- Current Key Status -->
				{#if hasExistingKey}
					<div class="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
							<svg class="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
							</svg>
						</div>
						<div class="flex-1">
							<p class="text-sm font-medium text-emerald-300">API key configured</p>
							<p class="font-mono text-xs text-emerald-400/70">{maskedKey}</p>
						</div>
						<button
							onclick={clearApiKey}
							disabled={isSaving}
							class="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
						>
							Remove
						</button>
					</div>
				{:else}
					<div class="mb-6 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
						<div class="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20">
							<svg class="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
						<div>
							<p class="text-sm font-medium text-amber-300">No API key configured</p>
							<p class="text-xs text-amber-400/70">Add your API key to start generating music</p>
						</div>
					</div>
				{/if}

				<!-- API Key Input -->
				<div class="space-y-4">
					<label class="block">
						<span class="mb-2 block text-sm font-medium text-gray-300">
							{hasExistingKey ? 'Update API Key' : 'Enter API Key'}
						</span>
						<div class="relative">
							<input
								type={showApiKey ? 'text' : 'password'}
								bind:value={apiKey}
								onkeydown={handleKeydown}
								placeholder={hasExistingKey ? 'Enter new API key to update...' : 'Enter your KIE API key...'}
								class="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-4 pr-12 font-mono text-sm text-white placeholder-gray-500 transition-all focus:border-indigo-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
							/>
							<button
								type="button"
								onclick={() => (showApiKey = !showApiKey)}
								class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/10 hover:text-gray-300"
								aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
							>
								{#if showApiKey}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
									</svg>
								{:else}
									<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
								{/if}
							</button>
						</div>
					</label>

					<!-- Validation Result -->
					{#if validationResult}
						<div
							class="flex items-center gap-3 rounded-xl border px-4 py-3 {validationResult.valid
								? 'border-emerald-500/20 bg-emerald-500/10'
								: 'border-red-500/20 bg-red-500/10'}"
						>
							{#if validationResult.valid}
								<svg class="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span class="text-sm text-emerald-300">{validationResult.message || 'API key is valid'}</span>
							{:else}
								<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span class="text-sm text-red-300">{validationResult.error || 'Invalid API key'}</span>
							{/if}
						</div>
					{/if}

					<!-- Save Message -->
					{#if saveMessage}
						<div
							class="flex items-center gap-3 rounded-xl border px-4 py-3 {saveMessage.type === 'success'
								? 'border-emerald-500/20 bg-emerald-500/10'
								: 'border-red-500/20 bg-red-500/10'}"
						>
							{#if saveMessage.type === 'success'}
								<svg class="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<span class="text-sm text-emerald-300">{saveMessage.text}</span>
							{:else}
								<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
								<span class="text-sm text-red-300">{saveMessage.text}</span>
							{/if}
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex flex-wrap gap-3 pt-2">
						<button
							onclick={saveApiKey}
							disabled={isSaving || (!apiKey.trim() && !hasExistingKey)}
							class="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-indigo-500/25"
						>
							{#if isSaving}
								<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
								</svg>
								Saving...
							{:else}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								Save API Key
							{/if}
						</button>

						<button
							onclick={validateApiKey}
							disabled={isValidating || (!apiKey.trim() && !hasExistingKey)}
							class="flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if isValidating}
								<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
								</svg>
								Validating...
							{:else}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
								{apiKey.trim() ? 'Test Key' : 'Test Saved Key'}
							{/if}
						</button>
					</div>
				</div>
			</div>

			<!-- Section Footer -->
			<div class="border-t border-white/10 bg-white/[0.02] px-6 py-4">
				<p class="text-xs text-gray-500">
					Your API key is stored locally and never sent to any server except kie.ai.
					Keep it safe and don't share it with others.
				</p>
			</div>
		</section>

		<!-- About Section -->
		<section class="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
			<div class="px-6 py-5">
				<h2 class="text-lg font-semibold text-white">About KIE Music</h2>
				<p class="mt-2 text-sm text-gray-400">
					KIE Music is a desktop application for creating AI-powered music using the KIE API.
					Generate unique songs, extend tracks, separate vocals, and more.
				</p>
				<div class="mt-4 flex items-center gap-4 text-xs text-gray-500">
					<span class="flex items-center gap-1.5">
						<span class="h-2 w-2 rounded-full bg-emerald-500"></span>
						Version 1.0.0
					</span>
					<a
						href="https://kie.ai/docs"
						target="_blank"
						rel="noopener noreferrer"
						class="text-indigo-400 hover:text-indigo-300 hover:underline"
					>
						API Documentation
					</a>
				</div>
			</div>
		</section>
	</main>
</div>
