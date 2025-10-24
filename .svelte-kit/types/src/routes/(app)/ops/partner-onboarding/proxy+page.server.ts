// @ts-nocheck
import type { PageServerLoad } from './$types';
import { TaskTemplatesRepository } from '$lib/server/data/d1-task-templates-repository';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	const repo = new TaskTemplatesRepository(event);
	const includeInactive = event.url.searchParams.get('includeInactive') === 'true';
	const allTemplates = await repo.getAll(includeInactive);

	// Pre-filter to only partner_onboarding templates
	const taskTemplates = allTemplates.filter(t => t.type === 'partner_onboarding');

	return {
		taskTemplates,
		includeInactive,
		canEdit: event.locals.permissions.has('portal:service-item:edit') || event.locals.permissions.has('portal:campaign:edit'),
	};
};
