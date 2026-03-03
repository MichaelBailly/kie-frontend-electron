<script lang="ts">
	import type { StemSeparation } from '$lib/types';
	import { createCopyWithFeedback } from '$lib/utils/clipboard';

	interface StemTrack {
		key: string;
		name: string;
		url: string | null;
		icon: string;
		color: string;
	}

	let {
		separation,
		onExtendStem
	}: {
		separation: StemSeparation;
		onExtendStem?: (stemType: string, stemUrl: string) => void;
	} = $props();

	let playingStems: Record<string, boolean> = $state({});
	let audioElements: Record<string, HTMLAudioElement> = $state({});

	// Get all available stems based on separation type
	let stems = $derived.by((): StemTrack[] => {
		if (separation.type === 'separate_vocal') {
			return [
				{ key: 'vocal', name: 'Vocals', url: separation.vocal_url, icon: '🎤', color: 'indigo' },
				{
					key: 'instrumental',
					name: 'Instrumental',
					url: separation.instrumental_url,
					icon: '🎸',
					color: 'emerald'
				}
			].filter((s) => s.url);
		} else {
			// split_stem type
			return [
				{ key: 'vocal', name: 'Vocals', url: separation.vocal_url, icon: '🎤', color: 'indigo' },
				{
					key: 'backing_vocals',
					name: 'Backing Vocals',
					url: separation.backing_vocals_url,
					icon: '🎙️',
					color: 'purple'
				},
				{ key: 'drums', name: 'Drums', url: separation.drums_url, icon: '🥁', color: 'red' },
				{ key: 'bass', name: 'Bass', url: separation.bass_url, icon: '🎸', color: 'orange' },
				{ key: 'guitar', name: 'Guitar', url: separation.guitar_url, icon: '🎸', color: 'yellow' },
				{
					key: 'keyboard',
					name: 'Keyboard',
					url: separation.keyboard_url,
					icon: '🎹',
					color: 'green'
				},
				{ key: 'piano', name: 'Piano', url: separation.piano_url, icon: '🎹', color: 'teal' },
				{
					key: 'percussion',
					name: 'Percussion',
					url: separation.percussion_url,
					icon: '🪘',
					color: 'amber'
				},
				{ key: 'strings', name: 'Strings', url: separation.strings_url, icon: '🎻', color: 'cyan' },
				{ key: 'synth', name: 'Synth', url: separation.synth_url, icon: '🎛️', color: 'blue' },
				{ key: 'fx', name: 'FX', url: separation.fx_url, icon: '✨', color: 'fuchsia' },
				{ key: 'brass', name: 'Brass', url: separation.brass_url, icon: '🎺', color: 'rose' },
				{
					key: 'woodwinds',
					name: 'Woodwinds',
					url: separation.woodwinds_url,
					icon: '🎷',
					color: 'lime'
				}
			].filter((s) => s.url);
		}
	});

	// Get all download URLs for the download command
	let downloadUrls = $derived(stems.map((s) => s.url).filter(Boolean) as string[]);

	function toggleStem(stemName: string, url: string) {
		if (playingStems[stemName]) {
			// Stop playing
			audioElements[stemName]?.pause();
			playingStems[stemName] = false;
		} else {
			// Start playing
			if (!audioElements[stemName]) {
				const audio = new Audio(url);
				audio.onended = () => {
					playingStems[stemName] = false;
				};
				audioElements[stemName] = audio;
			}
			audioElements[stemName].play();
			playingStems[stemName] = true;
		}
	}

	function stopAll() {
		for (const [name, audio] of Object.entries(audioElements)) {
			audio.pause();
			audio.currentTime = 0;
			playingStems[name] = false;
		}
	}

	function playAll() {
		stopAll();
		for (const stem of stems) {
			if (stem.url) {
				if (!audioElements[stem.name]) {
					const audio = new Audio(stem.url);
					audio.onended = () => {
						playingStems[stem.name] = false;
					};
					audioElements[stem.name] = audio;
				}
				audioElements[stem.name].currentTime = 0;
				audioElements[stem.name].play();
				playingStems[stem.name] = true;
			}
		}
	}

	let downloadCommandCopied = $state(false);
	const copyWithFeedback = createCopyWithFeedback(
		(copied) => {
			downloadCommandCopied = copied;
		},
		{ onError: (error) => console.error('Failed to copy download command:', error) }
	);

	async function copyDownloadCommand() {
		const commands = downloadUrls
			.map((url, i) => {
				const stem = stems[i];
				const filename = `${stem.name.toLowerCase().replace(/\s+/g, '_')}.mp3`;
				return `curl -L -o "${filename}" "${url}"`;
			})
			.join(' && \\\n');

		const fullCommand = `# Download all stems\n${commands}`;
		await copyWithFeedback(fullCommand);
	}
</script>

<div class="space-y-4">
	<!-- Controls -->
	<div class="flex items-center gap-2">
		<button
			onclick={playAll}
			class="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
		>
			<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
				<path d="M8 5v14l11-7z" />
			</svg>
			Play All
		</button>
		<button
			onclick={stopAll}
			class="flex cursor-pointer items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
		>
			<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
				<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
			</svg>
			Stop All
		</button>
		<button
			onclick={copyDownloadCommand}
			class="ml-auto flex cursor-pointer items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
			title="Copy curl command to download all stems"
		>
			{#if downloadCommandCopied}
				<svg
					class="h-4 w-4 text-green-600 dark:text-green-400"
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
				Copied!
			{:else}
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
					/>
				</svg>
				Copy Download Command
			{/if}
		</button>
	</div>

	<!-- Stems grid -->
	<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4">
		{#each stems as stem (stem.name)}
			<div
				class="rounded-lg border p-3 transition-colors {playingStems[stem.name]
					? 'border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/30'
					: 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'}"
			>
				<div class="flex items-start gap-3">
					<button
						onclick={() => toggleStem(stem.name, stem.url!)}
						class="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors {playingStems[
							stem.name
						]
							? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}"
					>
						{#if playingStems[stem.name]}
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
							</svg>
						{:else}
							<svg class="h-5 w-5 pl-0.5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						{/if}
					</button>
					<div class="min-w-0 flex-1">
						<div class="flex items-start gap-1.5">
							<span class="pt-0.5 text-base leading-none">{stem.icon}</span>
							<span
								class="line-clamp-2 text-sm leading-tight font-semibold text-gray-900 dark:text-gray-100"
								title={stem.name}
							>
								{stem.name}
							</span>
						</div>
						<p class="mt-1 text-[11px] font-medium tracking-wide text-gray-400 dark:text-gray-500">
							Stem
						</p>
					</div>
				</div>

				<div
					class="mt-2 flex items-center justify-end gap-1.5 border-t border-gray-200/70 pt-2 dark:border-gray-700/70"
				>
					<a
						href={stem.url ?? ''}
						rel="external"
						download="{stem.name.toLowerCase().replace(/\s+/g, '_')}.mp3"
						class="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-gray-200"
						title="Download {stem.name}"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
					</a>
					{#if onExtendStem}
						<button
							type="button"
							onclick={() => onExtendStem(stem.key, stem.url!)}
							class="rounded p-1.5 text-purple-500 transition-colors hover:bg-purple-100 hover:text-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/30 dark:hover:text-purple-200"
							title="Extend {stem.name}"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 5l7 7-7 7M5 5l7 7-7 7"
								/>
							</svg>
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
