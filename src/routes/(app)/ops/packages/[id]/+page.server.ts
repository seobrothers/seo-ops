import type { PageServerLoad, Actions } from './$types';
import { PackagesRepository } from '$lib/server/data/d1-packages-repository';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';
import { ServiceItemsRepository } from '$lib/server/data/d1-service-items-repository';
import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { packageSchema, packageBasicDetailsSchema } from '$lib/forms/package/package-schema';
import { createActivity } from '$lib/server/data/d1-activities';
import { ACTIVITY } from '$lib/activity-types';

export const load: PageServerLoad = async (event) => {
	const packageId = parseInt(event.params.id);
	
	if (isNaN(packageId)) {
		throw error(400, 'Invalid package ID');
	}
	
	const repo = new PackagesRepository(event);
	const partnersRepo = new PartnersRepository(event);
	const campaignProfilesRepo = new CampaignProfilesRepository(event);
	const serviceItemsRepo = new ServiceItemsRepository(event);
	
	const packageData = await repo.getById(packageId);

	if (!packageData) {
		throw error(404, 'Package not found');
	}

	// Get notes, activities, partners, campaign profiles, service items, and action items in parallel
	const [notes, activities, allPartners, allCampaignProfiles, packageServiceItems, availableServiceItems, packageActionItems, availableActionItems] = await Promise.all([
		repo.getNotes(packageId),
		repo.getActivities(packageId),
		partnersRepo.getAll(),
		campaignProfilesRepo.getAll(),
		repo.getServiceItems(packageId),
		serviceItemsRepo.getAvailableForPackage(packageData.partnerEntityId, packageData.type),
		repo.getActionItems(packageId),
		serviceItemsRepo.getAvailableActionItemsForPackage(packageData.partnerEntityId)
	]);

	// Filter to active partners and format for EntityPicker
	const partners = allPartners
		.filter(partner => partner.status === 'active')
		.map(partner => ({ id: partner.id, name: partner.name }));

	// Format campaign profiles for EntityPicker
	const campaignProfiles = allCampaignProfiles
		.map(profile => ({ id: profile.id, name: profile.name }));

	return {
		package: packageData,
		partners,
		campaignProfiles,
		notes,
		activities,
		packageServiceItems,
		availableServiceItems,
		packageActionItems,
		availableActionItems,
		canEdit: event.locals.permissions.has('portal:service-item:edit') || event.locals.permissions.has('portal:campaign:edit')
	};
};

