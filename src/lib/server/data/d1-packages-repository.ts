import type { RequestEvent } from '@sveltejs/kit';
import { BaseRepository } from './d1-base-repository';
import { packages, campaignProfiles, entities, notes, packageServiceItems, serviceItems, packageServiceActionItems } from '../db/schema';
import type { Package, NewPackage, NewPackageServiceItem } from '../db/schema';
import { desc, eq, and, like, sql, inArray } from 'drizzle-orm';
import { getActivityForItem, createActivity } from './d1-activities';
import { ACTIVITY } from '$lib/activity-types';

export class PackagesRepository extends BaseRepository {
	private event: RequestEvent;

	constructor(event: RequestEvent) {
		super(event);
		this.event = event;
	}
	
	private getCurrentUserEntityId(): number {
		return this.event.locals.employee?.id || 1;
	}

	async getAll(includeInactive = false) {
		const query = this.db
			.select({
				id: packages.id,
				name: packages.name,
				description: packages.description,
				monthlyPriceCents: packages.monthlyPriceCents,
				currency: packages.currency,
				partnerEntityId: packages.partnerEntityId,
				partnerName: entities.name,
				relatedCampaignProfileId: packages.relatedCampaignProfileId,
				campaignProfileName: campaignProfiles.name,
				isActive: packages.isActive,
				buyWithoutDiscovery: packages.buyWithoutDiscovery,
				type: packages.type,
				outcome: packages.outcome,
				createdAt: packages.createdAt,
				updatedAt: packages.updatedAt,
				updatedBy: packages.updatedBy,
				updatedByName: sql<string>`(
					SELECT name
					FROM entities
					WHERE entities.id = ${packages.updatedBy}
				)`.as('updatedByName'),
				campaignConsiderations: packages.campaignConsiderations,
				presaleConsiderations: packages.presaleConsiderations,
				phaseOneOutline: packages.phaseOneOutline,
				ongoingPhaseOutline: packages.ongoingPhaseOutline,
				seoGrowthOpportunities: packages.seoGrowthOpportunities
			})
			.from(packages)
			.leftJoin(entities, eq(packages.partnerEntityId, entities.id))
			.leftJoin(campaignProfiles, eq(packages.relatedCampaignProfileId, campaignProfiles.id))
			.orderBy(desc(packages.updatedAt));

		let conditions = [];
		// Show only active when includeInactive is false, only inactive when true
		if (!includeInactive) {
			conditions.push(eq(packages.isActive, true));
		} else {
			conditions.push(eq(packages.isActive, false));
		}

		if (conditions.length > 0) {
			query.where(and(...conditions));
		}

		const packageList = await query;
		
		// Get service items for each package
		const packageIds = packageList.map(pkg => pkg.id);
		if (packageIds.length > 0) {
			const serviceItemsQuery = await this.db
				.select({
					packageId: packageServiceItems.packageId,
					id: packageServiceItems.id,
					serviceItemId: packageServiceItems.serviceItemId,
					serviceItemName: serviceItems.name,
					serviceLabel: serviceItems.serviceLabel,
					quantity: packageServiceItems.quantity,
					frequency: packageServiceItems.frequency,
					monthlyValueCents: packageServiceItems.monthlyPriceCents,
					isPartnerSpecific: serviceItems.partnerEntityId,
					createdAt: packageServiceItems.createdAt
				})
				.from(packageServiceItems)
				.innerJoin(serviceItems, eq(packageServiceItems.serviceItemId, serviceItems.id))
				.where(inArray(packageServiceItems.packageId, packageIds))
				.orderBy(packageServiceItems.createdAt);
			
			// Group service items by package ID
			const serviceItemsByPackage = serviceItemsQuery.reduce((acc, item) => {
				if (!acc[item.packageId]) {
					acc[item.packageId] = [];
				}
				acc[item.packageId].push({
					...item,
					isPartnerSpecific: !!item.isPartnerSpecific
				});
				return acc;
			}, {} as Record<number, any[]>);
			
			// Add service items to each package
			return packageList.map(pkg => ({
				...pkg,
				packageServiceItems: serviceItemsByPackage[pkg.id] || []
			}));
		}

		return packageList.map(pkg => ({ ...pkg, packageServiceItems: [] }));
	}

