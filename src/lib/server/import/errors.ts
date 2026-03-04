type HttpErrorShape = {
	status: number;
	body?: {
		message?: string;
	};
};

function isHttpErrorShape(err: unknown): err is HttpErrorShape {
	if (typeof err !== 'object' || err === null) {
		return false;
	}

	if (!('status' in err) || typeof err.status !== 'number') {
		return false;
	}

	if (!('body' in err) || err.body === undefined) {
		return true;
	}

	if (typeof err.body !== 'object' || err.body === null) {
		return false;
	}

	if (!('message' in err.body) || err.body.message === undefined) {
		return true;
	}

	return typeof err.body.message === 'string';
}

export function normalizeImportRouteError(err: unknown): { status: number; message: string } {
	if (isHttpErrorShape(err)) {
		const message =
			typeof err.body?.message === 'string'
				? err.body.message
				: err instanceof Error
					? err.message
					: 'Request failed';
		return {
			status: err.status,
			message
		};
	}

	return {
		status: 500,
		message: 'Failed to import song. Please try again.'
	};
}
