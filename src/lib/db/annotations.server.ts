import type { VariationAnnotation } from '$lib/types';
import { getDb, prepareStmt } from './database.server';

function normalizeLabel(label: string): string {
	return label.trim().toLowerCase();
}

function getAnnotationRow(
	generationId: number,
	audioId: string
): Omit<VariationAnnotation, 'labels'> | undefined {
	const stmt = prepareStmt(
		'SELECT * FROM variation_annotations WHERE generation_id = ? AND audio_id = ?'
	);
	return stmt.get(generationId, audioId) as Omit<VariationAnnotation, 'labels'> | undefined;
}

function ensureAnnotationRow(
	generationId: number,
	audioId: string
): Omit<VariationAnnotation, 'labels'> {
	const existing = getAnnotationRow(generationId, audioId);
	if (existing) return existing;

	const stmt = prepareStmt(
		'INSERT INTO variation_annotations (generation_id, audio_id) VALUES (?, ?)'
	);
	stmt.run(generationId, audioId);
	return getAnnotationRow(generationId, audioId)!;
}

function getLabelsForAnnotationIds(annotationIds: number[]): Map<number, string[]> {
	const labelsByAnnotation = new Map<number, string[]>();
	if (annotationIds.length === 0) return labelsByAnnotation;

	const db = getDb();
	const placeholders = annotationIds.map(() => '?').join(', ');
	const stmt = db.prepare(
		`SELECT vll.annotation_id as annotation_id, l.name as name
		 FROM variation_label_links vll
		 JOIN labels l ON l.id = vll.label_id
		 WHERE vll.annotation_id IN (${placeholders})
		 ORDER BY l.name ASC`
	);
	const rows = stmt.all(...annotationIds) as { annotation_id: number; name: string }[];

	for (const row of rows) {
		const existing = labelsByAnnotation.get(row.annotation_id) ?? [];
		existing.push(row.name);
		labelsByAnnotation.set(row.annotation_id, existing);
	}

	return labelsByAnnotation;
}

function attachLabelsToAnnotations(
	annotations: Omit<VariationAnnotation, 'labels'>[]
): VariationAnnotation[] {
	const labelsByAnnotation = getLabelsForAnnotationIds(annotations.map((a) => a.id));
	return annotations.map((annotation) => ({
		...annotation,
		labels: labelsByAnnotation.get(annotation.id) ?? []
	}));
}

export function getLabelSuggestions(query: string, limit: number = 8): string[] {
	const normalized = normalizeLabel(query);
	if (!normalized) {
		const stmt = prepareStmt(
			'SELECT name FROM labels ORDER BY last_used_at DESC, updated_at DESC LIMIT ?'
		);
		return (stmt.all(limit) as { name: string }[]).map((row) => row.name);
	}

	const stmt = prepareStmt(
		'SELECT name FROM labels WHERE name LIKE ? ORDER BY last_used_at DESC, updated_at DESC LIMIT ?'
	);
	return (stmt.all(`${normalized}%`, limit) as { name: string }[]).map((row) => row.name);
}

export function getAnnotation(
	generationId: number,
	audioId: string
): VariationAnnotation | undefined {
	const row = getAnnotationRow(generationId, audioId);
	if (!row) return undefined;
	return attachLabelsToAnnotations([row])[0];
}

export function getAnnotationsForGeneration(generationId: number): VariationAnnotation[] {
	const stmt = prepareStmt('SELECT * FROM variation_annotations WHERE generation_id = ?');
	const rows = stmt.all(generationId) as Omit<VariationAnnotation, 'labels'>[];
	return attachLabelsToAnnotations(rows);
}

export function getAnnotationsByProject(projectId: number): VariationAnnotation[] {
	const stmt = prepareStmt(`
		SELECT va.* FROM variation_annotations va
		JOIN generations g ON va.generation_id = g.id
		WHERE g.project_id = ?
		ORDER BY va.updated_at DESC
	`);
	const rows = stmt.all(projectId) as Omit<VariationAnnotation, 'labels'>[];
	return attachLabelsToAnnotations(rows);
}

export function getStarredAnnotationsByProject(projectId: number): VariationAnnotation[] {
	const stmt = prepareStmt(`
		SELECT va.* FROM variation_annotations va
		JOIN generations g ON va.generation_id = g.id
		WHERE g.project_id = ? AND (va.starred = 1 OR va.comment IS NOT NULL AND va.comment != '')
		ORDER BY va.updated_at DESC
	`);
	const rows = stmt.all(projectId) as Omit<VariationAnnotation, 'labels'>[];
	return attachLabelsToAnnotations(rows);
}

