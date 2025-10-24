// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { packageSchema } from '$lib/forms/package/package-schema';
import { PackagesRepository } from '$lib/server/data/d1-packages-repository';
import { PartnersRepository } from '$lib/server/data/d1-partners-repository';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';
import { fail, redirect, error } from '@sveltejs/kit';

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (!event.locals.permissions.has('portal:service-item:edit') && !event.locals.permissions.has('portal:campaign:edit')) {
		throw error(403, 'Forbidden');
	}

	const partnersRepo = new PartnersRepository(event);
	const campaignProfilesRepo = new CampaignProfilesRepository(event);
	const packagesRepo = new PackagesRepository(event);
	
	// Check if this is a duplication request
	const duplicateId = event.url.searchParams.get('duplicate');
	let sourcePackage = null;
	let isDuplicating = false;
	
	if (duplicateId) {
		try {
			const sourceId = parseInt(duplicateId);
			if (!isNaN(sourceId)) {
				sourcePackage = await packagesRepo.getFullPackageForDuplication(sourceId);
				isDuplicating = true;
			}
		} catch (err) {
			console.error('Error fetching package for duplication:', err);
			// Continue with regular creation if duplicate fails
		}
	}
	
	const [allPartners, allCampaignProfiles] = await Promise.all([
		partnersRepo.getAll(),
		campaignProfilesRepo.getAll()
	]);

	// Filter to active partners and format for EntityPicker
	const partners = allPartners
		.filter(partner => partner.status === 'active')
		.map(partner => ({ id: partner.id, name: partner.name }));

	// Format campaign profiles for EntityPicker
	const campaignProfiles = allCampaignProfiles
		.map(profile => ({ id: profile.id, name: profile.name }));

	// Prepare form data - provide defaults to prevent initial validation errors
	let formData = {};
	if (isDuplicating && sourcePackage) {
		formData = {
			name: `Copy of ${sourcePackage.name}`,
			partnerEntityId: sourcePackage.partnerEntityId,
			monthlyPriceCents: sourcePackage.monthlyPriceCents,
			currency: sourcePackage.currency || 'USD',
			relatedCampaignProfileId: sourcePackage.relatedCampaignProfileId,
			description: sourcePackage.description,
			type: sourcePackage.type
		};
	} else {
		// For new packages, provide minimal defaults to prevent validation errors on load
		formData = {
			name: '',
			currency: 'USD',
			relatedCampaignProfileId: allCampaignProfiles.length > 0 ? allCampaignProfiles[0].id : undefined
		};
	}

	const form = await superValidate(formData, zod4(packageSchema), {
		errors: false  // Don't include validation errors in the initial form
	});
	
	return {
		form,
		partners,
		campaignProfiles,
		isDuplicating,
		sourcePackageName: sourcePackage?.name || null,
		sourcePackageId: duplicateId ? parseInt(duplicateId) : null
	};
};

export const actions = {
	create: async (event: import('./$types').RequestEvent) => {
		const form = await superValidate(event, zod4(packageSchema));
		
		if (!form.valid) {
			return fail(400, { form });
		}
		
		try {
			const repo = new PackagesRepository(event);
			const newPackage = await repo.create({
				name: form.data.name,
				partnerEntityId: form.data.partnerEntityId ?? null,
				monthlyPriceCents: form.data.monthlyPriceCents ?? null,
				currency: form.data.currency ?? 'USD',
				relatedCampaignProfileId: form.data.relatedCampaignProfileId,
				description: form.data.description ?? null,
				type: form.data.type ?? null,
				isActive: true
			});
			
			// Return success with the new package data
			return { form, newPackage };
		} catch (error) {
			console.error('Error creating package:', error);
			return fail(500, { 
				form,
				error: 'Failed to create package. Please try again.'
			});
		}
	},

	duplicate: async (event: import('./$types').RequestEvent) => {
		// Parse the form data to get sourcePackageId before superValidate
		const formData = await event.request.formData();
		const sourcePackageId = formData.get('sourcePackageId') as string;
		
		// Now validate with superValidate using the already parsed formData
		const form = await superValidate(formData, zod4(packageSchema));
		
		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			if (!sourcePackageId) {
				return fail(400, { 
					form,
					error: 'Source package ID is required for duplication.'
				});
			}

			const repo = new PackagesRepository(event);
			const newPackage = await repo.duplicatePackage(parseInt(sourcePackageId), {
				name: form.data.name,
				partnerEntityId: form.data.partnerEntityId ?? null,
				monthlyPriceCents: form.data.monthlyPriceCents ?? null,
				currency: form.data.currency ?? 'USD',
				relatedCampaignProfileId: form.data.relatedCampaignProfileId,
				description: form.data.description ?? null,
				type: form.data.type ?? null
			});
			
			// Return success with the new package data
			return { form, newPackage };
		} catch (error) {
			console.error('Error duplicating package:', error);
			return fail(500, { 
				form,
				error: 'Failed to duplicate package. Please try again.'
			});
		}
	}
};;null as any as Actions;