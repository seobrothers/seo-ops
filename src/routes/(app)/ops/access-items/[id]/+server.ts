import type { RequestHandler } from './$types';
import { AccessItemsRepository } from '$lib/server/data/d1-access-items-repository';
import { error, json } from '@sveltejs/kit';

export const DELETE: RequestHandler = async (event) => {
	if (!event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	const id = parseInt(event.params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid ID');
	}

	try {
		const repo = new AccessItemsRepository(event);
		await repo.delete(id, event.locals.user.entityId);
		return json({ success: true });
	} catch (err) {
		console.error('Error deactivating access item:', err);
		throw error(500, 'Failed to deactivate access item');
	}
};

export const POST: RequestHandler = async (event) => {
	if (!event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	const id = parseInt(event.params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid ID');
	}

	try {
		const repo = new AccessItemsRepository(event);
		await repo.activate(id, event.locals.user.entityId);
		return json({ success: true });
	} catch (err) {
		console.error('Error activating access item:', err);
		throw error(500, 'Failed to activate access item');
	}
};