export function toggleStar(generationId: number, audioId: string): VariationAnnotation {
	const existing = getAnnotationRow(generationId, audioId);

	if (existing) {
		const newStarred = existing.starred ? 0 : 1;
		const stmt = prepareStmt(`
			UPDATE variation_annotations
			SET starred = ?, updated_at = CURRENT_TIMESTAMP
			WHERE generation_id = ? AND audio_id = ?
		`);
		stmt.run(newStarred, generationId, audioId);
	} else {
		const stmt = prepareStmt(`
			INSERT INTO variation_annotations (generation_id, audio_id, starred)
			VALUES (?, ?, 1)
		`);
		stmt.run(generationId, audioId);
	}

	return getAnnotation(generationId, audioId)!;
}

export function updateComment(
	generationId: number,
	audioId: string,
	comment: string
): VariationAnnotation {
	const existing = getAnnotationRow(generationId, audioId);

	if (existing) {
		const stmt = prepareStmt(`
			UPDATE variation_annotations
			SET comment = ?, updated_at = CURRENT_TIMESTAMP
			WHERE generation_id = ? AND audio_id = ?
		`);
		stmt.run(comment || null, generationId, audioId);
	} else {
		const stmt = prepareStmt(`
			INSERT INTO variation_annotations (generation_id, audio_id, comment)
			VALUES (?, ?, ?)
		`);
		stmt.run(generationId, audioId, comment || null);
	}

	return getAnnotation(generationId, audioId)!;
}

export interface NotableAnnotationRow {
	id: number;
	generation_id: number;
	audio_id: string;
	starred: number;
	comment: string | null;
	created_at: string;
	updated_at: string;
	project_id: number;
	project_name: string;
}

export function getAllNotableAnnotations(): (VariationAnnotation & {
	project_id: number;
	project_name: string;
})[] {
	const stmt = prepareStmt(`
		SELECT va.*, g.project_id, p.name as project_name
		FROM variation_annotations va
		JOIN generations g ON va.generation_id = g.id
		JOIN projects p ON g.project_id = p.id
		WHERE va.starred = 1
		   OR (va.comment IS NOT NULL AND va.comment != '')
		ORDER BY va.updated_at DESC
	`);
	const rows = stmt.all() as NotableAnnotationRow[];
	const withLabels = attachLabelsToAnnotations(rows);
	return withLabels.map((ann, i) => ({
		...ann,
		project_id: rows[i].project_id,
		project_name: rows[i].project_name
	}));
}

export function getAllAnnotationsWithLabels(): (VariationAnnotation & {
	project_id: number;
	project_name: string;
})[] {
	const stmt = prepareStmt(`
		SELECT va.*, g.project_id, p.name as project_name
		FROM variation_annotations va
		JOIN generations g ON va.generation_id = g.id
		JOIN projects p ON g.project_id = p.id
		ORDER BY va.updated_at DESC
	`);
	const rows = stmt.all() as NotableAnnotationRow[];
	const withLabels = attachLabelsToAnnotations(rows);
	// Only return annotations that have at least one label
	return withLabels
		.map((ann, i) => ({
			...ann,
			project_id: rows[i].project_id,
			project_name: rows[i].project_name
		}))
		.filter((ann) => ann.labels.length > 0);
}

export function getHighlightsCount(): number {
	const stmt = prepareStmt(`
		SELECT COUNT(DISTINCT va.id) as count
		FROM variation_annotations va
		JOIN generations g ON va.generation_id = g.id
		WHERE va.starred = 1
		   OR (va.comment IS NOT NULL AND va.comment != '')
	`);
	const row = stmt.get() as { count: number };
	return row.count;
}

export function setAnnotationLabels(
	generationId: number,
	audioId: string,
	labels: string[]
): VariationAnnotation {
	const db = getDb();
	const annotation = ensureAnnotationRow(generationId, audioId);
	const normalizedLabels = Array.from(
		new Set(labels.map((label) => normalizeLabel(label)).filter((label) => label.length > 0))
	);

	const transaction = db.transaction(() => {
		const deleteStmt = prepareStmt('DELETE FROM variation_label_links WHERE annotation_id = ?');
		deleteStmt.run(annotation.id);

		const selectLabelStmt = prepareStmt('SELECT id FROM labels WHERE name = ?');
		const insertLabelStmt = prepareStmt(
			'INSERT INTO labels (name, last_used_at) VALUES (?, CURRENT_TIMESTAMP)'
		);
		const touchLabelStmt = prepareStmt(
			'UPDATE labels SET last_used_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
		);
		const insertLinkStmt = prepareStmt(
			'INSERT INTO variation_label_links (annotation_id, label_id) VALUES (?, ?)'
		);

		for (const label of normalizedLabels) {
			let labelId = (selectLabelStmt.get(label) as { id: number } | undefined)?.id;
			if (!labelId) {
				const result = insertLabelStmt.run(label);
				labelId = Number(result.lastInsertRowid);
			} else {
				touchLabelStmt.run(labelId);
			}
			insertLinkStmt.run(annotation.id, labelId);
		}
	});

	transaction();

	return getAnnotation(generationId, audioId)!;
}
