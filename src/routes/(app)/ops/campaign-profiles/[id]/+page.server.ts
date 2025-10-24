import type { PageServerLoad, Actions } from './$types';
import { CampaignProfilesRepository } from '$lib/server/data/d1-campaign-profiles-repository';
import { NotesRepository } from '$lib/server/data/d1-notes-repository';
import { EmployeeRepository } from '$lib/server/data/d1-employee-repository';
import { notes, RELATED_TABLES, campaignProfiles } from '$lib/server/db/d1-schema';
import { getActivityForItem, createActivity } from '$lib/server/data/d1-activities';
import { ACTIVITY } from '$lib/activity-types';
import { and, eq } from 'drizzle-orm';
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

export const load: PageServerLoad = async (event) => {
	if (!event.locals.permissions.has('portal:employee:edit')) {
		throw error(403, 'Forbidden');
	}

	const profileId = parseInt(event.params.id);
	
	if (isNaN(profileId)) {
		throw error(400, 'Invalid campaign profile ID');
	}

	const repo = new CampaignProfilesRepository(event);
	const employeeRepo = new EmployeeRepository(event);
	
	// Get profile, activities, employees, and notes in parallel
	const [profile, activities, employees] = await Promise.all([
		repo.get(profileId),
		getActivityForItem(event.locals.db, 'campaign_profiles', profileId),
		employeeRepo.getEmployeeList()
	]);
	
	if (!profile) {
		throw error(404, 'Campaign profile not found');
	}

	// Create employee lookup map
	const employeeMap = new Map(employees.map(emp => [emp.id, emp.name]));

	// Get notes for this campaign profile
	const profileNotes = await event.locals.db
		.select()
		.from(notes)
		.where(
			and(
				eq(notes.entityId, profileId),
				eq(notes.entityType, 'campaign_profile'),
				eq(notes.isCurrent, true)
			)
		)
		.orderBy(notes.createdAt);

	return {
		profile,
		notes: profileNotes.map(note => ({
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

export const actions: Actions = {
	updateField: async (event) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const profileId = parseInt(event.params.id);
		
		if (isNaN(profileId)) {
			return fail(400, { error: 'Invalid profile ID' });
		}

		try {
			const formData = await event.request.formData();
			const { field, value } = updateFieldSchema.parse(Object.fromEntries(formData));
			
			console.log(`Updating campaign profile field: ${field} = ${value}`);

			const currentEntityId = event.locals.employee?.id;
			if (!currentEntityId) {
				return fail(403, { error: 'User entity ID not available' });
			}

			const repo = new CampaignProfilesRepository(event);
			
			const profile = await repo.get(profileId);
			if (!profile) {
				return fail(404, { error: 'Profile not found' });
			}

			// Get old value for activity logging
			const oldValue = profile[field as keyof typeof profile] || '';
			const newValue = value || '';

			// Update the specific field
			const updateData: any = {};
			updateData[field] = value || null;

			await repo.updateField(profileId, updateData, currentEntityId);

			// Create activity log
			const fieldDisplayName = field
				.replace(/([A-Z])/g, ' $1')
				.replace(/^./, str => str.toUpperCase());
			
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.updated_campaign_profile_field,
				RELATED_TABLES.campaign_profiles,
				profileId,
				`${fieldDisplayName} updated from "${oldValue.toString().substring(0, 50)}${oldValue.toString().length > 50 ? '...' : ''}" to "${newValue.toString().substring(0, 50)}${newValue.toString().length > 50 ? '...' : ''}"`
			);

			return { success: true };
		} catch (error) {
			console.error('Error updating field:', error);
			return fail(500, { error: 'Failed to update field' });
		}
	},

	addNote: async (event) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const profileId = parseInt(event.params.id);
		if (isNaN(profileId)) {
			return fail(400, { error: 'Invalid profile ID' });
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
				entityType: 'campaign_profile',
				entityId: profileId,
				createdByEntityId: event.locals.employee.id,
			});

			// Create activity log
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.added_campaign_profile_note,
				RELATED_TABLES.campaign_profiles,
				profileId,
				`Note added: "${content.length > 50 ? content.substring(0, 50) + '...' : content}"`
			);

			return { success: true };
		} catch (error) {
			console.error('Failed to add note:', error);
			return fail(400, { error: 'Failed to add note' });
		}
	},

	updateNote: async (event) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const profileId = parseInt(event.params.id);
		if (isNaN(profileId)) {
			return fail(400, { error: 'Invalid profile ID' });
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
				ACTIVITY.updated_campaign_profile_note,
				RELATED_TABLES.campaign_profiles,
				profileId,
				`Note updated from "${oldText}" to "${newText}"`
			);

			return { success: true };
		} catch (error) {
			console.error('Failed to update note:', error);
			return fail(400, { error: 'Failed to update note' });
		}
	},

	deleteNote: async (event) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const profileId = parseInt(event.params.id);
		if (isNaN(profileId)) {
			return fail(400, { error: 'Invalid profile ID' });
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
				ACTIVITY.deleted_campaign_profile_note,
				RELATED_TABLES.campaign_profiles,
				profileId,
				`Note deleted: "${noteText}"`
			);

			// Redirect back to the clean URL
			throw redirect(302, `/team/ops/campaign-profiles/${profileId}`);
		} catch (error) {
			if (error.status === 302) {
				// Re-throw redirect
				throw error;
			}
			console.error('Failed to delete note:', error);
			return fail(400, { error: 'Failed to delete note' });
		}
	},

	deactivateProfile: async (event) => {
		if (!event.locals.permissions.has('portal:employee:edit')) {
			return fail(403, { error: 'Forbidden' });
		}

		const profileId = parseInt(event.params.id);
		if (isNaN(profileId)) {
			return fail(400, { error: 'Invalid profile ID' });
		}

		if (!event.locals.employee?.id) {
			return fail(403, { error: 'User entity ID not available' });
		}

		try {
			const repo = new CampaignProfilesRepository(event);

			// Get profile for activity log
			const profile = await repo.get(profileId);
			if (!profile) {
				return fail(404, { error: 'Profile not found' });
			}

			// Set isActive to false
			await repo.updateField(profileId, { isActive: false }, event.locals.employee.id);

			// Create activity log
			await createActivity(
				event.locals.db,
				event.locals.user?.id,
				null,
				ACTIVITY.updated_campaign_profile_field,
				RELATED_TABLES.campaign_profiles,
				profileId,
				`Campaign profile deactivated`
			);

			// Redirect back to the list
			throw redirect(302, `/team/ops/campaign-profiles`);
		} catch (error) {
			if (error.status === 302) {
				// Re-throw redirect
				throw error;
			}
			console.error('Failed to deactivate profile:', error);
			return fail(400, { error: 'Failed to deactivate profile' });
		}
	}
};