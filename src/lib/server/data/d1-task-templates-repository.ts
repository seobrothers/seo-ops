import { eq, sql, and } from 'drizzle-orm';
import { taskTemplates, entities, campaignProfiles, serviceCategories } from '../db/schema';
import { BaseRepository } from './d1-base-repository';
import { alias } from 'drizzle-orm/sqlite-core';
import type { TaskTemplateCategory } from '$lib/options';

export class TaskTemplatesRepository extends BaseRepository {
	async getAll(includeInactive = false) {
		const updatedByEntity = alias(entities, 'updatedByEntity');
		const partnerEntity = alias(entities, 'partnerEntity');
		const campaignProfileEntity = alias(campaignProfiles, 'campaignProfileEntity');

		const result = await this.db
			.select({
				id: taskTemplates.id,
				type: taskTemplates.type,
				title: taskTemplates.title,
				description: taskTemplates.description,
				key: taskTemplates.key,
				primaryParticipant: taskTemplates.primaryParticipant,
				grouping: taskTemplates.grouping,
				estTimeMinutes: taskTemplates.estTimeMinutes,
				sopUrl: taskTemplates.sopUrl,
				sopId: taskTemplates.sopId,
				templateCategory: taskTemplates.templateCategory,
				partnerEntityId: taskTemplates.partnerEntityId,
				partnerName: partnerEntity.name,
				campaignProfileId: taskTemplates.campaignProfileId,
				campaignProfileName: campaignProfileEntity.name,
				serviceCategoryId: taskTemplates.serviceCategoryId,
				serviceCategoryName: serviceCategories.displayName,
				mandatory: taskTemplates.mandatory,
				decisionPoint: taskTemplates.decisionPoint,
				active: taskTemplates.active,
				updatedByName: updatedByEntity.name,
				createdAt: taskTemplates.createdAt,
				updatedAt: taskTemplates.updatedAt
			})
			.from(taskTemplates)
			.leftJoin(partnerEntity, eq(taskTemplates.partnerEntityId, partnerEntity.id))
			.leftJoin(campaignProfileEntity, eq(taskTemplates.campaignProfileId, campaignProfileEntity.id))
			.leftJoin(serviceCategories, eq(taskTemplates.serviceCategoryId, serviceCategories.id))
			.leftJoin(updatedByEntity, eq(taskTemplates.updatedBy, updatedByEntity.id))
			.where(includeInactive ? eq(taskTemplates.active, false) : eq(taskTemplates.active, true))
			.orderBy(taskTemplates.createdAt);

		return result;
	}

	async get(id: number) {
		const result = await this.db
			.select()
			.from(taskTemplates)
			.where(eq(taskTemplates.id, id))
			.limit(1);

		return result.length > 0 ? result[0] : null;
	}

	async checkKeyUniqueness(key: string, partnerEntityId: number | null | undefined, excludeId?: number) {
		const conditions = [
			eq(taskTemplates.key, key),
			eq(taskTemplates.active, true)
		];

		// Handle null partner entity ID correctly
		if (partnerEntityId) {
			conditions.push(eq(taskTemplates.partnerEntityId, partnerEntityId));
		} else {
			conditions.push(sql`${taskTemplates.partnerEntityId} IS NULL`);
		}

		if (excludeId) {
			conditions.push(sql`${taskTemplates.id} != ${excludeId}`);
		}

		const result = await this.db
			.select({ id: taskTemplates.id })
			.from(taskTemplates)
			.where(and(...conditions))
			.limit(1);

		return result.length === 0; // Returns true if unique (no matches found)
	}

	async create(data: {
		type: string;
		title: string;
		description?: string;
		key: string;
		primaryParticipant: string;
		grouping: string;
		estTimeMinutes?: number;
		sopUrl?: string;
		sopId?: number;
		partnerEntityId?: number;
		campaignProfileId?: number;
		serviceCategoryId?: number;
		mandatory?: boolean;
		decisionPoint?: boolean;
	}, createdByEntityId: number) {
		const now = new Date().toISOString();

		// Calculate template_category based on what's selected
		let templateCategory: TaskTemplateCategory = 'default';
		if (data.partnerEntityId && data.campaignProfileId) {
			templateCategory = 'partner_campaign_profile_specific';
		} else if (data.partnerEntityId) {
			templateCategory = 'partner_specific';
		} else if (data.campaignProfileId) {
			templateCategory = 'campaign_profile_specific';
		}

		const [newTemplate] = await this.db
			.insert(taskTemplates)
			.values({
				type: data.type,
				title: data.title,
				description: data.description || null,
				key: data.key,
				primaryParticipant: data.primaryParticipant,
				grouping: data.grouping,
				estTimeMinutes: data.estTimeMinutes || null,
				sopUrl: data.sopUrl || null,
				sopId: data.sopId || null,
				templateCategory,
				partnerEntityId: data.partnerEntityId || null,
				campaignProfileId: data.campaignProfileId || null,
				serviceCategoryId: data.serviceCategoryId || null,
				mandatory: data.mandatory ?? false,
				decisionPoint: data.decisionPoint ?? false,
				active: true,
				createdAt: now,
				updatedAt: now,
				createdBy: createdByEntityId,
				updatedBy: createdByEntityId,
			})
			.returning({ id: taskTemplates.id });

		return newTemplate;
	}

