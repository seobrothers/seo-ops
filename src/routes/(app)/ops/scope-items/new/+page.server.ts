import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { serviceItemFormSchema } from '$lib/forms/service-item/service-item-schema';
import { ServiceItemsRepository } from '$lib/server/data/d1-service-items-repository';
import { ServiceCategoriesRepository } from '$lib/server/data/d1-service-categories-repository';
import { fail, error, redirect } from '@sveltejs/kit';
import { serviceItems } from '$lib/server/db/d1-schema';
import { eq } from 'drizzle-orm';
import { toSnakeCase } from '$lib/utils';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const serviceCategoriesRepo = new ServiceCategoriesRepository(event);
	const serviceCategories = await serviceCategoriesRepo.getAll();

	// Set default values for new service items
	const defaultData = {
		name: '',
		type: 'ongoing' as const,
		serviceCategory: undefined,
		serviceLabel: '',
		description: '',
		partnerEntityId: undefined
	};

	const form = await superValidate(defaultData, zod4(serviceItemFormSchema), {
		errors: false
	});

	return {
		form,
		serviceCategories
	};
};

export const actions: Actions = {
	default: async (event) => {
		// Check permissions
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const form = await superValidate(event, zod4(serviceItemFormSchema));

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

			// Generate serviceLabel from name if not provided
			const serviceLabel = form.data.serviceLabel || toSnakeCase(form.data.name);

			// Check for duplicate service label (scope items must have unique labels)
			const existingItem = await event.locals.db
				.select({ id: serviceItems.id })
				.from(serviceItems)
				.where(eq(serviceItems.serviceLabel, serviceLabel))
				.limit(1);

			if (existingItem.length > 0) {
				const formattedLabel = serviceLabel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
				return fail(400, {
					form,
					message: `A scope item with the label "${formattedLabel}" already exists. Service labels must be unique.`
				});
			}

			const repo = new ServiceItemsRepository(event);
			const newItem = await repo.create({
				...form.data,
				serviceLabel,
				isActive: true
			}, currentEntityId);

			// Redirect to the newly created item's detail page
			throw redirect(303, `/team/ops/scope-items/${newItem.id}`);
		} catch (error) {
			// Re-throw redirect errors
			if (error?.status === 303) {
				throw error;
			}
			console.error('Error creating service item:', error);
			return fail(500, {
				form,
				message: 'Failed to create service item. Please try again.'
			});
		}
	}
};
