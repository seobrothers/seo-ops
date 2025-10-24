import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { taskTemplateFormSchema } from '$lib/forms/task-template/task-template-schema';
import { TaskTemplatesRepository } from '$lib/server/data/d1-task-templates-repository';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';
import { ServiceCategoriesRepository } from '$lib/server/data/d1-service-categories-repository';
import { fail, error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
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

	const form = await superValidate({
		title: template.title,
		description: template.description || undefined,
		key: template.key,
		primaryParticipant: template.primaryParticipant,
		grouping: template.grouping,
		estTimeMinutes: template.estTimeMinutes || undefined,
		sopUrl: template.sopUrl || undefined,
		sopId: template.sopId || undefined,
		partnerEntityId: template.partnerEntityId || undefined,
		campaignProfileId: template.campaignProfileId || undefined,
		serviceCategoryId: template.serviceCategoryId || undefined,
		mandatory: template.mandatory,
		decisionPoint: template.decisionPoint
	}, zod4(taskTemplateFormSchema), {
		errors: false
	});

	return {
		form,
		partners,
		campaignProfiles,
		serviceCategories,
		templateId,
		template
	};
};

export const actions: Actions = {
	default: async (event) => {
		if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
			return fail(403, { message: 'Insufficient permissions' });
		}

		const templateId = parseInt(event.params.id);
		if (isNaN(templateId)) {
			return fail(400, { message: 'Invalid template ID' });
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

			// Check key uniqueness for the given partner (excluding current template)
			const isUnique = await repo.checkKeyUniqueness(form.data.key, form.data.partnerEntityId, templateId);
			if (!isUnique) {
				return fail(400, {
					form,
					message: 'A template with this key already exists for this partner. Please use a different key.'
				});
			}

			// Don't allow changing the type - it should remain campaign_onboarding
			const { type, ...updateData } = form.data;

			await repo.update(templateId, updateData, currentEntityId);

			// Redirect back to the main page
			redirect(302, '/team/ops/campaign-onboarding');
		} catch (error) {
			// Let redirects pass through
			if (error?.status === 302) {
				throw error;
			}

			console.error('Error updating campaign onboarding template:', error);
			return fail(500, {
				form,
				message: 'Failed to update template. Please try again.'
			});
		}
	}
};
