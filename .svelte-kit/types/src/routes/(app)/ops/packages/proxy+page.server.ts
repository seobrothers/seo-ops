// @ts-nocheck
import type { PageServerLoad } from './$types';
import { PackagesRepository } from '$lib/server/data/d1-packages-repository';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	const repo = new PackagesRepository(event);
	const includeInactive = event.url.searchParams.get('includeInactive') === 'true';
	const packages = await repo.getAll(includeInactive);

	return {
		packages,
		includeInactive,
		canEdit: event.locals.permissions.has('portal:service-item:edit') || event.locals.permissions.has('portal:campaign:edit')
	};
};