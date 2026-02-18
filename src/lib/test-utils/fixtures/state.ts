const DEFAULT_TIMESTAMP = '2026-01-15T12:00:00.000Z';

let nextProjectId = 1;
let nextGenerationId = 1;
let nextStemSeparationId = 1;
let nextAnnotationId = 1;
let nextLabelId = 1;

export function resetFixtureIds(): void {
	nextProjectId = 1;
	nextGenerationId = 1;
	nextStemSeparationId = 1;
	nextAnnotationId = 1;
	nextLabelId = 1;
}

export function nextProjectFixtureId(): number {
	return nextProjectId++;
}

export function nextGenerationFixtureId(): number {
	return nextGenerationId++;
}

export function nextStemSeparationFixtureId(): number {
	return nextStemSeparationId++;
}

export function nextAnnotationFixtureId(): number {
	return nextAnnotationId++;
}

export function nextLabelFixtureId(): number {
	return nextLabelId++;
}

export function fixtureTimestamp(offset = 0): string {
	const date = new Date(DEFAULT_TIMESTAMP);
	date.setSeconds(date.getSeconds() + offset);
	return date.toISOString();
}

export { DEFAULT_TIMESTAMP };
