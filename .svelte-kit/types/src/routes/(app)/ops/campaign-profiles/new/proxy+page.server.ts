// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { campaignProfileFormSchema } from '$lib/forms/campaign-profile/campaign-profile-schema';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';
import { fail, error, redirect } from '@sveltejs/kit';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (!event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	// Set default values for new campaign profiles
	const defaultData = {
		name: '',
		short_description: ''
	};
	
	const form = await superValidate(defaultData, zod4(campaignProfileFormSchema), {
		errors: false
	});

	return {
		form
	};
};

export const actions = {
	default: async (event: import('./$types').RequestEvent) => {
		// Check permissions
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const form = await superValidate(event, zod4(campaignProfileFormSchema));
		
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			// Get the current user's entity ID
			const currentEntityId = event.locals.employee?.id;
			if (!currentEntityId) {
				return fail(403, { 
					form, 
					message: 'User entity ID not available' 
				});
			}

			const repo = new CampaignProfilesRepository(event);
			await repo.create(form.data, currentEntityId);
			
			// Redirect to main campaign profiles page after successful creation
			throw redirect(302, '/team/ops/campaign-profiles');
		} catch (error) {
			// Check if the error is actually a redirect, and if so, re-throw it
			if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
				throw error;
			}
			console.error('Error creating campaign profile:', error);
			return fail(500, { 
				form, 
				message: 'Failed to create campaign profile. Please try again.' 
			});
		}
	}
};;null as any as Actions;