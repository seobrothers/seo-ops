import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { partnerOnboardingTemplateFormSchema } from '$lib/forms/task-template/partner-onboarding-schema';
import { TaskTemplatesRepository } from '$lib/server/data/d1-task-templates-repository';
import { fail, error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const defaultData = {
		title: '',
		description: undefined,
		primaryParticipant: undefined,
		grouping: undefined,
		estTimeMinutes: undefined,
		sopUrl: undefined,
		mandatory: false,
		decisionPoint: false
	};

	const form = await superValidate(defaultData, zod4(partnerOnboardingTemplateFormSchema), {
		errors: false
	});

	return {
		form
	};
};

export const actions: Actions = {
	default: async (event) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
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

			// Add the type and ensure no partner/campaign profile
			await repo.create({
				...form.data,
				type: 'partner_onboarding',
				partnerEntityId: undefined,
				campaignProfileId: undefined
			}, currentEntityId);

			// Redirect back to the main page
			redirect(302, '/team/ops/partner-onboarding');
		} catch (error) {
			// Let redirects pass through
			if (error?.status === 302) {
				throw error;
			}

			console.error('Error creating partner onboarding template:', error);
			return fail(500, {
				form,
				message: 'Failed to create template. Please try again.'
			});
		}
	}
};