	async search(searchTerm: string, partnerEntityId?: number, campaignProfileId?: number, includeInactive = false, packageType?: 'ongoing' | 'one_time') {
		const query = this.db
			.select({
				id: packages.id,
				name: packages.name,
				description: packages.description,
				monthlyPriceCents: packages.monthlyPriceCents,
				currency: packages.currency,
				partnerEntityId: packages.partnerEntityId,
				partnerName: entities.name,
				relatedCampaignProfileId: packages.relatedCampaignProfileId,
				campaignProfileName: campaignProfiles.name,
				isActive: packages.isActive,
				buyWithoutDiscovery: packages.buyWithoutDiscovery,
				type: packages.type,
				outcome: packages.outcome,
				createdAt: packages.createdAt,
				updatedAt: packages.updatedAt,
				updatedBy: packages.updatedBy,
				updatedByName: sql<string>`(
					SELECT name
					FROM entities
					WHERE entities.id = ${packages.updatedBy}
				)`.as('updatedByName'),
				seoGrowthOpportunities: packages.seoGrowthOpportunities
			})
			.from(packages)
			.leftJoin(entities, eq(packages.partnerEntityId, entities.id))
			.leftJoin(campaignProfiles, eq(packages.relatedCampaignProfileId, campaignProfiles.id))
			.orderBy(desc(packages.updatedAt));

		let conditions = [];
		
		if (!includeInactive) {
			conditions.push(eq(packages.isActive, true));
		}

		if (searchTerm) {
			conditions.push(like(packages.name, `%${searchTerm}%`));
		}

		if (partnerEntityId) {
			conditions.push(eq(packages.partnerEntityId, partnerEntityId));
		}

		if (campaignProfileId) {
			conditions.push(eq(packages.relatedCampaignProfileId, campaignProfileId));
		}

		if (packageType) {
			conditions.push(eq(packages.type, packageType));
		}

		if (conditions.length > 0) {
			query.where(and(...conditions));
		}

		return await query;
	}

	async getById(id: number) {
		const result = await this.db
			.select({
				id: packages.id,
				name: packages.name,
				description: packages.description,
				monthlyPriceCents: packages.monthlyPriceCents,
				currency: packages.currency,
				partnerEntityId: packages.partnerEntityId,
				partnerName: entities.name,
				relatedCampaignProfileId: packages.relatedCampaignProfileId,
				campaignProfile: campaignProfiles,
				campaignProfileName: campaignProfiles.name,
				isActive: packages.isActive,
				buyWithoutDiscovery: packages.buyWithoutDiscovery,
				type: packages.type,
				outcome: packages.outcome,
				createdAt: packages.createdAt,
				createdBy: packages.createdBy,
				updatedAt: packages.updatedAt,
				updatedBy: packages.updatedBy,
				updatedByName: sql<string>`(
					SELECT name
					FROM entities
					WHERE entities.id = ${packages.updatedBy}
				)`.as('updatedByName'),
				campaignConsiderations: packages.campaignConsiderations,
				presaleConsiderations: packages.presaleConsiderations,
				phaseOneOutline: packages.phaseOneOutline,
				ongoingPhaseOutline: packages.ongoingPhaseOutline,
				seoGrowthOpportunities: packages.seoGrowthOpportunities
			})
			.from(packages)
			.leftJoin(entities, eq(packages.partnerEntityId, entities.id))
			.leftJoin(campaignProfiles, eq(packages.relatedCampaignProfileId, campaignProfiles.id))
			.where(eq(packages.id, id))
			.limit(1);

		return result[0];
	}

	async create(data: Omit<NewPackage, 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'>) {
		const userEntityId = this.getCurrentUserEntityId();
		
		// If a campaign profile is selected, copy its fields
		let campaignProfileData = {};
		if (data.relatedCampaignProfileId) {
			const campaignProfile = await this.db
				.select({
					campaignConsiderations: campaignProfiles.campaignConsiderations,
					presaleConsiderations: campaignProfiles.presaleConsiderations,
					phaseOneOutline: campaignProfiles.phaseOneOutline,
					ongoingPhaseOutline: campaignProfiles.ongoingPhaseOutline,
					seoGrowthOpportunities: campaignProfiles.seoGrowthOpportunities
				})
				.from(campaignProfiles)
				.where(eq(campaignProfiles.id, data.relatedCampaignProfileId))
				.limit(1);

			if (campaignProfile[0]) {
				campaignProfileData = {
					campaignConsiderations: campaignProfile[0].campaignConsiderations,
					presaleConsiderations: campaignProfile[0].presaleConsiderations,
					phaseOneOutline: campaignProfile[0].phaseOneOutline,
					ongoingPhaseOutline: campaignProfile[0].ongoingPhaseOutline,
					seoGrowthOpportunities: campaignProfile[0].seoGrowthOpportunities
				};
			}
		}

		const [result] = await this.db
			.insert(packages)
			.values({
				...data,
				...campaignProfileData,
				createdBy: userEntityId,
				updatedBy: userEntityId
			})
			.returning();

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			result.partnerEntityId || null,
			ACTIVITY.package_created,
			'packages',
			result.id,
			`Created package: ${result.name}`
		);

