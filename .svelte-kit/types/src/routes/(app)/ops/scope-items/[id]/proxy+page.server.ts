// @ts-nocheck
import type { PageServerLoad, Actions } from './$types';
import { NotesRepository } from '$lib/server/data/d1-notes-repository';
import { EmployeeRepository } from '$lib/server/data/d1-employee-repository';
import { notes, RELATED_TABLES, serviceItems, entities, serviceCategories } from '$lib/server/db/d1-schema';
import { getActivityForItem, createActivity } from '$lib/server/data/d1-activities';
import { ACTIVITY } from '$lib/activity-types';
import { and, eq, sql } from 'drizzle-orm';
import { fail, error, redirect } from '@sveltejs/kit';
import { z } from 'zod/v4';

const updateFieldSchema = z.object({
	field: z.string(),
	value: z.string().optional()
});

const addNoteSchema = z.object({
	content: z.string().trim().min(1, 'Note content is required'),
});

const updateNoteSchema = z.object({
	noteId: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().optional()),
	version: z.preprocess((val) => (val === '' ? undefined : Number(val)), z.number().optional()),
	noteType: z.enum(['template']),
	content: z.string().trim(),
});

const deleteNoteSchema = z.object({
	noteId: z.preprocess((val) => Number(val), z.number()),
});

const updateTimeEstimateSchema = z.object({
	hours: z.preprocess((val) => Number(val) || 0, z.number().min(0).max(999)),
	minutes: z.preprocess((val) => Number(val) || 0, z.number().min(0).max(59))
});

const updateServiceDetailsSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	serviceCategoryId: z.preprocess((val) => val === '' || val === null ? null : Number(val), z.number().nullable().optional()),
	serviceLabel: z.string().nullable().optional(),
	serviceScope: z.enum(['campaign', 'partner', 'internal'])
});

const updateDeliveryProcessSchema = z.object({
	showWork: z.preprocess((val) => val === 'on' || val === true || val === 'true', z.boolean()),
	workProofType: z.string().nullable().optional(),
	workProofExample: z.string().nullable().optional(),
	sopUrl: z.string().nullable().optional()
});

const updatePricingInfoSchema = z.object({
	uom: z.preprocess(
		(val) => val === '' || val === null ? null : val,
		z.enum(['page', 'blog_post', 'guest_post', 'referring_domain', 'hour', 'cycle', 'outcome']).nullable().optional()
	),
	minPricingUsd: z.preprocess((val) => val === '' || val === null ? null : Number(val), z.number().nullable().optional()),
	estCogsUsd: z.preprocess((val) => val === '' || val === null ? null : Number(val), z.number().nullable().optional()),
	estTimeHours: z.preprocess((val) => Number(val) || 0, z.number().min(0).max(999)),
	estTimeMinutes: z.preprocess((val) => Number(val) || 0, z.number().min(0).max(59))
});

const updateSalesRelatedDetailsSchema = z.object({
	proposalMode: z.enum(['recurring', 'one_time', 'both', 'neither']),
	packageDisplay: z.string().nullable().optional(),
	mcpDisplay: z.string().nullable().optional(),
	recommendedPrice: z.preprocess((val) => val === '' || val === null ? null : Number(val), z.number().nullable().optional()),
	recommendedPriceCurrency: z.string().nullable().optional()
});

