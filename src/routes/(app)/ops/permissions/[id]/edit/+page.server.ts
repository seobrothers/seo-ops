import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { permissionFormSchema } from '$lib/forms/permission/permission-schema';
import { PermissionsRepository } from '$lib/server/data/d1-permissions-repository';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { ServiceItemsRepository } from '$lib/server/data/d1-service-items-repository';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';
import { serviceCategories } from '$lib/server/db/d1-schema';
import { fail, error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const permissionId = event.params.id;

	const permissionsRepo = new PermissionsRepository(event);
	const partnersRepo = new PartnersRepository(event);
	const serviceItemsRepo = new ServiceItemsRepository(event);
	const campaignProfilesRepo = new CampaignProfilesRepository(event);

	const permission = await permissionsRepo.get(parseInt(permissionId));
	if (!permission) {
		throw error(404, 'Permission not found');
	}

	const allPartners = await partnersRepo.getAll();
	const allServiceItems = await serviceItemsRepo.getAll();
	const allCampaignProfiles = await campaignProfilesRepo.getAll();

	// Get service categories directly from DB
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

	// Populate form with existing data
	const form = await superValidate({
		name: permission.name || '',
		permissionKey: permission.permissionKey,
		permissionState: permission.permissionState,
		serviceItemId: permission.serviceItemId || undefined,
		serviceCategoryId: permission.serviceCategoryId || undefined,
		partnerId: permission.partnerId || undefined,
		campaignProfileId: permission.campaignProfileId || undefined
	}, zod4(permissionFormSchema), {
		errors: false
	});

	return {
		form,
		partners,
		serviceItems,
		serviceCategories: categories,
		campaignProfiles: profiles,
		permissionId: parseInt(permissionId),
		permission,
		canEdit: event.locals.permissions.has('portal:service-item:edit') || event.locals.permissions.has('portal:campaign:edit')
	};
};

export const actions: Actions = {
	updateField: async (event) => {
		// Check permissions
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const permissionId = event.params.id;
		const formData = await event.request.formData();
		const field = formData.get('field') as string;
		const value = formData.get('value') as string;

		try {
			const currentEntityId = event.locals.employee?.id;
			if (!currentEntityId) {
				return fail(403, { message: 'User entity ID not available' });
			}

			const repo = new PermissionsRepository(event);

			// Convert the value appropriately for isActive field
			const fieldValue = field === 'isActive' ? (value === 'true' ? 1 : 0) : value;

			await repo.updateField(parseInt(permissionId), { [field]: fieldValue }, currentEntityId);

			// Redirect back to permissions list
			throw redirect(303, '/team/ops/permissions');
		} catch (err) {
			// Let redirects pass through
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error updating permission field:', err);
			return fail(500, { message: 'Failed to update permission field. Please try again.' });
		}
	},
	update: async (event) => {
		// Check permissions
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const permissionId = event.params.id;

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
			await repo.update(parseInt(permissionId), form.data, currentEntityId);

			// Redirect back to permissions list
			throw redirect(303, '/team/ops/permissions');
		} catch (err) {
			// Check if it's a redirect (which is expected)
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error updating permission:', err);
			return fail(500, {
				form,
				message: 'Failed to update permission. Please try again.'
			});
		}
	}
};