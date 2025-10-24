import { serviceCategories, entities } from '../db/schema';
import { eq } from 'drizzle-orm';
import { BaseRepository } from './d1-base-repository';

export class ServiceCategoriesRepository extends BaseRepository {
	async getAll(includeInactive = false) {
		const query = this.db
			.select({
				id: serviceCategories.id,
				key: serviceCategories.key,
				displayName: serviceCategories.displayName,
				description: serviceCategories.description,
				isActive: serviceCategories.isActive,
				updatedAt: serviceCategories.updatedAt,
				updatedByName: entities.name,
			})
			.from(serviceCategories)
			.leftJoin(entities, eq(serviceCategories.updatedBy, entities.id));

		// Show only active when includeInactive is false, only inactive when true
		if (!includeInactive) {
			query.where(eq(serviceCategories.isActive, true));
		} else {
			query.where(eq(serviceCategories.isActive, false));
		}

		const result = await query.orderBy(serviceCategories.displayName);

		return result;
	}

	async get(id: number) {
		const result = await this.db
			.select({
				id: serviceCategories.id,
				key: serviceCategories.key,
				displayName: serviceCategories.displayName,
				description: serviceCategories.description,
				isActive: serviceCategories.isActive,
				createdAt: serviceCategories.createdAt,
				updatedAt: serviceCategories.updatedAt,
			})
			.from(serviceCategories)
			.where(eq(serviceCategories.id, id))
			.get();

		return result;
	}

	async getByKey(key: string) {
		const result = await this.db
			.select({
				id: serviceCategories.id,
				key: serviceCategories.key,
				displayName: serviceCategories.displayName,
				description: serviceCategories.description,
				isActive: serviceCategories.isActive,
			})
			.from(serviceCategories)
			.where(eq(serviceCategories.key, key))
			.get();

		return result;
	}

	async create(data: {
		key: string;
		displayName: string;
		description?: string | null;
	}, employeeId: number) {
		const result = await this.db
			.insert(serviceCategories)
			.values({
				key: data.key,
				displayName: data.displayName,
				description: data.description,
				createdBy: employeeId,
				updatedBy: employeeId,
			})
			.returning({ id: serviceCategories.id });

		return result[0];
	}

	async update(id: number, data: {
		key?: string;
		displayName?: string;
		description?: string | null;
	}, employeeId: number) {
		await this.db
			.update(serviceCategories)
			.set({
				...data,
				updatedBy: employeeId,
			})
			.where(eq(serviceCategories.id, id));
	}

	async updateField(id: number, field: Partial<typeof serviceCategories.$inferSelect>, employeeId: number) {
		await this.db
			.update(serviceCategories)
			.set({
				...field,
				updatedBy: employeeId,
			})
			.where(eq(serviceCategories.id, id));
	}
}