	async update(id: number, data: {
		type?: string;
		title?: string;
		description?: string;
		key?: string;
		primaryParticipant?: string;
		grouping?: string;
		estTimeMinutes?: number;
		sopUrl?: string;
		sopId?: number;
		partnerEntityId?: number;
		campaignProfileId?: number;
		serviceCategoryId?: number;
		mandatory?: boolean;
		decisionPoint?: boolean;
		active?: boolean;
	}, updatedByEntityId: number) {
		const now = new Date().toISOString();

		// Recalculate template_category if partner or campaign profile changed
		let templateCategory: TaskTemplateCategory | undefined;
		if (data.partnerEntityId !== undefined || data.campaignProfileId !== undefined) {
			const currentTemplate = await this.get(id);
			const partnerEntityId = data.partnerEntityId !== undefined ? data.partnerEntityId : currentTemplate?.partnerEntityId;
			const campaignProfileId = data.campaignProfileId !== undefined ? data.campaignProfileId : currentTemplate?.campaignProfileId;

			if (partnerEntityId && campaignProfileId) {
				templateCategory = 'partner_campaign_profile_specific';
			} else if (partnerEntityId) {
				templateCategory = 'partner_specific';
			} else if (campaignProfileId) {
				templateCategory = 'campaign_profile_specific';
			} else {
				templateCategory = 'default';
			}
		}

		// Only update fields that are provided
		const updateData: any = {
			updatedAt: now,
			updatedBy: updatedByEntityId
		};

		if (data.type !== undefined) updateData.type = data.type;
		if (data.title !== undefined) updateData.title = data.title;
		if (data.description !== undefined) updateData.description = data.description || null;
		if (data.key !== undefined) updateData.key = data.key;
		if (data.primaryParticipant !== undefined) updateData.primaryParticipant = data.primaryParticipant;
		if (data.grouping !== undefined) updateData.grouping = data.grouping;
		if (data.estTimeMinutes !== undefined) updateData.estTimeMinutes = data.estTimeMinutes || null;
		if (data.sopUrl !== undefined) updateData.sopUrl = data.sopUrl || null;
		if (data.sopId !== undefined) updateData.sopId = data.sopId || null;
		if (data.partnerEntityId !== undefined) updateData.partnerEntityId = data.partnerEntityId || null;
		if (data.campaignProfileId !== undefined) updateData.campaignProfileId = data.campaignProfileId || null;
		if (data.serviceCategoryId !== undefined) updateData.serviceCategoryId = data.serviceCategoryId || null;
		if (data.mandatory !== undefined) updateData.mandatory = data.mandatory;
		if (data.decisionPoint !== undefined) updateData.decisionPoint = data.decisionPoint;
		if (data.active !== undefined) updateData.active = data.active;
		if (templateCategory !== undefined) updateData.templateCategory = templateCategory;

		await this.db
			.update(taskTemplates)
			.set(updateData)
			.where(eq(taskTemplates.id, id));
	}

	async delete(id: number, deletedByEntityId: number) {
		// Soft delete - mark as inactive
		const now = new Date().toISOString();
		await this.db
			.update(taskTemplates)
			.set({
				active: false,
				updatedAt: now,
				updatedBy: deletedByEntityId
			})
			.where(eq(taskTemplates.id, id));
	}

	async activate(id: number, activatedByEntityId: number) {
		// Activate - mark as active
		const now = new Date().toISOString();
		await this.db
			.update(taskTemplates)
			.set({
				active: true,
				updatedAt: now,
				updatedBy: activatedByEntityId
			})
			.where(eq(taskTemplates.id, id));
	}
}
