import { campaignProfiles, entities } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BaseRepository } from './d1-base-repository';

export class CampaignProfilesRepository extends BaseRepository {
	async getAll(includeInactive = false) {
		const result = await this.db
			.select({
				id: campaignProfiles.id,
				name: campaignProfiles.name,
				short_description: campaignProfiles.shortDescription,
				updatedAt: campaignProfiles.updatedAt,
				updatedByName: entities.name
			})
			.from(campaignProfiles)
			.leftJoin(entities, eq(campaignProfiles.updatedBy, entities.id))
			.where(includeInactive ? eq(campaignProfiles.isActive, false) : eq(campaignProfiles.isActive, true))
			.orderBy(campaignProfiles.name);

		return result;
	}

	async get(id: number) {
		const result = await this.db
			.select()
			.from(campaignProfiles)
			.where(eq(campaignProfiles.id, id))
			.get();

		return result;
	}

	async create(data: { name: string; short_description?: string }, createdByEntityId: number) {
		const result = await this.db
			.insert(campaignProfiles)
			.values({
				name: data.name,
				shortDescription: data.short_description || null,
				createdBy: createdByEntityId,
				updatedBy: createdByEntityId
			})
			.returning();

		return result[0];
	}

	async delete(id: number) {
		const result = await this.db
			.delete(campaignProfiles)
			.where(eq(campaignProfiles.id, id))
			.returning();

		return result[0];
	}

	async updateField(id: number, data: any, updatedByEntityId: number) {
		const result = await this.db
			.update(campaignProfiles)
			.set({
				...data,
				updatedBy: updatedByEntityId,
				updatedAt: new Date().toISOString()
			})
			.where(eq(campaignProfiles.id, id))
			.returning();

		return result[0];
	}
}