export const STEM_DISPLAY: Record<string, { label: string; icon: string }> = {
	vocal: { label: 'Vocals', icon: '🎤' },
	mp3: { label: 'Full Mix', icon: '🎵' },
	instrumental: { label: 'Instrumental', icon: '🎸' },
	backing_vocals: { label: 'Backing Vocals', icon: '🎙️' },
	drums: { label: 'Drums', icon: '🥁' },
	bass: { label: 'Bass', icon: '🎸' },
	guitar: { label: 'Guitar', icon: '🎸' },
	keyboard: { label: 'Keyboard', icon: '🎹' },
	piano: { label: 'Piano', icon: '🎹' },
	percussion: { label: 'Percussion', icon: '🪘' },
	strings: { label: 'Strings', icon: '🎻' },
	synth: { label: 'Synth', icon: '🎛️' },
	fx: { label: 'FX', icon: '✨' },
	brass: { label: 'Brass', icon: '🎺' },
	woodwinds: { label: 'Woodwinds', icon: '🎷' }
};

export function normalizeStemType(stemType: string | null | undefined): string | null {
	if (!stemType) return null;
	return stemType.trim().toLowerCase().replace(/\s+/g, '_');
}

export function getStemDisplay(stemType: string | null | undefined): {
	label: string;
	icon: string;
} {
	const key = normalizeStemType(stemType);
	if (!key) {
		return { label: 'Stem', icon: '🎛️' };
	}
	return (
		STEM_DISPLAY[key] ?? {
			label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
			icon: '🎛️'
		}
	);
}
