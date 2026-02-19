#!/usr/bin/env node
/**
 * Compiles better-sqlite3 from source against Electron headers.
 *
 * electron-rebuild v4.x incorrectly downloads a Node.js prebuilt binary
 * (ABI 141) and tags it as the Electron build (ABI 143), causing the app to
 * crash at launch. This script bypasses electron-rebuild and invokes node-gyp
 * directly with the Electron dist-url so the resulting binary matches the
 * Electron ABI.
 */

import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { existsSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectDir = resolve(__dirname, '..');

const require = createRequire(import.meta.url);

// Get Electron version from installed package
const electronPkg = require(join(projectDir, 'node_modules/electron/package.json'));
const electronVersion = electronPkg.version;
console.log(`Compiling better-sqlite3 for Electron ${electronVersion}...`);

const bsqliteDir = join(projectDir, 'node_modules/better-sqlite3');
const nodeGyp = join(projectDir, 'node_modules/.bin/node-gyp');
const forgeMeta = join(bsqliteDir, 'build/Release/.forge-meta');
const binary = join(bsqliteDir, 'build/Release/better_sqlite3.node');

if (!existsSync(nodeGyp)) {
	console.error(`node-gyp not found at ${nodeGyp}`);
	process.exit(1);
}

// Remove stale binary and forge-meta so nothing is cached from a previous run
for (const f of [binary, forgeMeta]) {
	if (existsSync(f)) {
		rmSync(f);
		console.log(`Removed stale file: ${f}`);
	}
}

// HOME must point to a separate dir so node-gyp downloads Electron headers
// rather than reusing Node.js headers cached in ~/.cache/node-gyp.
const electronHome = join(process.env.HOME ?? '/root', '.electron-gyp');

try {
	execFileSync(
		nodeGyp,
		[
			'rebuild',
			`--target=${electronVersion}`,
			'--arch=x64',
			'--dist-url=https://electronjs.org/headers',
		],
		{
			cwd: bsqliteDir,
			env: { ...process.env, HOME: electronHome },
			stdio: 'inherit',
		}
	);
} catch (err) {
	// node-gyp v11.5.0 emits a spurious ENOENT on node_gyp_bins after a
	// successful compilation. Treat it as success if the binary was created.
	if (!existsSync(binary)) {
		console.error('Compilation failed — binary not found.');
		throw err;
	}
	console.warn('node-gyp exited with an error but the binary was created — continuing.');
}

console.log(`✔ better-sqlite3 compiled for Electron ${electronVersion}`);
