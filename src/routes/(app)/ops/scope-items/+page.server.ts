import type { PageServerLoad } from './$types';
import { ServiceItemsRepository } from '$lib/server/data/d1-service-items-repository';

export const load: PageServerLoad = async (event) => {
	const repo = new ServiceItemsRepository(event);
	const includeInactive = event.url.searchParams.get('includeInactive') === 'true';
	const serviceItems = await repo.getAll(includeInactive);

	// Filter for scope items: proposal_mode is one_time, recurring, or both (not neither)
	const scopeItems = serviceItems.filter((item) => item.proposalMode !== 'neither');

	return {
		serviceItems: scopeItems,
		includeInactive,
		canEdit: event.locals.permissions.has('portal:service-item:edit') || event.locals.permissions.has('portal:campaign:edit'),
	};
};
