const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
	// Platform info
	platform: process.platform,
	isElectron: true,

	// IPC methods for future use
	send: (channel, data) => {
		const validChannels = ['toMain'];
		if (validChannels.includes(channel)) {
			ipcRenderer.send(channel, data);
		}
	},
	receive: (channel, func) => {
		const validChannels = ['fromMain'];
		if (validChannels.includes(channel)) {
			ipcRenderer.on(channel, (event, ...args) => func(...args));
		}
	},
	invoke: (channel, data) => {
		const validChannels = ['dialog:openFile', 'dialog:saveFile'];
		if (validChannels.includes(channel)) {
			return ipcRenderer.invoke(channel, data);
		}
	}
});
