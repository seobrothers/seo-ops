import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { serviceItems } from '$lib/server/db/d1-schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	if (!event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	const itemId = parseInt(event.params.id);
	
	if (isNaN(itemId)) {
		throw error(400, 'Invalid service item ID');
	}

	// Get service item
	const item = await event.locals.db
		.select()
		.from(serviceItems)
		.where(eq(serviceItems.id, itemId))
		.limit(1);
	
	if (!item || item.length === 0) {
		throw error(404, 'Service item not found');
	}

	return json(item[0]);
};