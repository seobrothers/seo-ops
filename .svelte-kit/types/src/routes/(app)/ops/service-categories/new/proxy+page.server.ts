// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { serviceCategoryFormSchema } from '$lib/forms/service-category/service-category-schema';
import { ServiceCategoriesRepository } from '$lib/server/data/d1-service-categories-repository';
import { fail, error, redirect } from '@sveltejs/kit';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	const defaultData = {
		key: '',
		displayName: '',
		description: ''
	};

	const form = await superValidate(defaultData, zod4(serviceCategoryFormSchema), {
		errors: false
	});

	return {
		form
	};
};

export const actions = {
	default: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
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
			await repo.create(form.data, currentEntityId);

			throw redirect(302, '/team/ops/service-categories');
		} catch (error) {
			if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
				throw error;
			}
			console.error('Error creating service category:', error);
			return fail(500, {
				form,
				message: 'Failed to create service category. Please try again.'
			});
		}
	}
};
;null as any as Actions;