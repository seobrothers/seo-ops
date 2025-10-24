import { serviceItems, entities, sops, serviceCategories } from '../db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { BaseRepository } from './d1-base-repository';
import { alias } from 'drizzle-orm/sqlite-core';

export class ServiceItemsRepository extends BaseRepository {
	async getAll(includeInactive = false) {
		const partnerEntity = alias(entities, 'partnerEntity');
		const sopEntity = alias(sops, 'sopEntity');
		const updatedByEntity = alias(entities, 'updatedByEntity');

		const result = await this.db
			.select({
				id: serviceItems.id,
				name: serviceItems.name,
				serviceCategory: serviceItems.serviceCategory,
				serviceCategoryDisplayName: serviceCategories.displayName,
				serviceLabel: serviceItems.serviceLabel,
				description: serviceItems.description,
				sopId: serviceItems.sopId,
				sopTitle: sopEntity.title,
				sopUrl: serviceItems.sopUrl,
				partnerEntityId: serviceItems.partnerEntityId,
				partnerName: partnerEntity.name,
				recommendedPriceCents: serviceItems.recommendedPriceCents,
				recommendedPriceCurrency: serviceItems.recommendedPriceCurrency,
				proposalMode: serviceItems.proposalMode,
				updatedByName: updatedByEntity.name,
				isActive: serviceItems.isActive,
				createdAt: serviceItems.createdAt,
				updatedAt: serviceItems.updatedAt,
			})
			.from(serviceItems)
			.leftJoin(partnerEntity, eq(serviceItems.partnerEntityId, partnerEntity.id))
			.leftJoin(sopEntity, eq(serviceItems.sopId, sopEntity.id))
			.leftJoin(updatedByEntity, eq(serviceItems.updatedBy, updatedByEntity.id))
			.leftJoin(serviceCategories, eq(serviceItems.serviceCategoryId, serviceCategories.id))
			.where(includeInactive ? eq(serviceItems.isActive, false) : eq(serviceItems.isActive, true))
			.orderBy(serviceItems.name);

		return result;
	}

	async get(id: number) {
		const partnerEntity = alias(entities, 'partnerEntity');
		const sopEntity = alias(sops, 'sopEntity');

		const result = await this.db
			.select({
				id: serviceItems.id,
				name: serviceItems.name,
				serviceCategory: serviceItems.serviceCategory,
				serviceLabel: serviceItems.serviceLabel,
				description: serviceItems.description,
				sopId: serviceItems.sopId,
				sopTitle: sopEntity.title,
				partnerEntityId: serviceItems.partnerEntityId,
				partnerName: partnerEntity.name,
				minPricingUsdCents: serviceItems.minPricingUsdCents,
				estCogsUsdCents: serviceItems.estCogsUsdCents,
				recommendedPriceCents: serviceItems.recommendedPriceCents,
				recommendedPriceCurrency: serviceItems.recommendedPriceCurrency,
				isActive: serviceItems.isActive,
				createdAt: serviceItems.createdAt,
				updatedAt: serviceItems.updatedAt,
			})
			.from(serviceItems)
			.leftJoin(partnerEntity, eq(serviceItems.partnerEntityId, partnerEntity.id))
			.leftJoin(sopEntity, eq(serviceItems.sopId, sopEntity.id))
			.where(eq(serviceItems.id, id))
			.get();

		return result;
	}

	async create(data: {
		name: string;
		serviceCategory?: string;
		serviceLabel?: string;
		description?: string;
		budgetAmountDollars?: number;
		estCogsDollars?: number;
		recommendedPriceDollars?: number;
		recommendedPriceCurrency?: string;
		sopId?: number;
		partnerEntityId?: number;
		isActive: boolean;
	}, createdByEntityId: number) {
		// Look up service category ID if category key is provided
		let serviceCategoryId: number | undefined;
		if (data.serviceCategory) {
			const category = await this.db
				.select({ id: serviceCategories.id })
				.from(serviceCategories)
				.where(eq(serviceCategories.key, data.serviceCategory))
				.get();
			serviceCategoryId = category?.id;
		}

		const result = await this.db
			.insert(serviceItems)
			.values({
				name: data.name,
				serviceCategory: data.serviceCategory as any, // Keep legacy field for backwards compatibility
				serviceCategoryId: serviceCategoryId,
				serviceLabel: data.serviceLabel as any,
				description: data.description,
				sopId: data.sopId,
				partnerEntityId: data.partnerEntityId,
				minPricingUsdCents: data.budgetAmountDollars ? Math.round(data.budgetAmountDollars * 100) : undefined,
				estCogsUsdCents: data.estCogsDollars ? Math.round(data.estCogsDollars * 100) : undefined,
				recommendedPriceCents: data.recommendedPriceDollars ? Math.round(data.recommendedPriceDollars * 100) : undefined,
				recommendedPriceCurrency: data.recommendedPriceCurrency,
				isActive: data.isActive,
				createdBy: createdByEntityId,
				updatedBy: createdByEntityId,
			})
			.returning({ id: serviceItems.id });

		return result[0];
	}

