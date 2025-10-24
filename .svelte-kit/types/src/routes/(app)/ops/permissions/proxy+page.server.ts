// @ts-nocheck
import type { PageServerLoad } from './$types';
import { PermissionsRepository } from '$lib/server/data/d1-permissions-repository';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	const repo = new PermissionsRepository(event);
	const partnersRepo = new PartnersRepository(event);
	const profilesRepo = new CampaignProfilesRepository(event);

	const includeInactive = event.url.searchParams.get('includeInactive') === 'true';

	const [permissions, partners, campaignProfiles] = await Promise.all([
		repo.getAll(includeInactive),
		partnersRepo.getAll(),
		profilesRepo.getAll()
	]);

	return {
		permissions,
		partners: partners.map(p => ({ id: p.id, name: p.name })),
		campaignProfiles: campaignProfiles.map(p => ({ id: p.id, name: p.name })),
		includeInactive,
		canEdit: event.locals.permissions.has('portal:service-item:edit') || event.locals.permissions.has('portal:campaign:edit'),
	};
};