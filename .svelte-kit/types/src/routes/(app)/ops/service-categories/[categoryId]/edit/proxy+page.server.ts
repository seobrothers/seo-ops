// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { serviceCategoryFormSchema } from '$lib/forms/service-category/service-category-schema';
import { ServiceCategoriesRepository } from '$lib/server/data/d1-service-categories-repository';
import { fail, error, redirect } from '@sveltejs/kit';
import { createActivity } from '$lib/server/data/d1-activities';
import { RELATED_TABLES } from '$lib/server/db/d1-schema';
import { ACTIVITY } from '$lib/activity-types';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	const categoryId = parseInt(event.params.categoryId);
	if (isNaN(categoryId)) {
		throw error(400, 'Invalid category ID');
	}

	const repo = new ServiceCategoriesRepository(event);
	const category = await repo.get(categoryId);

	if (!category) {
		throw error(404, 'Category not found');
	}

	const form = await superValidate({
		key: category.key,
		displayName: category.displayName,
		description: category.description || ''
	}, zod4(serviceCategoryFormSchema), {
		errors: false
	});

	return {
		form,
		category,
		categoryId
	};
};

export const actions = {
	updateCategory: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const categoryId = parseInt(event.params.categoryId);
		if (isNaN(categoryId)) {
			return fail(400, { message: 'Invalid category ID' });
		}

		const form = await superValidate(event, zod4(serviceCategoryFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			const currentEntityId = event.locals.employee?.id;
			if (!currentEntityId) {
				return fail(403, {
					form,
					message: 'User entity ID not available'
				});
			}

			const repo = new ServiceCategoriesRepository(event);
			await repo.update(categoryId, form.data, currentEntityId);

			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.updated_service_category,
				RELATED_TABLES.service_categories,
				categoryId,
				`Updated service category: ${form.data.displayName}`
			);

			return { form };
		} catch (err) {
			console.error('Error updating service category:', err);
			return fail(500, {
				form,
				message: 'Failed to update service category. Please try again.'
			});
		}
	},

	deleteCategory: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const categoryId = parseInt(event.params.categoryId);
		if (isNaN(categoryId)) {
			return fail(400, { error: 'Invalid category ID' });
		}

		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, { error: 'User entity ID not available' });
		}

		try {
			const repo = new ServiceCategoriesRepository(event);
			await repo.updateField(categoryId, { isActive: false }, currentEntityId);

			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.deactivated_service_category,
				RELATED_TABLES.service_categories,
				categoryId,
				'Service category deactivated'
			);

			throw redirect(303, '/team/ops/service-categories');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error deactivating service category:', err);
			return fail(500, { error: 'Failed to deactivate category' });
		}
	},

	reactivateCategory: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const categoryId = parseInt(event.params.categoryId);
		if (isNaN(categoryId)) {
			return fail(400, { error: 'Invalid category ID' });
		}

		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, { error: 'User entity ID not available' });
		}

		try {
			const repo = new ServiceCategoriesRepository(event);
			await repo.updateField(categoryId, { isActive: true }, currentEntityId);

			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.reactivated_service_category,
				RELATED_TABLES.service_categories,
				categoryId,
				'Service category reactivated'
			);

			throw redirect(303, '/team/ops/service-categories');
		} catch (err) {
			if (err && typeof err === 'object' && 'status' in err && err.status === 303) {
				throw err;
			}
			console.error('Error reactivating service category:', err);
			return fail(500, { error: 'Failed to reactivate category' });
		}
	}
};
;null as any as Actions;