		return result;
	}

	async update(id: number, data: Partial<Omit<Package, 'id' | 'createdBy' | 'createdAt' | 'updatedBy' | 'updatedAt'>>) {
		const userEntityId = this.getCurrentUserEntityId();

		const [result] = await this.db
			.update(packages)
			.set({
				...data,
				updatedBy: userEntityId,
				updatedAt: sql`strftime('%FT%H:%M:%fZ', 'now')`
			})
			.where(eq(packages.id, id))
			.returning();

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			result.partnerEntityId || null,
			ACTIVITY.package_updated,
			'packages',
			id,
			`Updated package`
		);

		return result;
	}

	async updateBasicDetails(id: number, data: { name: string; description?: string | null; partnerEntityId?: number | null; monthlyPriceCents?: number | null; currency?: string; relatedCampaignProfileId?: number; isActive?: boolean }, updatedByEntityId: number) {
		const [result] = await this.db
			.update(packages)
			.set({
				name: data.name,
				description: data.description || null,
				partnerEntityId: data.partnerEntityId || null,
				monthlyPriceCents: data.monthlyPriceCents || null,
				currency: data.currency || 'USD',
				relatedCampaignProfileId: data.relatedCampaignProfileId || null,
				isActive: data.isActive !== undefined ? data.isActive : true,
				updatedBy: updatedByEntityId,
				updatedAt: sql`strftime('%FT%H:%M:%fZ', 'now')`
			})
			.where(eq(packages.id, id))
			.returning();

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			result.partnerEntityId || null,
			ACTIVITY.package_updated,
			'packages',
			id,
			`Updated package basic details`
		);

		return result;
	}

	async updateField(id: number, field: string, value: any) {
		const userEntityId = this.getCurrentUserEntityId();

		const updateData = {
			[field]: value,
			updatedBy: userEntityId,
			updatedAt: sql`strftime('%FT%H:%M:%fZ', 'now')`
		};

		const [result] = await this.db
			.update(packages)
			.set(updateData)
			.where(eq(packages.id, id))
			.returning();

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			result.partnerEntityId || null,
			ACTIVITY.package_updated,
			'packages',
			id,
			`Updated field: ${field}`
		);

		return result;
	}

	async delete(id: number) {
		await this.db.delete(packages).where(eq(packages.id, id));

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			null,
			ACTIVITY.package_deleted,
			'packages',
			id,
			`Deleted package`
		);
	}

	async getNotes(packageId: number) {
		const packageNotes = await this.db
			.select({
				id: notes.id,
				content: notes.content,
				createdAt: notes.createdAt,
				createdByEntityId: notes.createdByEntityId,
				createdByName: sql<string>`(
					SELECT name 
					FROM entities 
					WHERE entities.id = ${notes.createdByEntityId}
				)`.as('createdByName')
			})
			.from(notes)
			.where(
				and(
					eq(notes.entityType, 'packages'),
					eq(notes.entityId, packageId),
					eq(notes.isCurrent, true),
					eq(notes.noteType, 'general')
				)
			)
			.orderBy(desc(notes.createdAt));
		
		return packageNotes;
	}

	async addNote(packageId: number, noteContent: string) {
		const userEntityId = this.getCurrentUserEntityId();

		const [result] = await this.db
			.insert(notes)
			.values({
				content: noteContent,
				entityType: 'packages',
				entityId: packageId,
				noteType: 'general',
				createdByEntityId: userEntityId,
				isInternal: true,
				isPinned: false,
				isCurrent: true,
				versionNumber: 1
			})
			.returning();

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			null,
			ACTIVITY.package_note_added,
			'packages',
			packageId,
			`Added note to package`
		);

		return result;
	}

	async getActivities(packageId: number) {
		return await getActivityForItem(this.db, 'packages', packageId);
	}

	async getServiceItems(packageId: number) {
		const result = await this.db
			.select({
				id: packageServiceItems.id,
				serviceItemId: packageServiceItems.serviceItemId,
				serviceItemName: serviceItems.name,
				serviceLabel: serviceItems.serviceLabel,
				quantity: packageServiceItems.quantity,
				frequency: packageServiceItems.frequency,
				monthlyValueCents: packageServiceItems.monthlyPriceCents,
				orderOverride: packageServiceItems.orderOverride,
				isPartnerSpecific: serviceItems.partnerEntityId,
				createdAt: packageServiceItems.createdAt
			})
			.from(packageServiceItems)
			.innerJoin(serviceItems, eq(packageServiceItems.serviceItemId, serviceItems.id))
			.where(eq(packageServiceItems.packageId, packageId))
			.orderBy(packageServiceItems.orderOverride, packageServiceItems.createdAt);
		
		return result.map(item => ({
			...item,
			isPartnerSpecific: !!item.isPartnerSpecific
		}));
	}

	async addServiceItem(packageId: number, data: {
		serviceItemId: number;
		quantity?: number;
		frequency?: string;
		monthlyValueCents?: number;
	}) {
		const userEntityId = this.getCurrentUserEntityId();

		// Get the service_label from serviceItems table
		const serviceItem = await this.db
			.select({ serviceLabel: serviceItems.serviceLabel })
			.from(serviceItems)
			.where(eq(serviceItems.id, data.serviceItemId))
			.limit(1);

		const [result] = await this.db
			.insert(packageServiceItems)
			.values({
				packageId,
				serviceItemId: data.serviceItemId,
				quantity: data.quantity || 1,
				frequency: data.frequency || 'monthly',
				monthlyPriceCents: data.monthlyValueCents || 0,
				uniqueServiceLabel: serviceItem[0]?.serviceLabel || null,
				createdBy: userEntityId,
				updatedBy: userEntityId
			})
			.returning();

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			null,
			ACTIVITY.package_updated,
			'packages',
			packageId,
			`Added service item to package`
		);

		return result;
	}

	async updateServiceItem(packageId: number, packageServiceItemId: number, data: {
		quantity?: number;
		frequency?: string;
		monthlyValueCents?: number;
		orderOverride?: number;
	}) {
		const userEntityId = this.getCurrentUserEntityId();


		await this.db
			.update(packageServiceItems)
			.set({
				quantity: data.quantity,
				frequency: data.frequency,
				monthlyPriceCents: data.monthlyValueCents,
				orderOverride: data.orderOverride,
				updatedBy: userEntityId,
				updatedAt: sql`strftime('%FT%H:%M:%fZ', 'now')`
			})
			.where(eq(packageServiceItems.id, packageServiceItemId));

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			null,
			ACTIVITY.package_updated,
			'packages',
			packageId,
			`Updated service item in package`
		);
	}

	async removeServiceItem(packageId: number, serviceItemId: number) {
		await this.db
			.delete(packageServiceItems)
			.where(
				and(
					eq(packageServiceItems.packageId, packageId),
					eq(packageServiceItems.serviceItemId, serviceItemId)
				)
			);

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			null,
			ACTIVITY.package_updated,
			'packages',
			packageId,
			`Removed service item from package`
		);
	}

	async getActionItems(packageId: number) {
		const result = await this.db
			.select({
				id: packageServiceActionItems.id,
				serviceItemId: packageServiceActionItems.serviceItemId,
				name: serviceItems.name,
				title: serviceItems.name,
				description: serviceItems.description,
				orderOverride: packageServiceActionItems.orderOverride,
				inOnboarding: packageServiceActionItems.inOnboarding,
				isPartnerSpecific: serviceItems.partnerEntityId,
			})
			.from(packageServiceActionItems)
			.innerJoin(serviceItems, eq(packageServiceActionItems.serviceItemId, serviceItems.id))
			.where(eq(packageServiceActionItems.packageId, packageId))
			.orderBy(packageServiceActionItems.orderOverride)
			.orderBy(serviceItems.name);

		return result;
	}

	async addActionItem(packageId: number, data: {
		serviceItemId: number;
		orderOverride?: number;
		inOnboarding?: boolean;
	}) {
		const userEntityId = this.getCurrentUserEntityId();

		if (!data.serviceItemId) {
			throw new Error('serviceItemId is required');
		}

		const [result] = await this.db
			.insert(packageServiceActionItems)
			.values({
				packageId,
				packageServiceItemId: null, // No service item linking - link directly to package
				serviceItemId: data.serviceItemId,
				orderOverride: data.orderOverride || null,
				inOnboarding: data.inOnboarding || false,
				createdBy: userEntityId,
				updatedBy: userEntityId
			})
			.returning();

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			null,
			ACTIVITY.package_updated,
			'packages',
			packageId,
			`Added action item to package`
		);

		return result;
	}

	async removeActionItem(packageId: number, serviceItemId: number) {
		await this.db
			.delete(packageServiceActionItems)
			.where(
				and(
					eq(packageServiceActionItems.packageId, packageId),
					eq(packageServiceActionItems.serviceItemId, serviceItemId)
				)
			);

		// Log the activity
		await createActivity(
			this.db,
			this.user?.id || 'system',
			null,
			ACTIVITY.package_updated,
			'packages',
			packageId,
			`Removed action item from package`
		);
	}

	async updateActionItemOrder(packageId: number, serviceItemId: number, newOrder: number) {
		const userEntityId = this.getCurrentUserEntityId();

		await this.db
			.update(packageServiceActionItems)
			.set({
				orderOverride: newOrder,
				updatedBy: userEntityId,
				updatedAt: sql`strftime('%FT%H:%M:%fZ', 'now')`
			})
			.where(
				and(
					eq(packageServiceActionItems.packageId, packageId),
					eq(packageServiceActionItems.serviceItemId, serviceItemId)
				)
			);
	}

	async getFullPackageForDuplication(packageId: number) {
		// Get the base package data
		const basePackage = await this.getById(packageId);
		if (!basePackage) {
			throw new Error('Package not found');
		}

		// Get service items
		const serviceItems = await this.getServiceItems(packageId);

		// Get action items
		const actionItems = await this.getActionItems(packageId);

		return {
			...basePackage,
			serviceItems,
			actionItems
		};
	}

	async duplicatePackage(sourcePackageId: number, newPackageData: {
		name: string;
		partnerEntityId?: number | null;
		monthlyPriceCents?: number | null;
		currency?: string;
		relatedCampaignProfileId?: number;
		description?: string | null;
		type?: string | null;
	}) {
		const userEntityId = this.getCurrentUserEntityId();

		// Get source package with all data
		const sourcePackage = await this.getFullPackageForDuplication(sourcePackageId);

		// Create the new package with provided data, but copy other fields from source
		const newPackageRecord = await this.create({
			name: newPackageData.name,
			partnerEntityId: newPackageData.partnerEntityId ?? sourcePackage.partnerEntityId,
			monthlyPriceCents: newPackageData.monthlyPriceCents ?? sourcePackage.monthlyPriceCents,
			currency: newPackageData.currency ?? sourcePackage.currency,
			relatedCampaignProfileId: newPackageData.relatedCampaignProfileId ?? sourcePackage.relatedCampaignProfileId,
			description: newPackageData.description ?? sourcePackage.description,
			type: newPackageData.type ?? sourcePackage.type,
		});

		// Copy service items
		for (const serviceItem of sourcePackage.serviceItems) {
			await this.addServiceItem(newPackageRecord.id, {
				serviceItemId: serviceItem.serviceItemId,
				quantity: serviceItem.quantity || 1,
				frequency: serviceItem.frequency || 'monthly',
				monthlyValueCents: serviceItem.monthlyValueCents || 0
			});
		}

		// Copy action items
		for (const actionItem of sourcePackage.actionItems) {
			await this.addActionItem(newPackageRecord.id, {
				serviceItemId: actionItem.serviceItemId,
				orderOverride: actionItem.orderOverride
			});
		}

		// Update package with considerations and outlines from source
		await this.updateField(newPackageRecord.id, 'campaignConsiderations', sourcePackage.campaignConsiderations);
		await this.updateField(newPackageRecord.id, 'presaleConsiderations', sourcePackage.presaleConsiderations);
		await this.updateField(newPackageRecord.id, 'phaseOneOutline', sourcePackage.phaseOneOutline);
		await this.updateField(newPackageRecord.id, 'ongoingPhaseOutline', sourcePackage.ongoingPhaseOutline);
		await this.updateField(newPackageRecord.id, 'seoGrowthOpportunities', sourcePackage.seoGrowthOpportunities);

		// Create activity log
		await createActivity(
			this.db,
			this.user?.id || 'system',
			null,
			ACTIVITY.package_updated,
			'packages',
			newPackageRecord.id,
			`Package duplicated from "${sourcePackage.name}"`
		);

		return newPackageRecord;
	}
}