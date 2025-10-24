import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { catalogItemFormSchema } from '$lib/forms/catalog-item/catalog-item-schema';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { ServiceCategoriesRepository } from '$lib/server/data/d1-service-categories-repository';
import { serviceItems } from '$lib/server/db/d1-schema';
import { fail, error, redirect } from '@sveltejs/kit';
import { toSnakeCase } from '$lib/utils';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const partnersRepo = new PartnersRepository(event);
	const serviceCategoriesRepo = new ServiceCategoriesRepository(event);

	const allPartners = await partnersRepo.getAll();
	const serviceCategories = await serviceCategoriesRepo.getAll();

	// Filter to active partners and format for EntityPicker
	const partners = allPartners
		.filter(partner => partner.status === 'active')
		.map(partner => ({ id: partner.id, name: partner.name }));

	// Set default values for new catalog items
	const defaultData = {
		name: '',
		serviceCategory: undefined,
		serviceLabel: '',
		description: '',
		partnerEntityId: undefined,
		inStream: false
	};

	const form = await superValidate(defaultData, zod4(catalogItemFormSchema), {
		errors: false
	});

	return {
		form,
		partners,
		serviceCategories
	};
};

export const actions: Actions = {
	default: async (event) => {
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

			// Generate serviceLabel from name if not provided
			const serviceLabel = form.data.serviceLabel || toSnakeCase(form.data.name);

			// Look up service category ID if category key is provided
			let serviceCategoryId: number | undefined;
			if (form.data.serviceCategory) {
				const { serviceCategories } = await import('$lib/server/db/schema');
				const { eq } = await import('drizzle-orm');
				const category = await event.locals.db
					.select({ id: serviceCategories.id })
					.from(serviceCategories)
					.where(eq(serviceCategories.key, form.data.serviceCategory))
					.get();
				serviceCategoryId = category?.id;
			}

			// Create catalog item with proposalMode='neither'
			const [newItem] = await event.locals.db
				.insert(serviceItems)
				.values({
					name: form.data.name,
					serviceCategory: form.data.serviceCategory as any,
					serviceCategoryId: serviceCategoryId,
					serviceLabel: serviceLabel as any,
					description: form.data.description,
					partnerEntityId: form.data.partnerEntityId,
					inStream: form.data.inStream || false,
					proposalMode: 'neither', // Catalog items are not sellable
					isActive: true,
					createdBy: currentEntityId,
					updatedBy: currentEntityId,
				})
				.returning({ id: serviceItems.id });

			// Redirect to the newly created item's detail page
			throw redirect(303, `/team/ops/service-catalog/${newItem.id}`);
		} catch (error) {
			// Re-throw redirect errors
			if (error?.status === 303) {
				throw error;
			}
			console.error('Error creating catalog item:', error);
			return fail(500, {
				form,
				message: 'Failed to create catalog item. Please try again.'
			});
		}
	}
};