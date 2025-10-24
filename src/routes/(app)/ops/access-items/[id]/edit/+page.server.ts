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

	const id = parseInt(event.params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid ID');
	}

	const repo = new AccessItemsRepository(event);

	// Get all individuals (employees and individual entities) for TFA contact picker
	// Get all partners (company entities) for partner picker
	const [item, allEntities, partners] = await Promise.all([
		repo.get(id),
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

	if (!item) {
		throw error(404, 'Access item not found');
	}

	// Derive accessItemOwner from partnerEntityId
	const accessItemOwner = item.partnerEntityId ? 'partner' : 'internal';

	const form = await superValidate({
		username: item.username,
		email: item.email || '',
		accessItemOwner,
		inLastpass: item.inLastpass,
		tfaType: item.tfaType || '',
		tfaTypeValue: item.tfaTypeValue || '',
		tfaContactId: item.tfaContactId || undefined,
		tfaSource: item.tfaSource || '',
		partnerEntityId: item.partnerEntityId || undefined,
	}, zod4(accessItemFormSchema), {
		errors: false
	});

	return {
		form,
		entities: allEntities,
		partners,
		itemId: id
	};
};

export const actions: Actions = {
	default: async (event) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const id = parseInt(event.params.id);
		if (isNaN(id)) {
			return fail(400, { message: 'Invalid ID' });
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

			await repo.update(id, {
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

			return { form };
		} catch (error) {
			console.error('Error updating access item:', error);
			return fail(500, {
				form,
				message: 'Failed to update access item. Please try again.'
			});
		}
	}
};