export const load = async (event: Parameters<PageServerLoad>[0]) => {
	if (!event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	const itemId = parseInt(event.params.id);
	
	if (isNaN(itemId)) {
		throw error(400, 'Invalid service item ID');
	}

	const employeeRepo = new EmployeeRepository(event);

	// Get service item, activities, employees, and service categories in parallel
	const [serviceItem, activities, employees, allServiceCategories] = await Promise.all([
		event.locals.db
			.select({
				id: serviceItems.id,
				name: serviceItems.name,
				description: serviceItems.description,
				serviceCategory: serviceItems.serviceCategory,
				serviceCategoryId: serviceItems.serviceCategoryId,
				serviceLabel: serviceItems.serviceLabel,
				type: serviceItems.type,
				minPricingUsdCents: serviceItems.minPricingUsdCents,
				estCogsUsdCents: serviceItems.estCogsUsdCents,
				estTimeMinutes: serviceItems.estTimeMinutes,
				recommendedPriceCents: serviceItems.recommendedPriceCents,
				recommendedPriceCurrency: serviceItems.recommendedPriceCurrency,
				isActive: serviceItems.isActive,
				createdAt: serviceItems.createdAt,
				updatedAt: serviceItems.updatedAt,
				createdBy: serviceItems.createdBy,
				updatedBy: serviceItems.updatedBy,
				sopUrl: serviceItems.sopUrl,
				partnerEntityId: serviceItems.partnerEntityId,
				partnerName: entities.name,
				partnerAvatarUrl: entities.avatarUrl,
				serviceScope: serviceItems.serviceScope,
				// Delivery process fields
				showWork: serviceItems.showWork,
				workProofType: serviceItems.workProofType,
				workProofExample: serviceItems.workProofExample,
				// Sales related fields
				proposalMode: serviceItems.proposalMode,
				packageDisplay: serviceItems.packageDisplay,
				mcpDisplay: serviceItems.mcpDisplay,
				uom: serviceItems.uom,
				// Join for created by and updated by entities
				createdByName: sql<string>`created_by_entity.name`,
				updatedByName: sql<string>`updated_by_entity.name`
			})
			.from(serviceItems)
			.leftJoin(entities, eq(serviceItems.partnerEntityId, entities.id))
			.leftJoin(sql`entities as created_by_entity`, sql`${serviceItems.createdBy} = created_by_entity.id`)
			.leftJoin(sql`entities as updated_by_entity`, sql`${serviceItems.updatedBy} = updated_by_entity.id`)
			.where(eq(serviceItems.id, itemId))
			.limit(1),
		getActivityForItem(event.locals.db, 'service_items', itemId),
		employeeRepo.getEmployeeList(),
		// Get all service categories for dropdown
		event.locals.db
			.select({
				id: serviceCategories.id,
				key: serviceCategories.key,
				displayName: serviceCategories.displayName
			})
			.from(serviceCategories)
			.orderBy(serviceCategories.displayName)
	]);
	
	if (!serviceItem || serviceItem.length === 0) {
		throw error(404, 'Service item not found');
	}

	const item = serviceItem[0];

	// Create employee lookup map
	const employeeMap = new Map(employees.map(emp => [emp.id, emp.name]));

	// Get notes for this service item
	const itemNotes = await event.locals.db
		.select()
		.from(notes)
		.where(
			and(
				eq(notes.entityId, itemId),
				eq(notes.entityType, 'service_item'),
				eq(notes.isCurrent, true)
			)
		)
		.orderBy(notes.createdAt);

	return {
		serviceItem: item,
		serviceCategories: allServiceCategories,
		notes: itemNotes.map(note => ({
			id: note.id,
			content: note.content || '',
			createdAt: note.createdAt,
			updatedAt: note.updatedAt,
			createdBy: employeeMap.get(note.createdByEntityId) || 'Team Member',
			versionNumber: note.versionNumber
		})),
		activities,
		canEdit: event.locals.permissions.has('portal:employee:edit')
	};
};

export const actions = {
	updateField: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const itemId = parseInt(event.params.id);
		
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}

		try {
			const formData = await event.request.formData();
			const rawData = Object.fromEntries(formData);
			const { field, value } = updateFieldSchema.parse(rawData);
			
			console.log(`Updating service item field: ${field} = ${value}`);

			const currentEntityId = event.locals.employee?.id;
			if (!currentEntityId) {
				return fail(403, { error: 'User entity ID not available' });
			}
			
			const item = await event.locals.db
				.select()
				.from(serviceItems)
				.where(eq(serviceItems.id, itemId))
				.limit(1);
			
			if (!item || item.length === 0) {
				return fail(404, { error: 'Service item not found' });
			}

			// Get old value for activity logging
			const oldValue = item[0][field as keyof typeof item[0]] || '';
			let newValue = value || '';
			let processedValue: any = value || null;

			// Handle special field processing
			if (field === 'serviceLabel') {
				// Handle service label field - just use the value directly
				processedValue = value || null;
			} else if (field === 'partnerEntityId') {
				// Check for duplicate service_label + partner combination
				if (value && value !== '') {
					const existingItem = await event.locals.db
						.select()
						.from(serviceItems)
						.where(
							and(
								eq(serviceItems.serviceLabel, item[0].serviceLabel),
								eq(serviceItems.partnerEntityId, parseInt(value)),
								// Exclude current item
								sql`${serviceItems.id} != ${itemId}`
							)
						)
						.limit(1);

					if (existingItem.length > 0) {
						const serviceLabel = item[0].serviceLabel?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'this service label';
						const partner = await event.locals.db
							.select({ name: entities.name })
							.from(entities)
							.where(eq(entities.id, parseInt(value)))
							.limit(1);
						const partnerName = partner[0]?.name || 'this partner';
						
						return fail(400, { 
							error: `A service item with ${serviceLabel} already exists for ${partnerName}. Only one service item template per service label + partner combination is allowed.`,
							toast: {
								type: 'error',
								message: `Duplicate service item detected for ${partnerName} with ${serviceLabel}`
							}
						});
					}
				}
				
				processedValue = value && value !== '' ? parseInt(value) : null;
			} else if (field === 'sopUrl') {
				// Handle SOP URL field
				processedValue = value && value !== '' ? value : null;
			} else if (field === 'isActive') {
				// Convert string boolean to actual boolean
				processedValue = value === 'true';
				newValue = processedValue ? 'Active' : 'Inactive';
			} else if (field === 'minPricingUsdCents' || field === 'estCogsUsdCents') {
				// Convert dollars to cents
				if (value && !isNaN(parseFloat(value))) {
					processedValue = Math.round(parseFloat(value) * 100);
					newValue = `$${parseFloat(value).toFixed(2)}`;
				}
			} else if (field === 'estTimeMinutes') {
				// Handle time estimate (comes as total minutes from hours + minutes input)
				if (value && !isNaN(parseInt(value))) {
					processedValue = parseInt(value);
					const hours = Math.floor(processedValue / 60);
					const minutes = processedValue % 60;
					newValue = hours > 0 && minutes > 0 ? `${hours}H ${minutes}M` : 
					          hours > 0 ? `${hours}H` : 
					          minutes > 0 ? `${minutes}M` : '0M';
				}
			} else if (field === 'recommendedPriceCents') {
				// Handle recommended price with currency
				if (value && !isNaN(parseFloat(value))) {
					processedValue = Math.round(parseFloat(value) * 100);
					newValue = `$${parseFloat(value).toFixed(2)}`;
				}
				// Also update currency if provided
				const currency = rawData.currency as string;
				if (currency) {
					// We'll update both fields in the same transaction
				}
			}

			// Update the specific field(s)
			const updateData: any = {};
			updateData[field] = processedValue;
			updateData.updatedAt = new Date().toISOString();
			updateData.updatedBy = currentEntityId;

			// Handle recommended price currency update
			if (field === 'recommendedPriceCents' && rawData.currency) {
				updateData.recommendedPriceCurrency = rawData.currency;
			}

			await event.locals.db
				.update(serviceItems)
				.set(updateData)
				.where(eq(serviceItems.id, itemId));

			// Create activity log
			const fieldDisplayName = field
				.replace(/([A-Z])/g, ' $1')
				.replace(/^./, str => str.toUpperCase());
			
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.updated_service_item_field,
				RELATED_TABLES.service_items,
				itemId,
				`${fieldDisplayName} updated from "${oldValue.toString().substring(0, 50)}${oldValue.toString().length > 50 ? '...' : ''}" to "${newValue.toString().substring(0, 50)}${newValue.toString().length > 50 ? '...' : ''}"`
			);

			return { success: true };
		} catch (error) {
			console.error('Error updating field:', error);
			return fail(500, { error: 'Failed to update field' });
		}
	},

	addNote: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}

		if (!event.locals.employee?.id) {
			return fail(403, { error: 'User entity ID not available' });
		}

		const formData = await event.request.formData();

		try {
			const { content } = addNoteSchema.parse(Object.fromEntries(formData));
			
			const notesRepo = new NotesRepository(event);
			
			await notesRepo.save(null, null, {
				noteType: 'template',
				content,
				entityType: 'service_item',
				entityId: itemId,
				createdByEntityId: event.locals.employee.id,
			});

			// Create activity log
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.added_service_item_note,
				RELATED_TABLES.service_items,
				itemId,
				`Note added: "${content.length > 50 ? content.substring(0, 50) + '...' : content}"`
			);

			return { success: true };
		} catch (error) {
			console.error('Failed to add note:', error);
			return fail(400, { error: 'Failed to add note' });
		}
	},

	updateNote: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}

		if (!event.locals.employee?.id) {
			return fail(403, { error: 'User entity ID not available' });
		}

		const formData = await event.request.formData();

		try {
			const { noteId, version, noteType, content } = updateNoteSchema.parse(
				Object.fromEntries(formData)
			);

			// Get current note for activity log before updating
			const currentNote = await event.locals.db
				.select()
				.from(notes)
				.where(eq(notes.id, noteId))
				.limit(1);

			const oldText = currentNote[0]?.content ? (currentNote[0].content.length > 50 ? currentNote[0].content.substring(0, 50) + '...' : currentNote[0].content) : 'Empty';
			const newText = content.length > 50 ? content.substring(0, 50) + '...' : content;

			// Simple in-place update
			await event.locals.db
				.update(notes)
				.set({
					content,
					updatedAt: new Date().toISOString()
				})
				.where(eq(notes.id, noteId));

			// Create activity log
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.updated_service_item_note,
				RELATED_TABLES.service_items,
				itemId,
				`Note updated from "${oldText}" to "${newText}"`
			);

			return { success: true };
		} catch (error) {
			console.error('Failed to update note:', error);
			return fail(400, { error: 'Failed to update note' });
		}
	},

	deleteNote: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}

		const formData = await event.request.formData();

		try {
			const { noteId } = deleteNoteSchema.parse(Object.fromEntries(formData));
			
			// Get note content for activity log before deleting
			const noteToDelete = await event.locals.db
				.select()
				.from(notes)
				.where(eq(notes.id, noteId))
				.limit(1);

			const noteContent = noteToDelete[0]?.content || '';
			const noteText = noteContent.length > 50 ? noteContent.substring(0, 50) + '...' : noteContent;

			// Mark note as non-current (soft delete)
			await event.locals.db
				.update(notes)
				.set({ 
					isCurrent: false,
					updatedAt: new Date().toISOString()
				})
				.where(eq(notes.id, noteId));

			// Create activity log
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.deleted_service_item_note,
				RELATED_TABLES.service_items,
				itemId,
				`Note deleted: "${noteText}"`
			);

			// Redirect back to the clean URL
			throw redirect(302, `/team/ops/service-catalog/${itemId}`);
		} catch (error) {
			if (error.status === 302) {
				// Re-throw redirect
				throw error;
			}
			console.error('Failed to delete note:', error);
			return fail(400, { error: 'Failed to delete note' });
		}
	},

	updateTimeEstimate: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}

		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, { error: 'User entity ID not available' });
		}

		try {
			const formData = await event.request.formData();
			const rawData = Object.fromEntries(formData);
			const { hours, minutes } = updateTimeEstimateSchema.parse(rawData);
			
			// Convert hours and minutes to total minutes
			const totalMinutes = hours * 60 + minutes;
			
			// Get the current item for activity logging
			const currentItem = await event.locals.db
				.select()
				.from(serviceItems)
				.where(eq(serviceItems.id, itemId))
				.limit(1);

			if (!currentItem || currentItem.length === 0) {
				return fail(404, { error: 'Service item not found' });
			}

			const oldTimeEstimate = currentItem[0].estTimeMinutes || 0;
			
			// Update the time estimate
			await event.locals.db
				.update(serviceItems)
				.set({
					estTimeMinutes: totalMinutes,
					updatedAt: new Date().toISOString(),
					updatedBy: currentEntityId
				})
				.where(eq(serviceItems.id, itemId));

			// Format time for activity log
			const formatTime = (mins: number) => {
				if (mins <= 0) return '0M';
				const h = Math.floor(mins / 60);
				const m = mins % 60;
				return h > 0 && m > 0 ? `${h}H ${m}M` : h > 0 ? `${h}H` : `${m}M`;
			};

			// Create activity log
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.updated_service_item_field,
				RELATED_TABLES.service_items,
				itemId,
				`Time Estimate updated from "${formatTime(oldTimeEstimate)}" to "${formatTime(totalMinutes)}"`
			);

			return { success: true };
		} catch (error) {
			console.error('Error updating time estimate:', error);
			return fail(500, { error: 'Failed to update time estimate' });
		}
	},

	updateServiceDetails: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}

		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, { error: 'User entity ID not available' });
		}

		try {
			const formData = await event.request.formData();
			const rawData = Object.fromEntries(formData);
			const { name, serviceCategoryId, serviceLabel, serviceScope } = updateServiceDetailsSchema.parse(rawData);

			// Get current item for activity logging
			const currentItem = await event.locals.db
				.select()
				.from(serviceItems)
				.where(eq(serviceItems.id, itemId))
				.limit(1);

			if (!currentItem || currentItem.length === 0) {
				return fail(404, { error: 'Service item not found' });
			}

			const oldItem = currentItem[0];

			// Check for duplicate service label if it's being changed (scope items must have unique labels)
			if (serviceLabel && serviceLabel !== oldItem.serviceLabel) {
				const existingItem = await event.locals.db
					.select({ id: serviceItems.id })
					.from(serviceItems)
					.where(eq(serviceItems.serviceLabel, serviceLabel))
					.limit(1);

				if (existingItem.length > 0) {
					const formattedLabel = serviceLabel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
					return fail(400, {
						error: `A scope item with the label "${formattedLabel}" already exists. Service labels must be unique.`
					});
				}
			}

			// Update the service details
			await event.locals.db
				.update(serviceItems)
				.set({
					name: name,
					serviceCategoryId: serviceCategoryId || null,
					serviceLabel: serviceLabel || null,
					serviceScope: serviceScope,
					updatedAt: new Date().toISOString(),
					updatedBy: currentEntityId
				})
				.where(eq(serviceItems.id, itemId));

			// Create activity log for the changes
			const changes = [];
			const formatServiceScope = (scope: string | null) => {
				const scopeMap = {
					'campaign': 'Campaign',
					'partner': 'Partner',
					'internal': 'Internal'
				};
				return scope ? (scopeMap[scope] || scope) : 'Campaign';
			};

			if (oldItem.name !== name) changes.push(`Name: "${oldItem.name}" → "${name}"`);
			if (oldItem.serviceCategoryId !== serviceCategoryId) changes.push(`Category ID: "${oldItem.serviceCategoryId || 'None'}" → "${serviceCategoryId || 'None'}"`);
			if (oldItem.serviceLabel !== serviceLabel) changes.push(`Label: "${oldItem.serviceLabel || 'None'}" → "${serviceLabel || 'None'}"`);
			if (oldItem.serviceScope !== serviceScope) changes.push(`Service Scope: "${formatServiceScope(oldItem.serviceScope)}" → "${formatServiceScope(serviceScope)}"`);

			if (changes.length > 0) {
				await createActivity(
					event.locals.db,
					event.locals.user?.id,
					null,
					ACTIVITY.updated_service_item_field,
					RELATED_TABLES.service_items,
					itemId,
					`Service details updated: ${changes.join(', ')}`
				);
			}

			return { success: true };
		} catch (error) {
			console.error('Error updating service details:', error);
			return fail(500, { error: 'Failed to update service details' });
		}
	},

	updateDeliveryProcess: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}
		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}
		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, { error: 'User entity ID not available' });
		}
		try {
			const formData = await event.request.formData();
			const rawData = Object.fromEntries(formData);
			const { showWork, workProofType, workProofExample, sopUrl } = updateDeliveryProcessSchema.parse(rawData);

			// Get current item for activity logging
			const currentItem = await event.locals.db
				.select()
				.from(serviceItems)
				.where(eq(serviceItems.id, itemId))
				.limit(1);
			if (!currentItem || currentItem.length === 0) {
				return fail(404, { error: 'Service item not found' });
			}
			const oldItem = currentItem[0];

			// Update the delivery process details
			await event.locals.db
				.update(serviceItems)
				.set({
					showWork: showWork,
					workProofType: workProofType || null,
					workProofExample: workProofExample || null,
					sopUrl: sopUrl || null,
					updatedAt: new Date().toISOString(),
					updatedBy: currentEntityId
				})
				.where(eq(serviceItems.id, itemId));

			// Create activity log for the changes
			const changes = [];
			if (oldItem.showWork !== showWork) changes.push(`Show Work: "${oldItem.showWork ? 'Yes' : 'No'}" → "${showWork ? 'Yes' : 'No'}"`);
			if (oldItem.workProofType !== workProofType) changes.push(`Work Proof Type: "${oldItem.workProofType || 'None'}" → "${workProofType || 'None'}"`);
			if (oldItem.workProofExample !== workProofExample) changes.push(`Work Proof Example: "${oldItem.workProofExample || 'None'}" → "${workProofExample || 'None'}"`);
			if (oldItem.sopUrl !== sopUrl) changes.push(`SOP URL: "${oldItem.sopUrl || 'None'}" → "${sopUrl || 'None'}"`);

			if (changes.length > 0) {
				await createActivity(
					event.locals.db,
					event.locals.user?.id,
					null,
					ACTIVITY.updated_service_item_field,
					RELATED_TABLES.service_items,
					itemId,
					`Delivery process details updated: ${changes.join(', ')}`
				);
			}

			return { success: true };
		} catch (error) {
			console.error('Error updating delivery process details:', error);
			return fail(500, { error: 'Failed to update delivery process details' });
		}
	},

	updatePricingInfo: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}
		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}
		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, { error: 'User entity ID not available' });
		}
		try {
			const formData = await event.request.formData();
			const rawData = Object.fromEntries(formData);
			const { uom, minPricingUsd, estCogsUsd, estTimeHours, estTimeMinutes } = updatePricingInfoSchema.parse(rawData);

			// Get current item for activity logging
			const currentItem = await event.locals.db
				.select()
				.from(serviceItems)
				.where(eq(serviceItems.id, itemId))
				.limit(1);
			if (!currentItem || currentItem.length === 0) {
				return fail(404, { error: 'Service item not found' });
			}
			const oldItem = currentItem[0];

			// Convert dollars to cents for storage
			const minPricingUsdCents = minPricingUsd ? Math.round(minPricingUsd * 100) : null;
			const estCogsUsdCents = estCogsUsd ? Math.round(estCogsUsd * 100) : null;
			const totalMinutes = (estTimeHours * 60) + estTimeMinutes;

			// Update the pricing information
			await event.locals.db
				.update(serviceItems)
				.set({
					uom: uom || null,
					minPricingUsdCents: minPricingUsdCents,
					estCogsUsdCents: estCogsUsdCents,
					estTimeMinutes: totalMinutes,
					updatedAt: new Date().toISOString(),
					updatedBy: currentEntityId
				})
				.where(eq(serviceItems.id, itemId));

			// Create activity log for the changes
			const changes = [];
			const formatPrice = (cents: number | null, currency: string = 'USD') => {
				if (!cents) return 'None';
				return `$${(cents / 100).toFixed(2)} ${currency}`;
			};
			const formatTime = (mins: number) => {
				if (mins <= 0) return '0M';
				const h = Math.floor(mins / 60);
				const m = mins % 60;
				return h > 0 && m > 0 ? `${h}H ${m}M` : h > 0 ? `${h}H` : `${m}M`;
			};
			const formatUom = (uomValue: string | null) => {
				const uomMap = {
					'page': 'Page',
					'blog_post': 'Blog Post',
					'guest_post': 'Guest Post',
					'referring_domain': 'Referring Domain',
					'hour': 'Hour',
					'cycle': 'Cycle',
					'outcome': 'Outcome'
				};
				return uomValue ? (uomMap[uomValue] || uomValue) : 'None';
			};

			if (oldItem.uom !== uom) {
				changes.push(`Unit of Measure: "${formatUom(oldItem.uom)}" → "${formatUom(uom)}"`);
			}
			if (oldItem.minPricingUsdCents !== minPricingUsdCents) {
				changes.push(`Min Pricing: "${formatPrice(oldItem.minPricingUsdCents)}" → "${formatPrice(minPricingUsdCents)}"`);
			}
			if (oldItem.estCogsUsdCents !== estCogsUsdCents) {
				changes.push(`Est COGS: "${formatPrice(oldItem.estCogsUsdCents)}" → "${formatPrice(estCogsUsdCents)}"`);
			}
			if (oldItem.estTimeMinutes !== totalMinutes) {
				changes.push(`Est Time: "${formatTime(oldItem.estTimeMinutes || 0)}" → "${formatTime(totalMinutes)}"`);
			}

			if (changes.length > 0) {
				await createActivity(
					event.locals.db,
					event.locals.user?.id,
					null,
					ACTIVITY.updated_service_item_field,
					RELATED_TABLES.service_items,
					itemId,
					`Pricing information updated: ${changes.join(', ')}`
				);
			}

			return { success: true };
		} catch (error) {
			console.error('Error updating pricing information:', error);
			return fail(500, { error: 'Failed to update pricing information' });
		}
	},

	updateSalesRelatedDetails: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}
		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}
		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, { error: 'User entity ID not available' });
		}
		try {
			const formData = await event.request.formData();
			const rawData = Object.fromEntries(formData);
			const { proposalMode, packageDisplay, mcpDisplay, recommendedPrice, recommendedPriceCurrency } = updateSalesRelatedDetailsSchema.parse(rawData);

			// Get current item for activity logging
			const currentItem = await event.locals.db
				.select()
				.from(serviceItems)
				.where(eq(serviceItems.id, itemId))
				.limit(1);
			if (!currentItem || currentItem.length === 0) {
				return fail(404, { error: 'Service item not found' });
			}
			const oldItem = currentItem[0];

			// Convert dollars to cents for storage
			const recommendedPriceCents = recommendedPrice ? Math.round(recommendedPrice * 100) : null;

			// Update the sales related details
			await event.locals.db
				.update(serviceItems)
				.set({
					proposalMode: proposalMode,
					packageDisplay: packageDisplay || null,
					mcpDisplay: mcpDisplay || null,
					recommendedPriceCents: recommendedPriceCents,
					recommendedPriceCurrency: recommendedPriceCurrency || null,
					updatedAt: new Date().toISOString(),
					updatedBy: currentEntityId
				})
				.where(eq(serviceItems.id, itemId));

			// Create activity log for the changes
			const changes = [];
			const formatProposalMode = (mode: string | null) => {
				const modeMap = {
					'recurring': 'Recurring',
					'one_time': 'One-Time',
					'both': 'Both One-Time and Recurring',
					'neither': 'Not Sellable'
				};
				return mode ? (modeMap[mode] || mode) : 'None';
			};
			const formatPrice = (cents: number | null, currency: string = 'USD') => {
				if (!cents) return 'None';
				return `$${(cents / 100).toFixed(2)} ${currency}`;
			};

			if (oldItem.proposalMode !== proposalMode) {
				changes.push(`Sellable As: "${formatProposalMode(oldItem.proposalMode)}" → "${formatProposalMode(proposalMode)}"`);
			}
			if (oldItem.packageDisplay !== packageDisplay) {
				changes.push(`Proposal Display: "${oldItem.packageDisplay || 'None'}" → "${packageDisplay || 'None'}"`);
			}
			if (oldItem.mcpDisplay !== mcpDisplay) {
				changes.push(`MCP Display: "${oldItem.mcpDisplay || 'None'}" → "${mcpDisplay || 'None'}"`);
			}
			if (oldItem.recommendedPriceCents !== recommendedPriceCents || oldItem.recommendedPriceCurrency !== recommendedPriceCurrency) {
				changes.push(`Recommended Price: "${formatPrice(oldItem.recommendedPriceCents, oldItem.recommendedPriceCurrency)}" → "${formatPrice(recommendedPriceCents, recommendedPriceCurrency || 'USD')}"`);
			}

			if (changes.length > 0) {
				await createActivity(
					event.locals.db,
					event.locals.user?.id,
					null,
					ACTIVITY.updated_service_item_field,
					RELATED_TABLES.service_items,
					itemId,
					`Sales related details updated: ${changes.join(', ')}`
				);
			}

			return { success: true };
		} catch (error) {
			console.error('Error updating sales related details:', error);
			return fail(500, { error: 'Failed to update sales related details' });
		}
	},

	deleteItem: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}

		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, { error: 'User entity ID not available' });
		}

		try {
			// Get item name for activity log
			const item = await event.locals.db
				.select({ name: serviceItems.name })
				.from(serviceItems)
				.where(eq(serviceItems.id, itemId))
				.limit(1);

			if (!item || item.length === 0) {
				return fail(404, { error: 'Service item not found' });
			}

			// Deactivate the item
			await event.locals.db
				.update(serviceItems)
				.set({
					isActive: false,
					updatedAt: new Date().toISOString(),
					updatedBy: currentEntityId
				})
				.where(eq(serviceItems.id, itemId));

			// Create activity log
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.updated_service_item_field,
				RELATED_TABLES.service_items,
				itemId,
				`Scope item "${item[0].name}" deactivated`
			);

			// Redirect back to scope items list
			throw redirect(302, '/team/ops/scope-items');
		} catch (error) {
			if (error.status === 302) {
				throw error;
			}
			console.error('Error deleting service item:', error);
			return fail(500, { error: 'Failed to delete service item' });
		}
	},

	reactivateItem: async (event: import('./$types').RequestEvent) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const itemId = parseInt(event.params.id);
		if (isNaN(itemId)) {
			return fail(400, { error: 'Invalid service item ID' });
		}

		const currentEntityId = event.locals.employee?.id;
		if (!currentEntityId) {
			return fail(403, { error: 'User entity ID not available' });
		}

		try {
			// Get item name for activity log
			const item = await event.locals.db
				.select({ name: serviceItems.name })
				.from(serviceItems)
				.where(eq(serviceItems.id, itemId))
				.limit(1);

			if (!item || item.length === 0) {
				return fail(404, { error: 'Service item not found' });
			}

			// Reactivate the item
			await event.locals.db
				.update(serviceItems)
				.set({
					isActive: true,
					updatedAt: new Date().toISOString(),
					updatedBy: currentEntityId
				})
				.where(eq(serviceItems.id, itemId));

			// Create activity log
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.updated_service_item_field,
				RELATED_TABLES.service_items,
				itemId,
				`Scope item "${item[0].name}" reactivated`
			);

			return { success: true };
		} catch (error) {
			console.error('Error reactivating service item:', error);
			return fail(500, { error: 'Failed to reactivate service item' });
		}
	}
};;null as any as Actions;