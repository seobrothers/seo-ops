import type { PageServerLoad } from './$types';
import { AccessItemsRepository } from '$lib/server/data/d1-access-items-repository';

export const load: PageServerLoad = async (event) => {
	const repo = new AccessItemsRepository(event);
	const includeInactive = event.url.searchParams.get('includeInactive') === 'true';
	const accessItems = await repo.getAll(includeInactive);

	return {
		accessItems,
		includeInactive,
		canEdit: event.locals.permissions.has('portal:employee:edit'),
	};
};