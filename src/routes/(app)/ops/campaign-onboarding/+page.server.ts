import type { PageServerLoad } from './$types';
import { TaskTemplatesRepository } from '$lib/server/data/d1-task-templates-repository';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';

export const load: PageServerLoad = async (event) => {
	const repo = new TaskTemplatesRepository(event);
	const partnersRepo = new PartnersRepository(event);
	const profilesRepo = new CampaignProfilesRepository(event);

	const includeInactive = event.url.searchParams.get('includeInactive') === 'true';

	const [allTemplates, partners, campaignProfiles] = await Promise.all([
		repo.getAll(includeInactive),
		partnersRepo.getAll(),
		profilesRepo.getAll()
	]);

	// Pre-filter to only campaign_onboarding templates
	const taskTemplates = allTemplates.filter(t => t.type === 'campaign_onboarding');

	return {
		taskTemplates,
		partners: partners.map(p => ({ id: p.id, name: p.name })),
		campaignProfiles: campaignProfiles.map(p => ({ id: p.id, name: p.name })),
		includeInactive,
		canEdit: event.locals.permissions.has('portal:service-item:edit') || event.locals.permissions.has('portal:campaign:edit'),
	};
};
