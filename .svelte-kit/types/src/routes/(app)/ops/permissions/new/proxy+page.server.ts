// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { permissionFormSchema } from '$lib/forms/permission/permission-schema';
import { PermissionsRepository } from '$lib/server/data/d1-permissions-repository';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { ServiceItemsRepository } from '$lib/server/data/d1-service-items-repository';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';
import { serviceCategories } from '$lib/server/db/d1-schema';
import { fail, error } from '@sveltejs/kit';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const partnersRepo = new PartnersRepository(event);
	const serviceItemsRepo = new ServiceItemsRepository(event);
	const campaignProfilesRepo = new CampaignProfilesRepository(event);

	const allPartners = await partnersRepo.getAll();
	const allServiceItems = await serviceItemsRepo.getAll();
	const allCampaignProfiles = await campaignProfilesRepo.getAll();

	// Get service categories using serviceItemsRepo's DB instance
	const allServiceCategories = await serviceItemsRepo['db']
		.select({
			id: serviceCategories.id,
			displayName: serviceCategories.displayName
		})
		.from(serviceCategories);

	// Filter to active partners and format for EntityPicker
	const partners = allPartners
		.filter(partner => partner.status === 'active')
		.map(partner => ({ id: partner.id, name: partner.name }));

	// Format service items for EntityPicker
	const serviceItems = allServiceItems
		.filter(item => item.isActive)
		.map(item => ({ id: item.id, name: item.name }));

	// Format service categories for EntityPicker
	const categories = allServiceCategories.map(cat => ({ id: cat.id, name: cat.displayName }));

	// Format campaign profiles for EntityPicker
	const profiles = allCampaignProfiles.map(profile => ({ id: profile.id, name: profile.name }));

	// Set default values for new permissions
	const defaultData = {
		name: '',
		permissionKey: '',
		permissionState: 'allowed' as const,
		serviceItemId: undefined,
		serviceCategoryId: undefined,
		partnerId: undefined,
		campaignProfileId: undefined
	};

	const form = await superValidate(defaultData, zod4(permissionFormSchema), {
		errors: false
	});

	return {
		form,
		partners,
		serviceItems,
		serviceCategories: categories,
		campaignProfiles: profiles
	};
};

export const actions = {
	default: async (event: import('./$types').RequestEvent) => {
		// Check permissions
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const form = await superValidate(event, zod4(permissionFormSchema));

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

			const repo = new PermissionsRepository(event);
			await repo.create(form.data, currentEntityId);

			// Return success - let superForm handle the UI state naturally
			return { form };
		} catch (error) {
			console.error('Error creating permission:', error);
			return fail(500, {
				form,
				message: 'Failed to create permission. Please try again.'
			});
		}
	}
};;null as any as Actions;