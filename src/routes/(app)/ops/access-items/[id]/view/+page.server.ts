import type { PageServerLoad } from './$types';
import { AccessItemsRepository } from '$lib/server/data/d1-access-items-repository';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	const id = parseInt(event.params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid ID');
	}

	const repo = new AccessItemsRepository(event);
	const item = await repo.get(id);

	if (!item) {
		throw error(404, 'Access item not found');
	}

	return {
		item
	};
};