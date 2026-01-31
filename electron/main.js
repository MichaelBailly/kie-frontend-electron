import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object
let mainWindow = null;
let server = null;

const isDev = !app.isPackaged;
const SERVER_PORT = 3000;

function getResourcePath(...paths) {
	if (isDev) {
		return path.join(__dirname, '..', ...paths);
	}
	return path.join(process.resourcesPath, 'app', ...paths);
}

async function startServer() {
	const dbPath = isDev
		? path.join(__dirname, '..', 'kie-music.db')
		: path.join(app.getPath('userData'), 'kie-music.db');

	console.log('Database path:', dbPath);

	// Set environment variables before importing the handler
	process.env.PORT = SERVER_PORT.toString();
	process.env.HOST = '127.0.0.1';
	process.env.NODE_ENV = isDev ? 'development' : 'production';
	process.env.DATABASE_PATH = dbPath;
	process.env.ELECTRON_RESOURCES_PATH = process.resourcesPath || path.join(__dirname, '..');

	// Import the SvelteKit handler
	const handlerPath = getResourcePath('build', 'handler.js');
	console.log('Loading handler from:', handlerPath);

	const { handler } = await import(`file://${handlerPath}`);

	return new Promise((resolve, reject) => {
		server = http.createServer(handler);

		server.on('error', (err) => {
			console.error('Server error:', err);
			reject(err);
		});

		server.listen(SERVER_PORT, '127.0.0.1', () => {
			console.log(`Server listening on http://127.0.0.1:${SERVER_PORT}`);
			resolve();
		});
	});
}

function stopServer() {
	if (server) {
		console.log('Stopping server...');
		server.close();
		server = null;
	}
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 800,
		minHeight: 600,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: false,
			contextIsolation: true
		},
		icon: path.join(__dirname, '..', 'build-resources', 'icon.png'),
		show: false,
		backgroundColor: '#111827' // Match the app's dark theme
	});

	// Show window when ready
	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
	});

	// Load the app from the local server
	const serverUrl = `http://127.0.0.1:${SERVER_PORT}`;
	console.log('Loading URL:', serverUrl);
	mainWindow.loadURL(serverUrl);

	// Open external links in default browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (url.startsWith('http://') || url.startsWith('https://')) {
			shell.openExternal(url);
			return { action: 'deny' };
		}
		return { action: 'allow' };
	});

	// Open DevTools in development
	if (isDev) {
		mainWindow.webContents.openDevTools();
	}

	mainWindow.on('closed', () => {
		mainWindow = null;
	});
}

// App lifecycle
app.whenReady().then(async () => {
	try {
		await startServer();
		createWindow();
	} catch (err) {
		console.error('Failed to start application:', err);
		app.quit();
	}

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		stopServer();
		app.quit();
	}
});

app.on('before-quit', () => {
	stopServer();
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
	console.error('Uncaught exception:', err);
	stopServer();
});
