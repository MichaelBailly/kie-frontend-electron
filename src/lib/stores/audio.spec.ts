import { beforeEach, describe, expect, it, vi } from 'vitest';

interface MockAudioElement {
	src: string;
	currentTime: number;
	play: ReturnType<typeof vi.fn>;
	pause: ReturnType<typeof vi.fn>;
	load: ReturnType<typeof vi.fn>;
	addEventListener: ReturnType<typeof vi.fn>;
	volume: number;
	muted: boolean;
}

function createMockAudioElement() {
	const listeners = new Map<string, (() => void)[]>();

	const audioElement: MockAudioElement = {
		src: '',
		currentTime: 0,
		play: vi.fn(),
		pause: vi.fn(),
		load: vi.fn(),
		addEventListener: vi.fn((eventName: string, callback: () => void) => {
			const callbacks = listeners.get(eventName) ?? [];
			callbacks.push(callback);
			listeners.set(eventName, callbacks);
		}),
		volume: 1,
		muted: false
	};

	function dispatch(eventName: string) {
		for (const callback of listeners.get(eventName) ?? []) {
			callback();
		}
	}

	return {
		audioElement,
		dispatch
	};
}

async function loadStoreWithBrowserEnabled() {
	vi.resetModules();
	vi.doMock('$app/environment', () => ({ browser: true }));
	return import('./audio.svelte');
}

describe('audioStore play startTime support', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('seeks immediately when replaying the current track with a startTime', async () => {
		const { audioStore } = await loadStoreWithBrowserEnabled();
		const { audioElement } = createMockAudioElement();
		audioStore.setAudioElement(audioElement as unknown as HTMLAudioElement);

		const track = {
			id: 'track-1',
			generationId: 10,
			projectId: 5,
			title: 'Track 1',
			imageUrl: null,
			streamUrl: null,
			audioUrl: 'https://example.com/track-1.mp3',
			duration: 180
		};

		audioStore.play(track);
		audioStore.play(track, 42);

		expect(audioElement.currentTime).toBe(42);
		expect(audioStore.currentTime).toBe(42);
		expect(audioElement.play).toHaveBeenCalledTimes(2);
	}, 15000);

	it('waits for loadedmetadata before seeking and playing a new track at startTime', async () => {
		const { audioStore } = await loadStoreWithBrowserEnabled();
		const { audioElement, dispatch } = createMockAudioElement();
		audioStore.setAudioElement(audioElement as unknown as HTMLAudioElement);

		const currentTrack = {
			id: 'track-1',
			generationId: 10,
			projectId: 5,
			title: 'Track 1',
			imageUrl: null,
			streamUrl: null,
			audioUrl: 'https://example.com/track-1.mp3',
			duration: 180
		};
		const newTrack = {
			id: 'track-2',
			generationId: 11,
			projectId: 5,
			title: 'Track 2',
			imageUrl: null,
			streamUrl: null,
			audioUrl: 'https://example.com/track-2.mp3',
			duration: 200
		};

		audioStore.play(currentTrack);
		audioElement.play.mockClear();

		audioStore.play(newTrack, 30);

		expect(audioElement.load).toHaveBeenCalledTimes(2);
		expect(audioElement.play).not.toHaveBeenCalled();
		expect(audioStore.currentTime).toBe(30);

		dispatch('loadedmetadata');

		expect(audioElement.currentTime).toBe(30);
		expect(audioStore.currentTime).toBe(30);
		expect(audioElement.play).toHaveBeenCalledTimes(1);
	});
});

describe('audioStore single-audio-at-a-time', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('replaces the current track when playing a different stem track', async () => {
		const { audioStore } = await loadStoreWithBrowserEnabled();
		const { audioElement } = createMockAudioElement();
		audioStore.setAudioElement(audioElement as unknown as HTMLAudioElement);

		const stemA = {
			id: 'audio-1:vocal',
			generationId: 10,
			projectId: 5,
			title: 'Song — Vocals Stem',
			imageUrl: null,
			streamUrl: 'https://example.com/vocal.mp3',
			audioUrl: 'https://example.com/vocal.mp3',
			duration: null
		};
		const stemB = {
			id: 'audio-1:drums',
			generationId: 10,
			projectId: 5,
			title: 'Song — Drums Stem',
			imageUrl: null,
			streamUrl: 'https://example.com/drums.mp3',
			audioUrl: 'https://example.com/drums.mp3',
			duration: null
		};

		audioStore.play(stemA);
		expect(audioStore.currentTrack?.id).toBe('audio-1:vocal');

		audioStore.play(stemB);
		expect(audioStore.currentTrack?.id).toBe('audio-1:drums');
		expect(audioElement.src).toBe('https://example.com/drums.mp3');
	});

	it('replaces stem playback when playing a full track', async () => {
		const { audioStore } = await loadStoreWithBrowserEnabled();
		const { audioElement } = createMockAudioElement();
		audioStore.setAudioElement(audioElement as unknown as HTMLAudioElement);

		const stemTrack = {
			id: 'audio-1:vocal',
			generationId: 10,
			projectId: 5,
			title: 'Song — Vocals Stem',
			imageUrl: null,
			streamUrl: 'https://example.com/vocal.mp3',
			audioUrl: 'https://example.com/vocal.mp3',
			duration: null
		};
		const fullTrack = {
			id: 'audio-1',
			generationId: 10,
			projectId: 5,
			title: 'Song',
			imageUrl: null,
			streamUrl: null,
			audioUrl: 'https://example.com/song.mp3',
			duration: 180
		};

		audioStore.play(stemTrack);
		expect(audioStore.currentTrack?.id).toBe('audio-1:vocal');

		audioStore.play(fullTrack);
		expect(audioStore.currentTrack?.id).toBe('audio-1');
		expect(audioElement.src).toBe('https://example.com/song.mp3');
		expect(audioStore.isTrackPlaying('audio-1:vocal')).toBe(false);
	});

	it('plays preview from continueAt position for a new track', async () => {
		const { audioStore } = await loadStoreWithBrowserEnabled();
		const { audioElement, dispatch } = createMockAudioElement();
		audioStore.setAudioElement(audioElement as unknown as HTMLAudioElement);

		const previewTrack = {
			id: 'audio-1:vocal',
			generationId: 10,
			projectId: 5,
			title: 'Song — Vocals Stem',
			imageUrl: null,
			streamUrl: 'https://example.com/vocal.mp3',
			audioUrl: 'https://example.com/vocal.mp3',
			duration: 199
		};

		audioStore.play(previewTrack, 149);
		expect(audioStore.currentTime).toBe(149);

		dispatch('loadedmetadata');
		expect(audioElement.currentTime).toBe(149);
		expect(audioElement.play).toHaveBeenCalled();
	});
});