export const actions: Actions = {
	updatePackageName: async (event) => {
		// Check permissions
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const packageId = parseInt(event.params.id);
		
		if (isNaN(packageId)) {
			return fail(400, { error: 'Invalid package ID' });
		}

		try {
			const formData = await event.request.formData();
			const name = formData.get('name') as string;

			if (!name || !name.trim()) {
				return fail(400, { error: 'Package name is required' });
			}

			// Get the current user's entity ID
			const currentEntityId = event.locals.employee?.id;
			if (!currentEntityId) {
				return fail(403, { error: 'User entity ID not available' });
			}

			const repo = new PackagesRepository(event);
			
			// Check if package exists and get current data
			const currentPackage = await repo.getById(packageId);
			if (!currentPackage) {
				return fail(404, { error: 'Package not found' });
			}

			const oldName = currentPackage.name;
			const newName = name.trim();

			// Update only the name
			await repo.updateField(packageId, 'name', newName);

			// Create activity log
			await createActivity(
				event.locals.db,
				event.locals.user?.id || 'system',
				null,
				ACTIVITY.package_updated,
				'packages',
				packageId,
				`Name changed from "${oldName}" to "${newName}"`
			);

			return { success: true };
		} catch (error) {
			console.error('Error updating package name:', error);
			return fail(500, { error: 'Failed to update package name' });
		}
	},

	updateBasicDetails: async (event) => {
		// Check permissions
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const form = await superValidate(event, zod4(packageBasicDetailsSchema));
		
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const packageId = parseInt(event.params.id);
			const currentEntityId = event.locals.employee?.id;
			
			if (!currentEntityId) {
				return fail(403, { 
					form, 
					message: 'User entity ID not available' 
				});
			}

			const repo = new PackagesRepository(event);
			await repo.updateBasicDetails(packageId, form.data, currentEntityId);
			
			return { form };
		} catch (error) {
			console.error('Error updating package basic details:', error);
			return fail(500, { 
				form, 
				message: 'Failed to update package. Please try again.' 
			});
		}
	},

	updateField: async (event) => {
		const packageId = parseInt(event.params.id);
		const formData = await event.request.formData();
		const field = formData.get('field') as string;
		const value = formData.get('value') as string;

		if (!field || value === undefined) {
			return fail(400, { error: 'Missing field or value' });
		}

		// Parse the value early to check if we need to redirect
		let parsedValue: any = value;
		if (['campaignConsiderations', 'presaleConsiderations', 'phaseOneOutline', 'ongoingPhaseOutline', 'seoGrowthOpportunities'].includes(field)) {
			try {
				parsedValue = value;
			} catch {
				parsedValue = value;
			}
		} else if (field === 'isActive') {
			parsedValue = value === 'true';
		}

		try {
			const repo = new PackagesRepository(event);
			await repo.updateField(packageId, field, parsedValue);
		} catch (error) {
			console.error('Error updating field:', error);
			return fail(500, { error: 'Failed to update field' });
		}

		// If deactivating a package, redirect to packages list (after successful update)
		if (field === 'isActive' && parsedValue === false) {
			throw redirect(302, '/team/ops/packages');
		}

		// Return empty object for successful form submission
		return {};
	},
	
	addNote: async (event) => {
		const packageId = parseInt(event.params.id);
		const formData = await event.request.formData();
		const note = formData.get('note') as string;
		
		if (!note) {
			return fail(400, { error: 'Note is required' });
		}
		
		try {
			const repo = new PackagesRepository(event);
			await repo.addNote(packageId, note);
			
			return { success: true };
		} catch (error) {
			console.error('Error adding note:', error);
			return fail(500, { error: 'Failed to add note' });
		}
	},

	addServiceItem: async (event) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const packageId = parseInt(event.params.id);
		const formData = await event.request.formData();
		const serviceItemId = parseInt(formData.get('serviceItemId') as string);
		const quantity = parseInt(formData.get('quantity') as string) || 1;
		const frequency = formData.get('frequency') as string || 'monthly';
		const monthlyValue = parseFloat(formData.get('monthlyValue') as string) || 0;
		
		if (!serviceItemId) {
			return fail(400, { error: 'Service item is required' });
		}
		
		try {
			const repo = new PackagesRepository(event);
			await repo.addServiceItem(packageId, {
				serviceItemId,
				quantity,
				frequency,
				monthlyValueCents: Math.round(monthlyValue * 100)
			});
			
			return {};
		} catch (error) {
			console.error('Error adding service item:', error);
			return fail(500, { error: 'Failed to add service item' });
		}
	},

	removeServiceItem: async (event) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const packageId = parseInt(event.params.id);
		const formData = await event.request.formData();
		const serviceItemId = parseInt(formData.get('serviceItemId') as string);
		
		if (!serviceItemId) {
			return fail(400, { error: 'Service item ID is required' });
		}
		
		try {
			const repo = new PackagesRepository(event);
			await repo.removeServiceItem(packageId, serviceItemId);
			
			return {};
		} catch (error) {
			console.error('Error removing service item:', error);
			return fail(500, { error: 'Failed to remove service item' });
		}
	},

	updateServiceItems: async (event) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const packageId = parseInt(event.params.id);
		const formData = await event.request.formData();
		const updatedItems = JSON.parse(formData.get('updatedItems') as string || '[]');
		const newItems = JSON.parse(formData.get('newItems') as string || '[]');
		
		try {
			const repo = new PackagesRepository(event);
			
			// Get current service items
			const existingItems = await repo.getServiceItems(packageId);
			const existingItemIds = new Set(existingItems.map(item => item.id));
			const updatedItemIds = new Set(updatedItems.map(item => item.id).filter(id => id));
			
			// Update existing items that are still in the list
			for (const item of updatedItems) {
				if (item.id && existingItemIds.has(item.id)) {
						await repo.updateServiceItem(packageId, item.id, {
						quantity: item.quantity || 1,
						frequency: item.frequency || 'monthly',
						monthlyValueCents: Math.round((item.monthlyValueCents || 0) * 100),
						orderOverride: item.orderOverride
					});
				}
			}
			
			// Remove items that are no longer in the updated list
			for (const existingItem of existingItems) {
				if (!updatedItemIds.has(existingItem.id)) {
					await repo.removeServiceItem(packageId, existingItem.serviceItemId);
				}
			}
			
			// Add new items
			for (const item of newItems) {
				if (item.serviceItemId && item.serviceItemId > 0) {
					await repo.addServiceItem(packageId, {
						serviceItemId: item.serviceItemId,
						quantity: item.quantity || 1,
						frequency: item.frequency || 'monthly',
						monthlyValueCents: Math.round((item.monthlyValueCents || 0) * 100)
					});
				}
			}
			
			return {};
		} catch (error) {
			console.error('Error updating service items:', error);
			return fail(500, { error: 'Failed to update service items' });
		}
	},

	updateActionItems: async (event) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const packageId = parseInt(event.params.id);
		const formData = await event.request.formData();
		const updatedItems = JSON.parse(formData.get('updatedItems') as string || '[]');
		const newItems = JSON.parse(formData.get('newItems') as string || '[]');

		try {
			const repo = new PackagesRepository(event);

			// Remove all existing action items first
			const existingItems = await repo.getActionItems(packageId);
			for (const item of existingItems) {
				await repo.removeActionItem(packageId, item.serviceItemId);
			}

			// Add updated existing items
			for (const item of updatedItems) {
				await repo.addActionItem(packageId, {
					serviceItemId: item.serviceItemId,
					orderOverride: item.orderOverride,
					inOnboarding: item.inOnboarding || false
				});
			}

			// Add new items
			for (const item of newItems) {
				const itemId = item.serviceItemId;
				if (itemId && itemId > 0) {
					await repo.addActionItem(packageId, {
						serviceItemId: itemId,
						orderOverride: item.orderOverride,
						inOnboarding: item.inOnboarding || false
					});
				}
			}

			return {};
		} catch (error) {
			console.error('Error updating action items:', error);
			return fail(500, { error: 'Failed to update action items' });
		}
	},

	deletePackage: async (event) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const packageId = parseInt(event.params.id);
		
		try {
			const repo = new PackagesRepository(event);
			await repo.delete(packageId);
		} catch (error) {
			console.error('Error deleting package:', error);
			return fail(500, { error: 'Failed to delete package' });
		}
		
		// Redirect to packages list after deletion
		throw redirect(302, '/team/ops/packages');
	}
};