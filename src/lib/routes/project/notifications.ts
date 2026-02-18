import type { Generation } from '$lib/types';

export function getGenerationCompletionNotification(generation: Generation): {
	title: string;
	body: string;
} {
	const title = '🎵 Song Generation Complete!';
	const body = generation.title
		? `"${generation.title}"`
		: generation.style
			? `Style: ${generation.style}`
			: 'Your song is ready to listen';

	return { title, body };
}

export function showCompletionNotification(generation: Generation) {
	if (typeof window === 'undefined') return;

	const { title, body } = getGenerationCompletionNotification(generation);

	const electronAPI = (
		window as Window & {
			electronAPI?: {
				showNotification: (notificationTitle: string, options: NotificationOptions) => void;
			};
		}
	).electronAPI;

	if (electronAPI?.showNotification) {
		electronAPI.showNotification(title, { body });
		return;
	}

	if (!('Notification' in window)) {
		return;
	}

	if (Notification.permission === 'granted') {
		new Notification(title, { body });
		return;
	}

	if (Notification.permission !== 'denied') {
		Notification.requestPermission().then((permission) => {
			if (permission === 'granted') {
				new Notification(title, { body });
			}
		});
	}
}
