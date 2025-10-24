// @ts-nocheck
import type { PageServerLoad } from './$types';
import { ServiceCategoriesRepository } from '$lib/server/data/d1-service-categories-repository';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	const repo = new ServiceCategoriesRepository(event);
	const includeInactive = event.url.searchParams.get('includeInactive') === 'true';
	const serviceCategories = await repo.getAll(includeInactive);

	return {
		serviceCategories,
		includeInactive,
		canEdit: event.locals.permissions.has('portal:service-item:edit') || event.locals.permissions.has('portal:employee:edit'),
	};
};
