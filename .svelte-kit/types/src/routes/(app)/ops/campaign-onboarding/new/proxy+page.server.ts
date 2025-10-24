// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { taskTemplateFormSchema } from '$lib/forms/task-template/task-template-schema';
import { TaskTemplatesRepository } from '$lib/server/data/d1-task-templates-repository';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';
import { ServiceCategoriesRepository } from '$lib/server/data/d1-service-categories-repository';
import { fail, error, redirect } from '@sveltejs/kit';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const partnersRepo = new PartnersRepository(event);
	const campaignProfilesRepo = new CampaignProfilesRepository(event);
	const serviceCategoriesRepo = new ServiceCategoriesRepository(event);

	const allPartners = await partnersRepo.getAll();
	const allCampaignProfiles = await campaignProfilesRepo.getAll();
	const allServiceCategories = await serviceCategoriesRepo.getAll();

	const partners = allPartners
		.filter(partner => partner.status === 'active')
		.map(partner => ({ id: partner.id, name: partner.name }));

	const campaignProfiles = allCampaignProfiles.map(profile => ({
		id: profile.id,
		name: profile.name
	}));

	const serviceCategories = allServiceCategories.map(category => ({
		id: category.id,
		key: category.key,
		displayName: category.displayName
	}));

	const defaultData = {
		type: undefined,
		title: '',
		description: undefined,
		key: '',
		primaryParticipant: undefined,
		grouping: undefined,
		estTimeMinutes: undefined,
		sopUrl: undefined,
		sopId: undefined,
		partnerEntityId: undefined,
		campaignProfileId: undefined,
		serviceCategoryId: undefined,
		mandatory: false,
		decisionPoint: false
	};

	const form = await superValidate(defaultData, zod4(taskTemplateFormSchema), {
		errors: false
	});

	return {
		form,
		partners,
		campaignProfiles,
		serviceCategories
	};
};

export const actions = {
	default: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const form = await superValidate(event, zod4(taskTemplateFormSchema));

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

			// Check key uniqueness for the given partner
			const isUnique = await repo.checkKeyUniqueness(form.data.key, form.data.partnerEntityId);
			if (!isUnique) {
				return fail(400, {
					form,
					message: 'A template with this key already exists for this partner. Please use a different key.'
				});
			}

			// Override type to campaign_onboarding
			await repo.create({
				...form.data,
				type: 'campaign_onboarding'
			}, currentEntityId);

			// Redirect back to the main page
			redirect(302, '/team/ops/campaign-onboarding');
		} catch (error) {
			// Let redirects pass through
			if (error?.status === 302) {
				throw error;
			}

			console.error('Error creating campaign onboarding template:', error);
			return fail(500, {
				form,
				message: 'Failed to create template. Please try again.'
			});
		}
	}
};
;null as any as Actions;