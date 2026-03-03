<script lang="ts">
	import type { PageData } from './$types';
	import type { Generation } from '$lib/types';
	import GenerationView from '$lib/components/GenerationView.svelte';
	import RetryExtendModal from '$lib/components/RetryExtendModal.svelte';
	import RetryAddInstrumentalModal from '$lib/components/RetryAddInstrumentalModal.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getContext } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Get live activeProject from parent layout context (SSE-updated)
	const activeProjectContext = getContext<{ current: { id: number; generations: Generation[] } }>(
		'activeProject'
	);

	// Use live generation from context which receives SSE updates
	let generation = $derived.by(() => {
		const generationId = data.generation.id;
		const liveProject = activeProjectContext?.current;
		if (liveProject) {
			const liveGeneration = liveProject.generations.find((g) => g.id === generationId);
			if (liveGeneration) {
				return liveGeneration;
			}
		}
		// Fallback to server-loaded data
		return data.generation;
	});

	let showRetryModal = $state(false);

	const isAddInstrumental = $derived(generation.generation_type === 'add_instrumental');
	const retrySourceSong = $derived(data.retryExtension?.sourceSong ?? null);
	const retryDisabledReason = $derived(
		data.retryExtension && !data.retryExtension.canRetry ? data.retryExtension.reason : null
	);

	function openRetryModal() {
		if (!data.retryExtension?.canRetry) {
			return;
		}
		showRetryModal = true;
	}

	function closeRetryModal() {
		showRetryModal = false;
	}

	async function handleRetryExtend(retryData: {
		title: string;
		style: string;
		lyrics: string;
		continueAt: number;
		instrumental: boolean;
	}) {
		if (!data.retryExtension?.extendsGenerationId || !data.retryExtension.extendsAudioId) {
			return;
		}

		const response = await fetch('/api/generations/extend', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: generation.project_id,
				title: retryData.title,
				style: retryData.style,
				lyrics: retryData.lyrics,
				extendsGenerationId: data.retryExtension.extendsGenerationId,
				extendsAudioId: data.retryExtension.extendsAudioId,
				continueAt: retryData.continueAt,
				instrumental: retryData.instrumental
			})
		});

		if (!response.ok) {
			console.error('Failed to create retry extension generation');
			return;
		}

		const newGeneration = await response.json();
		showRetryModal = false;

		goto(
			resolve('/projects/[projectId]/generations/[generationId]', {
				projectId: String(generation.project_id),
				generationId: String(newGeneration.id)
			})
		);
	}

	async function handleRetryAddInstrumental(retryData: {
		title: string;
		tags: string;
		negativeTags: string;
	}) {
		if (
			!data.retryExtension?.extendsGenerationId ||
			!data.retryExtension.extendsAudioId ||
			!data.retryExtension.stemUrl ||
			!data.retryExtension.stemType
		) {
			return;
		}

		const response = await fetch('/api/generations/add-instrumental', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: generation.project_id,
				title: retryData.title,
				tags: retryData.tags,
				negativeTags: retryData.negativeTags,
				sourceGenerationId: data.retryExtension.extendsGenerationId,
				sourceAudioId: data.retryExtension.extendsAudioId,
				stemType: data.retryExtension.stemType,
				stemUrl: data.retryExtension.stemUrl
			})
		});

		if (!response.ok) {
			console.error('Failed to create retry add-instrumental generation');
			return;
		}

		const newGeneration = await response.json();
		showRetryModal = false;

		goto(
			resolve('/projects/[projectId]/generations/[generationId]', {
				projectId: String(generation.project_id),
				generationId: String(newGeneration.id)
			})
		);
	}
</script>

<GenerationView
	{generation}
	parentGeneration={data.parentGeneration}
	parentSong={data.parentSong}
	onRetryExtension={openRetryModal}
	{retryDisabledReason}
/>

{#if data.retryExtension && retrySourceSong}
	{#if isAddInstrumental && data.retryExtension.stemUrl && data.retryExtension.stemType}
		<RetryAddInstrumentalModal
			bind:isOpen={showRetryModal}
			onClose={closeRetryModal}
			{generation}
			sourceSong={retrySourceSong}
			stemType={data.retryExtension.stemType}
			stemUrl={data.retryExtension.stemUrl}
			onRetry={handleRetryAddInstrumental}
		/>
	{:else if !isAddInstrumental}
		<RetryExtendModal
			bind:isOpen={showRetryModal}
			onClose={closeRetryModal}
			{generation}
			sourceSong={retrySourceSong}
			initialContinueAt={data.retryExtension.defaults.continueAt}
			onExtend={handleRetryExtend}
		/>
	{/if}
{/if}
