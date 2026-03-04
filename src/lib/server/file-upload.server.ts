function toFileBlob(fileBuffer: Buffer, contentType: string): Blob {
	const bytes = new Uint8Array(fileBuffer);
	return new Blob([bytes], { type: contentType || 'application/octet-stream' });
}

function ensureHttpUrl(value: unknown): string {
	if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) {
		throw new Error('Upload service returned an invalid URL');
	}
	return value;
}

export async function uploadToLitterbox(
	fileBuffer: Buffer,
	fileName: string,
	contentType: string,
	expiry: '1h' | '12h' | '24h' | '72h' = '24h'
): Promise<string> {
	const form = new FormData();
	form.set('reqtype', 'fileupload');
	form.set('time', expiry);
	form.set('fileToUpload', toFileBlob(fileBuffer, contentType), fileName);

	const response = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
		method: 'POST',
		body: form
	});

	const text = (await response.text()).trim();
	if (!response.ok) {
		throw new Error(`Litterbox upload failed: ${response.status} ${response.statusText}`);
	}

	if (!/^https?:\/\//i.test(text)) {
		throw new Error(`Litterbox upload failed: ${text || 'invalid response'}`);
	}

	return text;
}

function toTmpfilesDirectUrl(url: string): string {
	return url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/');
}

export async function uploadToTmpfiles(
	fileBuffer: Buffer,
	fileName: string,
	contentType: string
): Promise<string> {
	const form = new FormData();
	form.set('file', toFileBlob(fileBuffer, contentType), fileName);

	const response = await fetch('https://tmpfiles.org/api/v1/upload', {
		method: 'POST',
		body: form
	});

	if (!response.ok) {
		throw new Error(`tmpfiles upload failed: ${response.status} ${response.statusText}`);
	}

	const payload = (await response.json()) as {
		status?: string;
		data?: {
			url?: string;
		};
	};

	const url = ensureHttpUrl(payload?.data?.url);
	return toTmpfilesDirectUrl(url);
}

export async function uploadToTemporaryHost(
	fileBuffer: Buffer,
	fileName: string,
	contentType: string
): Promise<string> {
	try {
		return await uploadToLitterbox(fileBuffer, fileName, contentType, '24h');
	} catch (litterboxError) {
		try {
			return await uploadToTmpfiles(fileBuffer, fileName, contentType);
		} catch (tmpfilesError) {
			throw new Error(
				`Temporary upload failed (litterbox: ${litterboxError instanceof Error ? litterboxError.message : String(litterboxError)}; tmpfiles: ${tmpfilesError instanceof Error ? tmpfilesError.message : String(tmpfilesError)})`
			);
		}
	}
}
