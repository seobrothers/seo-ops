import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { accessItemFormSchema } from '$lib/forms/access-item/access-item-schema';
import { AccessItemsRepository } from '$lib/server/data/d1-access-items-repository';
import { entities } from '$lib/server/db/d1-schema';
import { inArray, eq } from 'drizzle-orm';
import { fail, error } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	// Get all individuals (employees and individual entities) for TFA contact picker
	// Get all partners (company entities) for partner picker
	const [allEntities, partners] = await Promise.all([
		event.locals.db
			.select({
				id: entities.id,
				name: entities.name
			})
			.from(entities)
			.where(inArray(entities.entityType, ['employee', 'individual']))
			.orderBy(entities.name),
		event.locals.db
			.select({
				id: entities.id,
				name: entities.name
			})
			.from(entities)
			.where(eq(entities.entityType, 'company'))
			.orderBy(entities.name)
	]);

	const defaultData = {
		username: '',
		email: '',
		accessItemOwner: 'partner' as const,
		inLastpass: false,
		tfaType: undefined,
		tfaTypeValue: '',
		tfaContactId: undefined,
		tfaSource: undefined,
		partnerEntityId: undefined,
	};

	const form = await superValidate(defaultData, zod4(accessItemFormSchema), {
		errors: false
	});

	return {
		form,
		entities: allEntities,
		partners
	};
};

export const actions: Actions = {
	default: async (event) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const form = await superValidate(event, zod4(accessItemFormSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, {
				form,
				message: 'User entity ID not available'
			});
		}

		try {
			const repo = new AccessItemsRepository(event);

			// Automatically set accessItemOwner based on partner
			const accessItemOwner = form.data.partnerEntityId ? 'partner' : 'internal';

			const newItem = await repo.create({
				username: form.data.username,
				email: form.data.email || undefined,
				accessItemOwner,
				inLastpass: form.data.inLastpass,
				tfaType: form.data.tfaType || undefined,
				tfaTypeValue: form.data.tfaTypeValue || undefined,
				tfaContactId: form.data.tfaContactId,
				tfaSource: form.data.tfaSource || undefined,
				partnerEntityId: form.data.partnerEntityId,
			}, currentEntityId);

			return { form, newItem };
		} catch (error) {
			console.error('Error creating access item:', error);
			return fail(500, {
				form,
				message: 'Failed to create access item. Please try again.'
			});
		}
	}
};