	async update(id: number, data: {
		name: string;
		serviceCategory?: string;
		serviceLabel?: string;
		description?: string;
		budgetAmountDollars?: number;
		estCogsDollars?: number;
		recommendedPriceDollars?: number;
		recommendedPriceCurrency?: string;
		sopId?: number;
		partnerEntityId?: number;
		isActive: boolean;
	}, updatedByEntityId: number) {
		// Look up service category ID if category key is provided
		let serviceCategoryId: number | undefined;
		if (data.serviceCategory) {
			const category = await this.db
				.select({ id: serviceCategories.id })
				.from(serviceCategories)
				.where(eq(serviceCategories.key, data.serviceCategory))
				.get();
			serviceCategoryId = category?.id;
		}

		await this.db
			.update(serviceItems)
			.set({
				name: data.name,
				serviceCategory: data.serviceCategory as any,
				serviceCategoryId: serviceCategoryId,
				serviceLabel: data.serviceLabel as any,
				description: data.description,
				sopId: data.sopId,
				partnerEntityId: data.partnerEntityId,
				minPricingUsdCents: data.budgetAmountDollars ? Math.round(data.budgetAmountDollars * 100) : undefined,
				estCogsUsdCents: data.estCogsDollars ? Math.round(data.estCogsDollars * 100) : undefined,
				recommendedPriceCents: data.recommendedPriceDollars ? Math.round(data.recommendedPriceDollars * 100) : undefined,
				recommendedPriceCurrency: data.recommendedPriceCurrency,
				isActive: data.isActive,
				updatedBy: updatedByEntityId,
				updatedAt: new Date().toISOString(),
			})
			.where(eq(serviceItems.id, id));
	}

	async getAvailableForPackage(partnerEntityId?: number, packageType?: string) {
		const whereConditions = [eq(serviceItems.isActive, true)];

		// Add package type filter based on proposalMode
		if (packageType) {
			if (packageType === 'one_time') {
				whereConditions.push(
					or(
						eq(serviceItems.proposalMode, 'one_time'),
						eq(serviceItems.proposalMode, 'both')
					)
				);
			} else if (packageType === 'ongoing') {
				whereConditions.push(
					or(
						eq(serviceItems.proposalMode, 'recurring'),
						eq(serviceItems.proposalMode, 'both')
					)
				);
			}
		}

		// Add partner condition only if partnerEntityId is provided
		if (partnerEntityId) {
			whereConditions.push(
				or(
					isNull(serviceItems.partnerEntityId),
					eq(serviceItems.partnerEntityId, partnerEntityId)
				)
			);
		} else {
			// If no partner, only show core items
			whereConditions.push(isNull(serviceItems.partnerEntityId));
		}

		const result = await this.db
			.select({
				id: serviceItems.id,
				name: serviceItems.name,
				serviceLabel: serviceItems.serviceLabel,
				partnerEntityId: serviceItems.partnerEntityId,
				isPartnerSpecific: serviceItems.partnerEntityId,
				recommendedPriceCents: serviceItems.recommendedPriceCents,
			})
			.from(serviceItems)
			.where(and(...whereConditions));

		// Group by service label and prioritize partner-specific items
		const grouped = new Map<string, any>();
		
		for (const item of result) {
			const key = item.serviceLabel || 'unknown';
			if (!grouped.has(key) || item.partnerEntityId) {
				grouped.set(key, {
					id: item.id,
					name: item.partnerEntityId ? `*${item.name}` : item.name,
					serviceLabel: item.serviceLabel,
					isPartnerSpecific: !!item.partnerEntityId,
					recommendedPriceCents: item.recommendedPriceCents
				});
			}
		}

		return Array.from(grouped.values());
	}

	async getAvailableActionItemsForPackage(partnerEntityId?: number) {
		const whereConditions = [
			eq(serviceItems.isActive, true),
			eq(serviceItems.proposalMode, 'neither')
		];

		// Add partner condition only if partnerEntityId is provided
		if (partnerEntityId) {
			whereConditions.push(
				or(
					isNull(serviceItems.partnerEntityId),
					eq(serviceItems.partnerEntityId, partnerEntityId)
				)
			);
		} else {
			// If no partner, only show core items
			whereConditions.push(isNull(serviceItems.partnerEntityId));
		}

		const result = await this.db
			.select({
				id: serviceItems.id,
				name: serviceItems.name,
				description: serviceItems.description,
				serviceLabel: serviceItems.serviceLabel,
				partnerEntityId: serviceItems.partnerEntityId,
			})
			.from(serviceItems)
			.where(and(...whereConditions))
			.orderBy(serviceItems.name);

		// Format for EntityPicker with partner-specific marking
		return result.map(item => ({
			id: item.id,
			name: item.partnerEntityId ? `*${item.name}` : item.name,
			title: item.name, // Map name to title for compatibility
			templateName: item.name, // Map name to templateName for compatibility
			description: item.description,
			isPartnerSpecific: !!item.partnerEntityId
		}));
	}
}