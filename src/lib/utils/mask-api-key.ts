export function maskApiKey(apiKey: string): string {
	if (apiKey.length <= 8) {
		return '*'.repeat(apiKey.length);
	}

	return apiKey.slice(0, 4) + '*'.repeat(apiKey.length - 8) + apiKey.slice(-4);
}
