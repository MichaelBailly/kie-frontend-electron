import type { PageServerLoad } from './$types';
import { getAllStyles } from '$lib/db.server';

export const load: PageServerLoad = async () => {
	const styles = getAllStyles();
	return { styles };
};
