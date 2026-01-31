# Build Notes

## macOS Build Configuration

### Successfully Building on macOS Sequoia 15.7.2

The app now builds and runs successfully with the following configuration:

**Issue 1: DMG Build Failure**

- **Problem:** DMG creation fails with `OSError: [Errno 30] Read-only file system`
- **Root Cause:** Known bug with `dmg-builder@1.1.0` on macOS Sequoia
- **Solution:** Build ZIP only (DMG disabled temporarily)

**Issue 2: Native Module Loading**

- **Problem:** `better-sqlite3` and its dependencies not found at runtime
- **Root Cause:** Native modules must be unpacked from asar archive
- **Solution:** Added `asarUnpack` configuration + proper module resolution

### Current Configuration

**package.json build settings:**

```json
{
	"asarUnpack": [
		"node_modules/better-sqlite3/**/*",
		"node_modules/bindings/**/*",
		"node_modules/prebuild-install/**/*",
		"node_modules/file-uri-to-path/**/*"
	],
	"mac": {
		"target": ["zip"],
		"category": "public.app-category.music",
		"icon": "build-resources/icon.png"
	}
}
```

**Code changes:**

- `electron/main.js`: Sets `ELECTRON_RESOURCES_PATH` environment variable
- `src/lib/db.server.ts`: Uses correct module path for unpacked native modules

### Build Commands

- **Development:** `npm run dev:electron`
- **Production build:** `npm run build:electron`

### Output

The build creates:

- `dist-electron/KIE Music-1.0.0-arm64-mac.zip` - Distributable ZIP file (~109 MB)
- `dist-electron/mac-arm64/KIE Music.app` - The application bundle
- `dist-electron/latest-mac.yml` - Update metadata

### Installation

Users can install the app by:

1. Downloading the ZIP file
2. Extracting it
3. Moving `KIE Music.app` to their Applications folder
4. Double-clicking to launch

### Testing

The app has been tested and verified to:

- ✅ Start successfully
- ✅ Load the database (better-sqlite3)
- ✅ Start the internal SvelteKit server
- ✅ Open the application window
- ✅ Run all helper processes (renderer, GPU, network service)

### Future: Re-enabling DMG

When `dmg-builder` or `electron-builder` releases a fix for macOS Sequoia, you can re-enable DMG builds by changing the target to:

```json
"mac": {
  "target": ["dmg", "zip"],
  ...
}
```
