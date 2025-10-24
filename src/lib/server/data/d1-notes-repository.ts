import { and, eq } from 'drizzle-orm';
import { notes, type Note } from '../db/schema';
import { BaseRepository } from './d1-base-repository';

export class NotesRepository extends BaseRepository {
	/**
	 * Save a note - creates new if no noteId, or creates new version if noteId provided
	 * @param noteId - Existing note ID for updates, null for new notes
	 * @param version - Current version number for race condition protection
	 * @param note - Note data to save
	 * @returns The ID of the created note
	 */
	async save(
		noteId: number | null | undefined,
		version: number | null | undefined,
		note: {
			content: string;
			noteType: Note['noteType'];
			entityId: number;
			entityType: Note['entityType'];
			createdByEntityId: number;
			title?: string;
			isInternal?: boolean;
			isPinned?: boolean;
			conversationId?: number;
		}
	): Promise<number> {
		console.log('🟡 NotesRepository.save started', {
			noteId,
			version,
			noteType: note.noteType,
			entityId: note.entityId,
			entityType: note.entityType,
			contentLength: note.content?.length || 0,
			createdByEntityId: note.createdByEntityId
		});

		const now = new Date().toISOString();

		if (noteId == null) {
			console.log('🟡 Creating new note...');
			// Create new note
			const insertData = {
				entityId: note.entityId,
				entityType: note.entityType,
				noteType: note.noteType,
				title: note.title || null,
				content: note.content,
				isInternal: note.isInternal ?? true,
				isPinned: note.isPinned ?? false,
				isCurrent: true,
				versionNumber: 1,
				replacesNoteId: null,
				createdByEntityId: note.createdByEntityId,
				conversationId: note.conversationId || null,
				createdAt: now,
				updatedAt: now,
			};
			console.log('🟡 Insert data prepared:', insertData);

			try {
				const result = await this.db
					.insert(notes)
					.values(insertData)
					.returning({ id: notes.id });

				console.log('🟢 New note created successfully', { 
					newNoteId: result[0].id,
					resultLength: result.length 
				});
				return result[0].id;
			} catch (error) {
				console.error('🔴 Failed to insert new note:', error);
				console.error('🔴 Insert error details:', {
					message: (error as any)?.message,
					cause: (error as any)?.cause,
					stack: (error as any)?.stack
				});
				throw error;
			}
		} else {
			console.log('🟡 Updating existing note with versioning...');
			// Update existing note with versioning
			if (version === null) {
				console.error('🔴 Version is null for existing note update');
				throw new Error('Version must be provided when updating an existing note');
			}

			console.log('🟡 Checking current note version...');
			// First, verify the current note exists and has the expected version
			const currentNote = await this.db
				.select({
					id: notes.id,
					versionNumber: notes.versionNumber,
					isCurrent: notes.isCurrent,
				})
				.from(notes)
				.where(and(eq(notes.id, noteId), eq(notes.isCurrent, true)))
				.limit(1);

			console.log('🟡 Current note check result:', { 
				found: currentNote.length > 0,
				currentNote: currentNote[0] || null
			});

			if (currentNote.length === 0) {
				console.error('🔴 Note not found or is not current');
				throw new Error('Note not found or is not current');
			}

			if (currentNote[0].versionNumber !== version) {
				console.error('🔴 Version mismatch', {
					expected: version,
					current: currentNote[0].versionNumber
				});
				throw new Error(
					`Version mismatch. Expected ${version}, but current version is ${currentNote[0].versionNumber}`
				);
			}
			
			const newVersion = version + 1;
			console.log('🟡 Preparing batch update...', { oldVersion: version, newVersion });
			
			const newNoteData = {
				entityId: note.entityId,
				entityType: note.entityType,
				noteType: note.noteType,
				title: note.title || null,
				content: note.content,
				isInternal: note.isInternal ?? true,
				isPinned: note.isPinned ?? false,
				isCurrent: true,
				versionNumber: newVersion,
				replacesNoteId: noteId,
				createdByEntityId: note.createdByEntityId,
				conversationId: note.conversationId || null,
				createdAt: now,
				updatedAt: now,
			};
			console.log('🟡 New note data prepared:', newNoteData);

			try {
				// Mark the current note as not current
				const results = await this.db.batch([
					this.db
						.update(notes)
						.set({
							isCurrent: false,
							updatedAt: now,
						})
						.where(eq(notes.id, noteId)),

					this.db
						.insert(notes)
						.values(newNoteData)
						.returning({ id: notes.id }),
				]);
				
				console.log('🟡 Batch operation completed', { 
					resultsLength: results.length,
					updateResult: results[0],
					insertResult: results[1]
				});
				
				// The second operation (insert) result contains the new note ID
				// results[0] = update result, results[1] = insert result with ID
				const insertResult = results[1] as { id: number }[];
				console.log('🟢 Note updated successfully', { 
					newNoteId: insertResult[0].id,
					oldNoteId: noteId
				});
				return insertResult[0].id;
			} catch (error) {
				console.error('🔴 Failed to update note with versioning:', error);
				console.error('🔴 Update error details:', {
					message: (error as any)?.message,
					cause: (error as any)?.cause,
					stack: (error as any)?.stack
				});
				throw error;
			}
		}
	}

	/**
	 * Helper method to get current note by entity and type
	 */
	async getCurrentNote(
		entityId: number,
		entityType: NonNullable<Note['entityType']>,
		noteType: NonNullable<Note['noteType']>
	) {
		const result = await this.db
			.select()
			.from(notes)
			.where(
				and(
					eq(notes.entityId, entityId),
					eq(notes.entityType, entityType),
					eq(notes.noteType, noteType),
					eq(notes.isCurrent, true)
				)
			)
			.limit(1);

		return result.length > 0 ? result[0] : null;
	}

	async getById(id: number) {
		const res = await this.db.select().from(notes).where(eq(notes.id, id)).get();
		return res;
	}

	/**
	 * Mark a note as non-current (soft delete)
	 */
	async markAsNonCurrent(noteId: number) {
		const now = new Date().toISOString();

		await this.db
			.update(notes)
			.set({
				isCurrent: false,
				updatedAt: now,
			})
			.where(eq(notes.id, noteId));
	}
}
/*
CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_id INTEGER, -- Can reference any entity
    entity_type TEXT, -- partner, campaign, employee, etc.
    note_type TEXT NOT NULL DEFAULT 'general', -- context, general, warning, process_change
    title TEXT,
    content TEXT,
    is_internal INTEGER NOT NULL DEFAULT 1, -- 0 = false, 1 = true
    is_pinned INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
    is_current INTEGER NOT NULL DEFAULT 1, -- 0 = false, 1 = true (for versioning)
    version_number INTEGER NOT NULL DEFAULT 1,
    replaces_note_id INTEGER, -- Self-reference for versioning
    created_by_entity_id INTEGER,
    conversation_id INTEGER, -- Link to source conversation
    created_at TEXT NOT NULL DEFAULT (strftime('%FT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%FT%H:%M:%fZ', 'now')),
    FOREIGN KEY (replaces_note_id) REFERENCES notes(id),
    FOREIGN KEY (created_by_entity_id) REFERENCES entities(id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
*/
