<script lang="ts">
	import type { PageData } from './$types';
	import type { Generation } from '$lib/types';
	import GenerationView from '$lib/components/GenerationView.svelte';
	import RetryExtendModal from '$lib/components/RetryExtendModal.svelte';
	import RetryAddInstrumentalModal from '$lib/components/RetryAddInstrumentalModal.svelte';
	import RetryAddVocalsModal from '$lib/components/RetryAddVocalsModal.svelte';
	import RetryUploadInstrumentalModal from '$lib/components/RetryUploadInstrumentalModal.svelte';
	import RetryUploadVocalsModal from '$lib/components/RetryUploadVocalsModal.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getContext } from 'svelte';
	import { isGenerationTypeOneOf } from '$lib/types';

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
	let showRetryUploadModal = $state(false);

	const isAddInstrumental = $derived(
		isGenerationTypeOneOf(generation.generation_type, ['add_instrumental', 'upload_instrumental'])
	);
	const isAddVocals = $derived(
		isGenerationTypeOneOf(generation.generation_type, ['add_vocals', 'upload_vocals'])
	);
	const isUploadBased = $derived(
		isGenerationTypeOneOf(generation.generation_type, ['upload_instrumental', 'upload_vocals'])
	);
	const retrySourceSong = $derived(data.retryExtension?.sourceSong ?? null);
	const retryDisabledReason = $derived(
		data.retryExtension && !data.retryExtension.canRetry ? data.retryExtension.reason : null
	);
	const retryUploadDisabledReason = $derived(
		data.retryUpload && !data.retryUpload.canRetry ? data.retryUpload.reason : null
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

	function openRetryUploadModal() {
		if (!data.retryUpload?.canRetry) {
			return;
		}
		showRetryUploadModal = true;
	}

	function closeRetryUploadModal() {
		showRetryUploadModal = false;
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

	async function handleRetryAddVocals(retryData: {
		title: string;
		prompt: string;
		style: string;
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

		const response = await fetch('/api/generations/add-vocals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: generation.project_id,
				title: retryData.title,
				prompt: retryData.prompt,
				style: retryData.style,
				negativeTags: retryData.negativeTags,
				sourceGenerationId: data.retryExtension.extendsGenerationId,
				sourceAudioId: data.retryExtension.extendsAudioId,
				stemType: data.retryExtension.stemType,
				stemUrl: data.retryExtension.stemUrl
			})
		});

		if (!response.ok) {
			console.error('Failed to create retry add-vocals generation');
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

	async function handleRetryUploadInstrumental(retryData: {
		title: string;
		tags: string;
		negativeTags: string;
	}) {
		if (!data.retryUpload?.sourceGenerationId) {
			return;
		}

		const response = await fetch('/api/generations/retry-upload-instrumental', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: generation.project_id,
				title: retryData.title,
				tags: retryData.tags,
				negativeTags: retryData.negativeTags,
				sourceGenerationId: data.retryUpload.sourceGenerationId
			})
		});

		if (!response.ok) {
			console.error('Failed to create retry upload instrumental generation');
			return;
		}

		const newGeneration = await response.json();
		showRetryUploadModal = false;

		goto(
			resolve('/projects/[projectId]/generations/[generationId]', {
				projectId: String(generation.project_id),
				generationId: String(newGeneration.id)
			})
		);
	}

	async function handleRetryUploadVocals(retryData: {
		title: string;
		prompt: string;
		style: string;
		negativeTags: string;
	}) {
		if (!data.retryUpload?.sourceGenerationId) {
			return;
		}

		const response = await fetch('/api/generations/retry-upload-vocals', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				projectId: generation.project_id,
				title: retryData.title,
				prompt: retryData.prompt,
				style: retryData.style,
				negativeTags: retryData.negativeTags,
				sourceGenerationId: data.retryUpload.sourceGenerationId
			})
		});

		if (!response.ok) {
			console.error('Failed to create retry upload vocals generation');
			return;
		}

		const newGeneration = await response.json();
		showRetryUploadModal = false;

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
	onRetryUpload={isUploadBased ? openRetryUploadModal : null}
	{retryUploadDisabledReason}
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
	{:else if isAddVocals && data.retryExtension.stemUrl && data.retryExtension.stemType}
		<RetryAddVocalsModal
			bind:isOpen={showRetryModal}
			onClose={closeRetryModal}
			{generation}
			sourceSong={retrySourceSong}
			stemType={data.retryExtension.stemType}
			stemUrl={data.retryExtension.stemUrl}
			onRetry={handleRetryAddVocals}
		/>
	{:else if !isAddInstrumental && !isAddVocals}
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

{#if data.retryUpload && data.retryUpload.sourceAudioLocalUrl}
	{#if isGenerationTypeOneOf(generation.generation_type, ['upload_instrumental'])}
		<RetryUploadInstrumentalModal
			bind:isOpen={showRetryUploadModal}
			onClose={closeRetryUploadModal}
			{generation}
			sourceAudioLocalUrl={data.retryUpload.sourceAudioLocalUrl}
			onRetry={handleRetryUploadInstrumental}
		/>
	{:else if isGenerationTypeOneOf(generation.generation_type, ['upload_vocals'])}
		<RetryUploadVocalsModal
			bind:isOpen={showRetryUploadModal}
			onClose={closeRetryUploadModal}
			{generation}
			sourceAudioLocalUrl={data.retryUpload.sourceAudioLocalUrl}
			onRetry={handleRetryUploadVocals}
		/>
	{/if}
{/if}
