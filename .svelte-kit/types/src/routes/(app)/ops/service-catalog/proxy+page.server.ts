// @ts-nocheck
import type { PageServerLoad } from './$types';
import { ServiceItemsRepository } from '$lib/server/data/d1-service-items-repository';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	const repo = new ServiceItemsRepository(event);
	const includeInactive = event.url.searchParams.get('includeInactive') === 'true';
	const includePartnerItems = event.url.searchParams.get('includePartnerItems') === 'true';
	const serviceItems = await repo.getAll(includeInactive);

	// Filter for catalog items: proposal_mode is neither (non-sellable items)
	const catalogItems = serviceItems.filter((item) => item.proposalMode === 'neither');

	return {
		serviceItems: catalogItems,
		includeInactive,
		includePartnerItems,
		canEdit: event.locals.permissions.has('portal:service-item:edit') || event.locals.permissions.has('portal:campaign:edit'),
	};
};