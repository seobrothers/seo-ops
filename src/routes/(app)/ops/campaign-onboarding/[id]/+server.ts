import type { RequestHandler } from '@sveltejs/kit';
import { error, json } from '@sveltejs/kit';
import { TaskTemplatesRepository } from '$lib/server/data/d1-task-templates-repository';
import { createActivity } from '$lib/server/data/d1-activities';
import { ACTIVITY } from '$lib/activity-types';
import { RELATED_TABLES } from '$lib/server/db/d1-schema';

export const DELETE: RequestHandler = async (event) => {
	// Check permissions
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const templateId = parseInt(event.params.id);

	if (isNaN(templateId)) {
		throw error(400, 'Invalid template ID');
	}

	try {
		const repo = new TaskTemplatesRepository(event);

		// Check if template exists
		const template = await repo.get(templateId);
		if (!template) {
			throw error(404, 'Template not found');
		}

		// Get the current user's entity ID
		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			throw error(403, 'User entity ID not available');
		}

		// Soft delete the template (marks as inactive)
		await repo.delete(templateId, currentEntityId);

		// Create activity log
		await createActivity(
			event.locals.db,
			event.locals.user?.id,
			null,
			ACTIVITY.deleted_template,
			RELATED_TABLES.task_templates,
			templateId,
			`Campaign onboarding template "${template.title || 'Untitled'}" was deleted`
		);

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting template:', err);
		throw error(500, 'Failed to delete template');
	}
};

export const POST: RequestHandler = async (event) => {
	// Check permissions
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const templateId = parseInt(event.params.id);

	if (isNaN(templateId)) {
		throw error(400, 'Invalid template ID');
	}

	try {
		const repo = new TaskTemplatesRepository(event);

		// Check if template exists
		const template = await repo.get(templateId);
		if (!template) {
			throw error(404, 'Template not found');
		}

		// Get the current user's entity ID
		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			throw error(403, 'User entity ID not available');
		}

		// Activate the template
		await repo.activate(templateId, currentEntityId);

		// Create activity log
		await createActivity(
			event.locals.db,
			event.locals.user?.id,
			null,
			ACTIVITY.updated_template,
			RELATED_TABLES.task_templates,
			templateId,
			`Campaign onboarding template "${template.title || 'Untitled'}" was activated`
		);

		return json({ success: true });
	} catch (err) {
		console.error('Error activating template:', err);
		throw error(500, 'Failed to activate template');
	}
};
