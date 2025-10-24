import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';

export const DELETE: RequestHandler = async (event) => {
	// Check permissions
	if (!event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	const profileId = parseInt(event.params.id);
	
	if (isNaN(profileId)) {
		throw error(400, 'Invalid Campaign Profile ID');
	}

	try {
		const repo = new CampaignProfilesRepository(event);

		// Check if campaign profile exists
		const profile = await repo.get(profileId);
		if (!profile) {
			throw error(404, 'Campaign Profile not found');
		}

		// Get current user entity ID for updatedBy field
		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			throw error(403, 'User entity ID not available');
		}

		// Set isActive to false instead of deleting
		const result = await repo.updateField(profileId, { isActive: false }, currentEntityId);

		if (!result) {
			throw error(404, 'Campaign Profile not found');
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error deactivating campaign profile:', err);
		throw error(500, 'Failed to deactivate campaign profile');
	}
};