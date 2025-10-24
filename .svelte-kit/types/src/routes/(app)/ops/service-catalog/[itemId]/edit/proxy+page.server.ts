// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { catalogItemFormSchema } from '$lib/forms/catalog-item/catalog-item-schema';
import { ServiceItemsRepository } from '$lib/server/data/d1-service-items-repository';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { ServiceCategoriesRepository } from '$lib/server/data/d1-service-categories-repository';
import { fail, error } from '@sveltejs/kit';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const itemId = parseInt(event.params.itemId, 10);
	if (Number.isNaN(itemId)) {
		throw error(404, 'Service item not found');
	}

	const serviceItemsRepo = new ServiceItemsRepository(event);
	const partnersRepo = new PartnersRepository(event);
	const serviceCategoriesRepo = new ServiceCategoriesRepository(event);

	const [serviceItem, allPartners, serviceCategories] = await Promise.all([
		serviceItemsRepo.get(itemId),
		partnersRepo.getAll(),
		serviceCategoriesRepo.getAll(),
	]);

	if (!serviceItem) {
		throw error(404, 'Service item not found');
	}

	// Filter to active partners and format for EntityPicker
	const partners = allPartners
		.filter(partner => partner.status === 'active')
		.map(partner => ({ id: partner.id, name: partner.name }));

	// Convert catalog item data to form format
	const formData = {
		name: serviceItem.name,
		serviceCategory: serviceItem.serviceCategory || undefined,
		serviceLabel: serviceItem.serviceLabel || undefined,
		description: serviceItem.description || undefined,
		partnerEntityId: serviceItem.partnerEntityId || undefined
	};

	const form = await superValidate(formData, zod4(catalogItemFormSchema), {
		errors: false
	});

	return {
		form,
		partners,
		serviceCategories,
		serviceItem
	};
};

export const actions = {
	default: async (event: import('./$types').RequestEvent) => {
		const itemId = parseInt(event.params.itemId, 10);
		if (Number.isNaN(itemId)) {
			throw error(404, 'Service item not found');
		}

		// Check permissions
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const form = await superValidate(event, zod4(catalogItemFormSchema));

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

			const repo = new ServiceItemsRepository(event);
			await repo.update(itemId, form.data, currentEntityId);

			// Return success - let superForm handle the UI state naturally
			return { form };
		} catch (error) {
			console.error('Error updating catalog item:', error);
			return fail(500, {
				form,
				message: 'Failed to update catalog item. Please try again.'
			});
		}
	}
};;null as any as Actions;