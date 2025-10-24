import { permissions, entities, serviceItems as serviceItemsTable, serviceCategories, campaignProfiles } from '../db/schema';
import { eq, isNull, and } from 'drizzle-orm';
import { BaseRepository } from './d1-base-repository';
import { alias } from 'drizzle-orm/sqlite-core';

export class PermissionsRepository extends BaseRepository {
	async getAll(includeInactive = false) {
		const partnerEntity = alias(entities, 'partnerEntity');
		const updatedByEntity = alias(entities, 'updatedByEntity');

		const result = await this.db
			.select({
				id: permissions.id,
				name: permissions.name,
				permissionKey: permissions.permissionKey,
				permissionState: permissions.permissionState,
				serviceItemId: permissions.serviceItemId,
				serviceItemName: serviceItemsTable.name,
				serviceCategoryId: permissions.serviceCategoryId,
				serviceCategoryDisplayName: serviceCategories.displayName,
				campaignProfileId: permissions.campaignProfileId,
				campaignProfileName: campaignProfiles.name,
				partnerEntityId: permissions.partnerId,
				partnerName: partnerEntity.name,
				updatedByName: updatedByEntity.name,
				isActive: permissions.isActive,
				createdAt: permissions.createdAt,
				updatedAt: permissions.updatedAt,
			})
			.from(permissions)
			.leftJoin(partnerEntity, eq(permissions.partnerId, partnerEntity.id))
			.leftJoin(updatedByEntity, eq(permissions.updatedBy, updatedByEntity.id))
			.leftJoin(serviceItemsTable, eq(permissions.serviceItemId, serviceItemsTable.id))
			.leftJoin(serviceCategories, eq(permissions.serviceCategoryId, serviceCategories.id))
			.leftJoin(campaignProfiles, eq(permissions.campaignProfileId, campaignProfiles.id))
			.where(includeInactive ? eq(permissions.isActive, 0) : eq(permissions.isActive, 1))
			.orderBy(permissions.name);

		return result;
	}

	async get(id: number) {
		const result = await this.db
			.select({
				id: permissions.id,
				name: permissions.name,
				permissionKey: permissions.permissionKey,
				permissionState: permissions.permissionState,
				scopeStatus: permissions.scopeStatus,
				serviceItemId: permissions.serviceItemId,
				serviceCategoryId: permissions.serviceCategoryId,
				partnerId: permissions.partnerId,
				campaignId: permissions.campaignId,
				packageId: permissions.packageId,
				campaignProfileId: permissions.campaignProfileId,
				changedBy: permissions.changedBy,
				changeReason: permissions.changeReason,
				isActive: permissions.isActive,
				createdAt: permissions.createdAt,
				updatedAt: permissions.updatedAt,
			})
			.from(permissions)
			.where(eq(permissions.id, id))
			.get();

		return result;
	}

	async create(data: {
		name: string;
		permissionKey: string;
		permissionState: 'allowed' | 'allowed_with_approval' | 'not_allowed';
		serviceItemId?: number;
		serviceCategoryId?: number;
		partnerId?: number;
		campaignProfileId?: number;
	}, createdByEntityId: number) {

		const result = await this.db
			.insert(permissions)
			.values({
				name: data.name,
				permissionKey: data.permissionKey,
				permissionState: data.permissionState,
				serviceItemId: data.serviceItemId || null,
				serviceCategoryId: data.serviceCategoryId || null,
				partnerId: data.partnerId || null,
				campaignProfileId: data.campaignProfileId || null,
				createdBy: createdByEntityId,
				updatedBy: createdByEntityId
			})
			.returning();

		return result[0];
	}

	async update(id: number, data: {
		name?: string;
		permissionKey?: string;
		permissionState?: 'allowed' | 'allowed_with_approval' | 'not_allowed';
		serviceItemId?: number | null;
		serviceCategoryId?: number | null;
		partnerId?: number | null;
		campaignProfileId?: number | null;
	}, updatedByEntityId: number) {

		const result = await this.db
			.update(permissions)
			.set({
				...data,
				updatedBy: updatedByEntityId
			})
			.where(eq(permissions.id, id))
			.returning();

		return result[0];
	}

	async updateField(id: number, field: Partial<typeof permissions.$inferSelect>, updatedByEntityId: number) {
		await this.db
			.update(permissions)
			.set({
				...field,
				updatedBy: updatedByEntityId
			})
			.where(eq(permissions.id, id));
	}

	async delete(id: number) {
		await this.db
			.delete(permissions)
			.where(eq(permissions.id, id));
	}

	async getByPartnerId(partnerId: number) {
		const result = await this.db
			.select({
				id: permissions.id,
				name: permissions.name,
				permissionKey: permissions.permissionKey,
				permissionState: permissions.permissionState,
				serviceItemId: permissions.serviceItemId,
				serviceCategoryId: permissions.serviceCategoryId,
				createdAt: permissions.createdAt,
				updatedAt: permissions.updatedAt,
			})
			.from(permissions)
			.where(and(
				eq(permissions.partnerId, partnerId),
				eq(permissions.isActive, 1)
			))
			.orderBy(permissions.name);

		return result;
	}

	/**
	 * Get base permissions (permissions not tied to any specific partner)
	 */
	async getBasePermissions() {
		const result = await this.db
			.select({
				id: permissions.id,
				name: permissions.name,
				permissionKey: permissions.permissionKey,
				permissionState: permissions.permissionState,
			})
			.from(permissions)
			.where(and(
				isNull(permissions.partnerId),
				eq(permissions.isActive, 1)
			))
			.orderBy(permissions.name);

		return result;
	}

	/**
	 * Get default permissions for a campaign (base permissions + partner overrides)
	 * This merges base permissions with partner-level overrides to show what the
	 * "default" permissions are before any campaign-level overrides are applied
	 */
	async getDefaultPermissionsForCampaign(partnerId: number | null) {
		// Get base permissions
		const basePerms = await this.getBasePermissions();

		// If no partner, just return base permissions
		if (!partnerId) {
			return basePerms;
		}

		// Get partner permissions
		const partnerPerms = await this.getByPartnerId(partnerId);

		// Create a map of partner permissions by key
		const partnerPermsMap = new Map(
			partnerPerms.map(p => [p.permissionKey, p])
		);

		// Merge: use partner permission if it exists, otherwise use base
		const merged = basePerms.map(basePerm => {
			const partnerOverride = partnerPermsMap.get(basePerm.permissionKey);
			if (partnerOverride) {
				return {
					id: partnerOverride.id,
					name: partnerOverride.name || basePerm.name,
					permissionKey: partnerOverride.permissionKey,
					permissionState: partnerOverride.permissionState,
				};
			}
			return basePerm;
		});

		return merged;
	}
}