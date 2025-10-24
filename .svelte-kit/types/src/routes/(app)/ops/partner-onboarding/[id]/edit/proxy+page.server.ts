// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { partnerOnboardingTemplateFormSchema } from '$lib/forms/task-template/partner-onboarding-schema';
import { TaskTemplatesRepository } from '$lib/server/data/d1-task-templates-repository';
import { fail, error, redirect } from '@sveltejs/kit';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const templateId = parseInt(event.params.id);
	if (isNaN(templateId)) {
		throw error(400, 'Invalid template ID');
	}

	const repo = new TaskTemplatesRepository(event);
	const template = await repo.get(templateId);

	if (!template) {
		throw error(404, 'Template not found');
	}

	const form = await superValidate({
		title: template.title,
		description: template.description || undefined,
		primaryParticipant: template.primaryParticipant,
		grouping: template.grouping,
		estTimeMinutes: template.estTimeMinutes || undefined,
		sopUrl: template.sopUrl || undefined,
		mandatory: template.mandatory,
		decisionPoint: template.decisionPoint
	}, zod4(partnerOnboardingTemplateFormSchema), {
		errors: false
	});

	return {
		form,
		templateId,
		template
	};
};

export const actions = {
	default: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const templateId = parseInt(event.params.id);
		if (isNaN(templateId)) {
			return fail(400, { message: 'Invalid template ID' });
		}

		const form = await superValidate(event, zod4(partnerOnboardingTemplateFormSchema));

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

			const repo = new TaskTemplatesRepository(event);

			await repo.update(templateId, {
				...form.data
			}, currentEntityId);

			// Redirect back to the main page
			redirect(302, '/team/ops/partner-onboarding');
		} catch (error) {
			// Let redirects pass through
			if (error?.status === 302) {
				throw error;
			}

			console.error('Error updating partner onboarding template:', error);
			return fail(500, {
				form,
				message: 'Failed to update template. Please try again.'
			});
		}
	}
};
;null as any as Actions;