import type { PageServerLoad } from './$types';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';
import { campaigns } from '$lib/server/db/d1-schema';
import { eq, and, sql } from 'drizzle-orm';

export const load: PageServerLoad = async (event) => {
	const repo = new CampaignProfilesRepository(event);
	const includeInactive = event.url.searchParams.get('includeInactive') === 'true';
	const campaignProfiles = await repo.getAll(includeInactive);

	// Get count of active campaigns for each profile
	const campaignCounts = await event.locals.db
		.select({
			campaignProfileId: campaigns.campaignProfileId,
			count: sql<number>`count(*)`
		})
		.from(campaigns)
		.where(eq(campaigns.status, 'active'))
		.groupBy(campaigns.campaignProfileId);

	// Create a map of profile ID to campaign count
	const countMap = new Map<number, number>();
	for (const row of campaignCounts) {
		if (row.campaignProfileId) {
			countMap.set(row.campaignProfileId, row.count);
		}
	}

	// Add campaign counts to profiles
	const profilesWithCounts = campaignProfiles.map(profile => ({
		...profile,
		activeCampaignCount: countMap.get(profile.id) || 0
	}));

	return {
		campaignProfiles: profilesWithCounts,
		includeInactive,
		canEdit: event.locals.permissions.has('portal:employee:edit'),
	};
};