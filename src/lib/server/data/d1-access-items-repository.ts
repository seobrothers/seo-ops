import { accessItems, entities } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { BaseRepository } from './d1-base-repository';
import { alias } from 'drizzle-orm/sqlite-core';

export class AccessItemsRepository extends BaseRepository {
	async getAll(includeInactive: boolean = false) {
		const tfaContactEntity = alias(entities, 'tfaContactEntity');
		const partnerEntity = alias(entities, 'partnerEntity');

		let query = this.db
			.select({
				id: accessItems.id,
				username: accessItems.username,
				email: accessItems.email,
				accessItemOwner: accessItems.accessItemOwner,
				inLastpass: accessItems.inLastpass,
				tfaType: accessItems.tfaType,
				tfaTypeValue: accessItems.tfaTypeValue,
				tfaContactId: accessItems.tfaContactId,
				tfaContactName: tfaContactEntity.name,
				tfaSource: accessItems.tfaSource,
				partnerEntityId: accessItems.partnerEntityId,
				partnerEntityName: partnerEntity.name,
				isActive: accessItems.isActive,
				updatedAt: accessItems.updatedAt,
			})
			.from(accessItems)
			.leftJoin(tfaContactEntity, eq(accessItems.tfaContactId, tfaContactEntity.id))
			.leftJoin(partnerEntity, eq(accessItems.partnerEntityId, partnerEntity.id));

		// Show only active when includeInactive is false, only inactive when true
		if (!includeInactive) {
			query = query.where(eq(accessItems.isActive, true));
		} else {
			query = query.where(eq(accessItems.isActive, false));
		}

		const result = await query.orderBy(desc(accessItems.updatedAt));

		return result;
	}

	async get(id: number) {
		const tfaContactEntity = alias(entities, 'tfaContactEntity');
		const partnerEntity = alias(entities, 'partnerEntity');

		const result = await this.db
			.select({
				id: accessItems.id,
				username: accessItems.username,
				email: accessItems.email,
				accessItemOwner: accessItems.accessItemOwner,
				inLastpass: accessItems.inLastpass,
				tfaType: accessItems.tfaType,
				tfaTypeValue: accessItems.tfaTypeValue,
				tfaContactId: accessItems.tfaContactId,
				tfaContactName: tfaContactEntity.name,
				tfaSource: accessItems.tfaSource,
				partnerEntityId: accessItems.partnerEntityId,
				partnerEntityName: partnerEntity.name,
				isActive: accessItems.isActive,
				createdAt: accessItems.createdAt,
				createdBy: accessItems.createdBy,
				updatedAt: accessItems.updatedAt,
				updatedBy: accessItems.updatedBy,
			})
			.from(accessItems)
			.leftJoin(tfaContactEntity, eq(accessItems.tfaContactId, tfaContactEntity.id))
			.leftJoin(partnerEntity, eq(accessItems.partnerEntityId, partnerEntity.id))
			.where(eq(accessItems.id, id))
			.get();

		return result;
	}

	async create(data: {
		username: string;
		email?: string;
		accessItemOwner: 'partner' | 'internal';
		inLastpass: boolean;
		tfaType?: 'sms' | 'email' | 'authenticator' | 'other';
		tfaTypeValue?: string;
		tfaContactId?: number;
		tfaSource?: 'internal' | 'partner';
		partnerEntityId?: number;
	}, createdByEntityId: number) {
		const result = await this.db
			.insert(accessItems)
			.values({
				username: data.username,
				email: data.email || null,
				accessItemOwner: data.accessItemOwner,
				inLastpass: data.inLastpass,
				tfaType: data.tfaType || null,
				tfaTypeValue: data.tfaTypeValue || null,
				tfaContactId: data.tfaContactId || null,
				tfaSource: data.tfaSource || null,
				partnerEntityId: data.partnerEntityId || null,
				createdBy: createdByEntityId,
				updatedBy: createdByEntityId,
			})
			.returning({ id: accessItems.id })
			.get();

		return result;
	}

	async update(id: number, data: {
		username: string;
		email?: string;
		accessItemOwner: 'partner' | 'internal';
		inLastpass: boolean;
		tfaType?: 'sms' | 'email' | 'authenticator' | 'other';
		tfaTypeValue?: string;
		tfaContactId?: number;
		tfaSource?: 'internal' | 'partner';
		partnerEntityId?: number;
	}, updatedByEntityId: number) {
		const result = await this.db
			.update(accessItems)
			.set({
				username: data.username,
				email: data.email || null,
				accessItemOwner: data.accessItemOwner,
				inLastpass: data.inLastpass,
				tfaType: data.tfaType || null,
				tfaTypeValue: data.tfaTypeValue || null,
				tfaContactId: data.tfaContactId || null,
				tfaSource: data.tfaSource || null,
				partnerEntityId: data.partnerEntityId || null,
				updatedBy: updatedByEntityId,
			})
			.where(eq(accessItems.id, id))
			.returning({ id: accessItems.id })
			.get();

		return result;
	}

	async delete(id: number, deletedByEntityId: number) {
		const result = await this.db
			.update(accessItems)
			.set({
				isActive: false,
				updatedBy: deletedByEntityId,
			})
			.where(eq(accessItems.id, id))
			.returning({ id: accessItems.id })
			.get();

		return result;
	}

	async activate(id: number, activatedByEntityId: number) {
		const result = await this.db
			.update(accessItems)
			.set({
				isActive: true,
				updatedBy: activatedByEntityId,
			})
			.where(eq(accessItems.id, id))
			.returning({ id: accessItems.id })
			.get();

		return result;
	}
}