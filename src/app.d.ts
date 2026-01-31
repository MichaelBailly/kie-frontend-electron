// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

// Electron API exposed via preload script
interface ElectronAPI {
	/** Current platform (darwin, win32, linux) */
	platform: NodeJS.Platform;
	/** Whether running in Electron context */
	isElectron: boolean;
	/** Send a message to the main process (one-way) */
	send: (channel: 'toMain', data: unknown) => void;
	/** Listen for messages from the main process */
	receive: (channel: 'fromMain', callback: (...args: unknown[]) => void) => void;
	/** Invoke a main process handler and await the result */
	invoke: <T = unknown>(
		channel: 'dialog:openFile' | 'dialog:saveFile',
		data?: unknown
	) => Promise<T | undefined>;
}

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface Window {
		/** Electron API exposed via contextBridge (only available in Electron) */
		electronAPI?: ElectronAPI;
	}
}

export {};
