import { app, BrowserWindow, shell, ipcMain, Notification, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import net from 'node:net';
import { promises as fs } from 'node:fs';
import { spawn } from 'node:child_process';
import os from 'node:os';

// Set the desktop file name so that on Wayland the xdg-toplevel app_id matches
// the embedded .desktop file (kie-frontend-electron.desktop), allowing KDE to
// resolve the correct icon for title bar and Alt-Tab.
// The --class switch sets both the X11 WM_CLASS and the Wayland app_id.
app.setName('KIE Music');
app.commandLine.appendSwitch('class', 'kie-frontend-electron');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Keep a global reference of the window object
let mainWindow = null;
let server = null;
let serverPort = null;

const isDev = !app.isPackaged;

// When running as an uninstalled AppImage, KDE cannot find the icon because the
// .desktop file and icon are not registered in the system's XDG directories.
// This function self-registers both on first launch so that KDE can look them up.
async function registerAppImageIntegration() {
	if (!process.env.APPIMAGE) return;

	const homeDir = os.homedir();
	const iconDir = path.join(homeDir, '.local', 'share', 'icons', 'hicolor', '256x256', 'apps');
	const appsDir = path.join(homeDir, '.local', 'share', 'applications');
	const iconDest = path.join(iconDir, 'kie-frontend-electron.png');
	const desktopDest = path.join(appsDir, 'kie-frontend-electron.desktop');

	// Desktop file: Wayland app_id is matched by filename (kie-frontend-electron);
	// StartupWMClass covers the X11 / XWayland case.
	const desktopContent = [
		'[Desktop Entry]',
		'Name=KIE Music',
		`Exec="${process.env.APPIMAGE}" --no-sandbox %U`,
		'Terminal=false',
		'Type=Application',
		'Icon=kie-frontend-electron',
		'StartupWMClass=kie-frontend-electron',
		'Comment=KIE Music - Electron App for interacting with kie.ai APIs',
		'Categories=Audio;',
		''
	].join('\n');

	try {
		await fs.mkdir(iconDir, { recursive: true });
		await fs.mkdir(appsDir, { recursive: true });
		await fs.copyFile(getIconPath(), iconDest);
		await fs.writeFile(desktopDest, desktopContent, 'utf8');
		// Refresh KDE's desktop and icon databases (fire-and-forget)
		spawn('update-desktop-database', [appsDir], { detached: true, stdio: 'ignore' }).unref();
		spawn(
			'gtk-update-icon-cache',
			['-f', '-t', path.join(homeDir, '.local', 'share', 'icons', 'hicolor')],
			{ detached: true, stdio: 'ignore' }
		).unref();
	} catch (err) {
		if (isDev) console.warn('AppImage desktop integration failed:', err);
	}
}

function getIconPath() {
	if (isDev) {
		return path.join(__dirname, '..', 'build-resources', 'icon.png');
	}
	return path.join(process.resourcesPath, 'icon.png');
}

function getIcon() {
	return nativeImage.createFromPath(getIconPath());
}

function getResourcePath(...paths) {
	if (isDev) {
		return path.join(__dirname, '..', ...paths);
	}
	return path.join(process.resourcesPath, 'app', ...paths);
}

// Find an available port dynamically
function findAvailablePort(startPort = 3000) {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on('error', (err) => {
			if (err.code === 'EADDRINUSE') {
				// Port is in use, try next one
				resolve(findAvailablePort(startPort + 1));
			} else {
				reject(err);
			}
		});
		server.listen(startPort, '127.0.0.1', () => {
			const port = server.address().port;
			server.close(() => {
				resolve(port);
			});
		});
	});
}

async function startServer() {
	// Find an available port
	serverPort = await findAvailablePort(3000);
	if (isDev) {
		console.log('Using port:', serverPort);
	}

	const dbPath = isDev
		? path.join(__dirname, '..', 'kie-music.db')
		: path.join(app.getPath('userData'), 'kie-music.db');

	if (isDev) {
		console.log('Database path:', dbPath);
	}

	// Set environment variables before importing the handler
	process.env.PORT = serverPort.toString();
	process.env.HOST = '127.0.0.1';
	process.env.NODE_ENV = isDev ? 'development' : 'production';
	process.env.DATABASE_PATH = dbPath;
	process.env.ELECTRON_RESOURCES_PATH = process.resourcesPath || path.join(__dirname, '..');
	// Allow audio uploads up to 100 MB (matches MAX_UPLOAD_BYTES in the upload-audio route)
	process.env.BODY_SIZE_LIMIT = String(100 * 1024 * 1024);

	// For production, set up NODE_PATH to find unpacked native modules
	if (!isDev) {
		const unpackedPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules');
		if (!process.env.NODE_PATH) {
			process.env.NODE_PATH = unpackedPath;
		} else {
			process.env.NODE_PATH = `${unpackedPath}${path.delimiter}${process.env.NODE_PATH}`;
		}
	}

	// Import the SvelteKit handler
	const handlerPath = getResourcePath('build', 'handler.js');
	if (isDev) {
		console.log('Loading handler from:', handlerPath);
	}

	const { handler } = await import(`file://${handlerPath}`);

	return new Promise((resolve, reject) => {
		server = http.createServer(handler);

		server.on('error', (err) => {
			console.error('Server error:', err);
			reject(err);
		});

		server.listen(serverPort, '127.0.0.1', () => {
			if (isDev) {
				console.log(`Server listening on http://127.0.0.1:${serverPort}`);
			}
			resolve();
		});
	});
}

function stopServer() {
	if (server) {
		if (isDev) {
			console.log('Stopping server...');
		}
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
		icon: getIcon(),
		show: false,
		backgroundColor: '#111827' // Match the app's dark theme
	});

	// Explicitly set the icon after creation — required for some Wayland compositors
	// (e.g. KDE Plasma) to show the correct icon in the title bar and Alt-Tab switcher.
	mainWindow.setIcon(getIcon());

	// Show window when ready
	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
	});

	// Load the app from the local server
	const serverUrl = `http://127.0.0.1:${serverPort}`;
	if (isDev) {
		console.log('Loading URL:', serverUrl);
	}
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

// IPC Handlers
ipcMain.on('show-notification', (event, { title, options }) => {
	if (Notification.isSupported()) {
		const notification = new Notification({
			title,
			body: options?.body || '',
			icon: options?.icon || getIconPath(),
			silent: options?.silent || false
		});

		notification.show();

		// Focus window when notification is clicked
		notification.on('click', () => {
			if (mainWindow) {
				if (mainWindow.isMinimized()) {
					mainWindow.restore();
				}
				mainWindow.focus();
			}
		});
	}
});

// App lifecycle
app.whenReady().then(async () => {
	// Register icon + .desktop file for uninstalled AppImage runs so KDE (Wayland)
	// can resolve the correct icon for window decorations and the Alt-Tab switcher.
	registerAppImageIntegration();

	// Set application icon for Linux (title bar, Alt-Tab switcher).
	// nativeImage is used so Electron can embed it directly without relying
	// on a .desktop file being installed in the system.
	if (process.platform === 'linux') {
		try {
			app.setIcon(getIcon());
		} catch {
			// Non-fatal: some Wayland compositors don't support app-level icon overrides
		}
	}
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
