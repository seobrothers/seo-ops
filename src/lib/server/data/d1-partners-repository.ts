import { like, eq, ne, and, or, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import {
	entities,
	partners,
	campaigns,
	companies,
	entityRelationships,
	individuals,
	entityContacts,
	notes,
	rules,
	serviceCategories,
} from '../db/schema';
import { BaseRepository } from './d1-base-repository';
import type { BatchItem } from 'drizzle-orm/batch';
import type { PartnerFormData } from '$lib/forms/partners/partner-schema';

export type FullPartner = Awaited<
	ReturnType<InstanceType<typeof PartnersRepository>['getAll']>
>[number];
export class PartnersRepository extends BaseRepository {
	async getAll() {
		const res = await this.db
			.select({
				// Partner fields
				id: partners.entityId,
				externalId: partners.externalId,
				demoDate: partners.demoDate,
				demoByEntityId: partners.demoByEntityId,
				msaSigned: partners.msaSigned,
				msaSignedDate: partners.msaSignedDate,
				startDate: partners.startDate,
				status: partners.status,
				acquisitionSource: partners.acquisitionSource,
				totalMonthlyRevenue: partners.totalMonthlyRevenue,
				availableCurrencies: partners.availableCurrencies,
				defaultCurrency: partners.defaultCurrency,
				analyticsFolderId: partners.analyticsFolderId,
				googleDriveLink: partners.googleDriveLink,
				createdAt: partners.createdAt,
				updatedAt: partners.updatedAt,
				// Entity fields
				name: entities.name,
				netsuiteId: entities.netsuiteId,
				logo: entities.avatarUrl,
				entityCreatedAt: entities.createdAt,
				entityUpdatedAt: entities.updatedAt,
			})
			.from(partners)
			.innerJoin(entities, eq(partners.entityId, entities.id))
			.where(or(like(partners.externalId, 'CUS%'), isNull(partners.externalId)))
			.orderBy(partners.externalId);
		return res.map((partner) => ({
			...partner,
			availableCurrenciesArray: partner.availableCurrencies?.split(',').map((c) => c.trim()) || [],
		}));
	}
	async getAllNames() {
		const res = await this.db
			.select({
				id: partners.entityId,
				externalId: partners.externalId,
				name: entities.name,
			})
			.from(partners)
			.innerJoin(entities, eq(partners.entityId, entities.id))
			.where(and(like(partners.externalId, 'CUS%'), ne(partners.status, 'inactive')))
			.orderBy(entities.name);
		return res;
	}
	async countActive() {
		return await this.db.$count(partners, ne(partners.status, 'inactive'));
	}
	async getById(id: number) {
		const managerEntity = alias(entities, 'managerEntity');

		const res = await this.db
			.select({
				// Partner fields
				id: partners.entityId,
				externalId: partners.externalId,
				demoDate: partners.demoDate,
				demoByEntityId: partners.demoByEntityId,
				msaSigned: partners.msaSigned,
				msaSignedDate: partners.msaSignedDate,
				startDate: partners.startDate,
				status: partners.status,
				acquisitionSource: partners.acquisitionSource,
				totalMonthlyRevenue: partners.totalMonthlyRevenue,
				availableCurrencies: partners.availableCurrencies,
				defaultCurrency: partners.defaultCurrency,
				analyticsFolderId: partners.analyticsFolderId,
				googleDriveLink: partners.googleDriveLink,
				isOnboarded: partners.isOnboarded,
				createdAt: partners.createdAt,
				updatedAt: partners.updatedAt,
				// Entity fields
				name: entities.name,
				netsuiteId: entities.netsuiteId,
				logo: entities.avatarUrl,
				entityCreatedAt: entities.createdAt,
				entityUpdatedAt: entities.updatedAt,
				// Company fields
				companyLegalName: companies.legalName,
				industry: companies.industry,
				// Account manager fields
				accountManageRelId: entityRelationships.id,
				accountManagerId: entityRelationships.childEntityId,
				accountManagerName: managerEntity.name,
			})
			.from(partners)
			.innerJoin(entities, eq(partners.entityId, entities.id))
			.innerJoin(companies, eq(entities.id, companies.entityId))
			.leftJoin(
				entityRelationships,
				and(
					eq(partners.entityId, entityRelationships.parentEntityId),
					eq(entityRelationships.relationshipType, 'account_manager')
				)
			)
			.leftJoin(managerEntity, eq(entityRelationships.childEntityId, managerEntity.id))
			.where(eq(partners.entityId, id))
			.get();

		return !res
			? undefined
			: {
					...res,
					availableCurrenciesArray: res?.availableCurrencies?.split(',').map((c) => c.trim()) || [],
				};
	}

	async getForEdit(partnerId: number) {
		const result = await this.db
			.select({
				// Entity fields
				id: entities.id,
				name: entities.name,
				netsuiteId: entities.netsuiteId,
				logo: entities.avatarUrl,

				// Company fields
				legalName: companies.legalName,
				businessRegistrationNumber: companies.businessRegistrationNumber,
				industry: companies.industry,
				size: companies.size,

				// Partner fields
				demoDate: partners.demoDate,
				demoByEntityId: partners.demoByEntityId,
				msaSigned: partners.msaSigned,
				msaSignedDate: partners.msaSignedDate,
				startDate: partners.startDate,
				status: partners.status,
				acquisitionSource: partners.acquisitionSource,
				totalMonthlyRevenue: partners.totalMonthlyRevenue,
				availableCurrencies: partners.availableCurrencies,
				defaultCurrency: partners.defaultCurrency,
				analyticsFolderId: partners.analyticsFolderId,
				googleDriveLink: partners.googleDriveLink,
				externalId: partners.externalId,

				billingAddress: entityContacts.contactValue,
				billingAddressId: entityContacts.id,
			})
			.from(entities)
			.innerJoin(partners, eq(entities.id, partners.entityId))
			.leftJoin(companies, eq(entities.id, companies.entityId))
			.leftJoin(
				entityContacts,
				and(
					eq(entities.id, entityContacts.entityId),
					eq(entityContacts.contactType, 'address'),
					eq(entityContacts.contactLabel, 'billing')
				)
			)
			.where(eq(partners.entityId, partnerId))
			.limit(1);

		if (result.length === 0) {
			return null;
		}

		const data = result[0];

		// Transform the data to match the form schema
		return {
			id: data.id,
			name: data.name || '',
			netsuiteId: data.netsuiteId ?? undefined,
			logo: data.logo ?? '',
			legalName: data.legalName ?? '',
			businessRegistrationNumber: data.businessRegistrationNumber ?? '',
			industry: data.industry ?? '',
			size: data.size ?? '',
			demoDate: data.demoDate ?? '',
			demoByEntityId: data.demoByEntityId ?? undefined,
			msaSigned: data.msaSigned ?? false,
			msaSignedDate: data.msaSignedDate ?? '',
			startDate: data.startDate ?? '',
			status: data.status,
			acquisitionSource: data.acquisitionSource ?? '',
			totalMonthlyRevenue: data.totalMonthlyRevenue ?? undefined,
			availableCurrencies: data.availableCurrencies ?? '',
			defaultCurrency: data.defaultCurrency ?? '',
			analyticsFolderId: data.analyticsFolderId ?? '',
			googleDriveLink: data.googleDriveLink ?? '',
			externalId: data.externalId ?? '',
			billingAddress: data.billingAddress ?? '',
			billingAddressId: data.billingAddressId ?? undefined,
		};
	}

	async getByCampaign(campaignId: number) {
		const res = await this.db
			.select({
				// Partner fields
				id: partners.entityId,
				externalId: partners.externalId,
				demoDate: partners.demoDate,
				demoByEntityId: partners.demoByEntityId,
				msaSigned: partners.msaSigned,
				msaSignedDate: partners.msaSignedDate,
				status: partners.status,
				startDate: partners.startDate,
				acquisitionSource: partners.acquisitionSource,
				totalMonthlyRevenue: partners.totalMonthlyRevenue,
				availableCurrencies: partners.availableCurrencies,
				defaultCurrency: partners.defaultCurrency,
				analyticsFolderId: partners.analyticsFolderId,
				googleDriveLink: partners.googleDriveLink,
				createdAt: partners.createdAt,
				updatedAt: partners.updatedAt,
				// Entity fields
				name: entities.name,
				netsuiteId: entities.netsuiteId,
				logo: entities.avatarUrl,
				entityCreatedAt: entities.createdAt,
				entityUpdatedAt: entities.updatedAt,
			})
			.from(partners)
			.innerJoin(entities, eq(partners.entityId, entities.id))
			.innerJoin(campaigns, eq(partners.entityId, campaigns.partnerEntityId))
			.where(eq(campaigns.id, campaignId))
			.get();

		return !res
			? undefined
			: {
					...res,
					availableCurrenciesArray: res?.availableCurrencies?.split(',').map((c) => c.trim()) || [],
				};
	}

	async getNotes(partnerId: number) {
		const partnerNotes = await this.db
			.select()
			.from(notes)
			.where(
				and(
					eq(notes.entityId, partnerId),
					eq(notes.entityType, 'partner'),
					eq(notes.isCurrent, true)
				)
			)
			.orderBy(notes.noteType, notes.createdAt);

		// Group notes by type
		const notesByType = partnerNotes.reduce(
			(acc, note) => {
				if (!acc[note.noteType]) {
					acc[note.noteType] = [];
				}
				acc[note.noteType].push(note);
				return acc;
			},
			{} as Record<(typeof partnerNotes)[number]['noteType'], typeof partnerNotes>
		);

		return notesByType;
	}

	async getRules(partnerId: number) {
		const partnerRules = await this.db
			.select({
				id: rules.id,
				campaignId: rules.campaignId,
				partnerEntityId: rules.partnerEntityId,
				ruleReason: rules.ruleReason,
				ruleValue: rules.ruleValue,
				serviceCategoryId: rules.serviceCategoryId,
				serviceCategoryName: serviceCategories.displayName,
				serviceItemId: rules.serviceItemId,
				referenceUrl: rules.referenceUrl,
				status: rules.status,
				createdAt: rules.createdAt,
				createdBy: rules.createdBy,
				updatedAt: rules.updatedAt,
				updatedBy: rules.updatedBy,
			})
			.from(rules)
			.leftJoin(serviceCategories, eq(rules.serviceCategoryId, serviceCategories.id))
			.where(
				and(
					eq(rules.partnerEntityId, partnerId),
					eq(rules.status, 'active')
				)
			)
			.orderBy(rules.serviceCategoryId, rules.ruleReason);

		return partnerRules;
	}

	/**
	 * Create a new rule for a partner
	 */
	async createRule(partnerId: number, data: {
		serviceCategoryId: number | null;
		ruleReason: string;
		ruleValue: string;
		createdBy: number;
	}) {
		const now = new Date().toISOString();

		await this.db.insert(rules).values({
			partnerEntityId: partnerId,
			serviceCategoryId: data.serviceCategoryId,
			ruleReason: data.ruleReason,
			ruleValue: data.ruleValue,
			status: 'active',
			createdAt: now,
			createdBy: data.createdBy,
			updatedAt: now,
			updatedBy: data.createdBy,
		});
	}

	/**
	 * Update an existing rule
	 */
	async updateRule(ruleId: number, data: {
		serviceCategoryId: number | null;
		ruleValue: string;
		updatedBy: number;
	}) {
		const now = new Date().toISOString();

		await this.db
			.update(rules)
			.set({
				serviceCategoryId: data.serviceCategoryId,
				ruleValue: data.ruleValue,
				updatedAt: now,
				updatedBy: data.updatedBy,
			})
			.where(eq(rules.id, ruleId));
	}

	/**
	 * Archive a rule (soft delete by setting status to archived)
	 */
	async archiveRule(ruleId: number, updatedBy: number) {
		const now = new Date().toISOString();

		await this.db
			.update(rules)
			.set({
				status: 'archived',
				updatedAt: now,
				updatedBy: updatedBy,
			})
			.where(eq(rules.id, ruleId));
	}

	async createProspect(
		data: { companyName: string; firstName: string; lastName: string; email: string },
		kindeUserId: string
	) {
		// Batch 1: Create both entities and get their IDs
		const newEntities = await this.db
			.insert(entities)
			.values([
				{
					entityType: 'company',
					name: data.companyName,
				},
				{
					entityType: 'individual',
					name: `${data.firstName} ${data.lastName}`,
				},
			])
			.returning({ id: entities.id });

		const companyEntityId = newEntities[0].id;
		const individualEntityId = newEntities[1].id;

		// Batch 2: Create all the detail records, contacts, and relationships
		await this.db.batch([
			this.db.insert(companies).values({
				entityId: companyEntityId,
				legalName: data.companyName,
			}),

			this.db.insert(individuals).values({
				entityId: individualEntityId,
				firstName: data.firstName,
				lastName: data.lastName,
				externalAuthId: kindeUserId,
			}),

			this.db.insert(partners).values({
				entityId: companyEntityId,
				status: 'prospect',
			}),

			this.db.insert(entityContacts).values({
				entityId: individualEntityId,
				contactType: 'email',
				contactValue: data.email,
				isPrimary: true,
				contactLabel: 'work',
			}),

			this.db.insert(entityRelationships).values({
				parentEntityId: companyEntityId,
				childEntityId: individualEntityId,
				relationshipType: 'contact',
				relationshipSubtype: 'primary',
			}),
		]);

		// Return the created entities and partner info
		return {
			contact: {
				id: individualEntityId,
				name: `${data.firstName} ${data.lastName}`,
				firstName: data.firstName,
				lastName: data.lastName,
				email: data.email,
				externalAuthId: kindeUserId,
			},
			partner: {
				id: companyEntityId,
				name: data.companyName,
				status: 'prospect' as const,
			},
		};
	}
	async updatePartnerProfile(
		partnerEntityId: number,
		data: {
			// Partner table fields
			acquisitionSource?: string;
			totalMonthlyRevenue?: number;
			availableCurrencies?: string;
			defaultCurrency?: string;
			analyticsFolderId?: string;
			googleDriveLink?: string;
			externalId?: string;

			// Company table fields (will be updated via company record)
			size?: string;
			legalName?: string;
			businessRegistrationNumber?: string;
			industry?: string;
		}
	) {
		const updateQueries: BatchItem<'sqlite'>[] = [];

		// Prepare partner table updates
		const partnerUpdates: Partial<typeof partners.$inferInsert> = {};
		if (data.acquisitionSource !== undefined)
			partnerUpdates.acquisitionSource = data.acquisitionSource;
		if (data.totalMonthlyRevenue !== undefined)
			partnerUpdates.totalMonthlyRevenue = data.totalMonthlyRevenue;
		if (data.availableCurrencies !== undefined)
			partnerUpdates.availableCurrencies = data.availableCurrencies;
		if (data.defaultCurrency !== undefined) partnerUpdates.defaultCurrency = data.defaultCurrency;
		if (data.analyticsFolderId !== undefined)
			partnerUpdates.analyticsFolderId = data.analyticsFolderId;
		if (data.googleDriveLink !== undefined) partnerUpdates.googleDriveLink = data.googleDriveLink;
		if (data.externalId !== undefined) partnerUpdates.externalId = data.externalId;

		// Add partner update query if there are fields to update
		if (Object.keys(partnerUpdates).length > 0) {
			partnerUpdates.updatedAt = new Date().toISOString();
			updateQueries.push(
				this.db.update(partners).set(partnerUpdates).where(eq(partners.entityId, partnerEntityId))
			);
		}

		// Prepare company table updates
		const companyUpdates: Partial<typeof companies.$inferInsert> = {};
		if (data.size !== undefined) companyUpdates.size = data.size;
		if (data.legalName !== undefined) companyUpdates.legalName = data.legalName;
		if (data.businessRegistrationNumber !== undefined)
			companyUpdates.businessRegistrationNumber = data.businessRegistrationNumber;
		if (data.industry !== undefined) companyUpdates.industry = data.industry;

		// Add company update query if there are fields to update
		if (Object.keys(companyUpdates).length > 0) {
			updateQueries.push(
				this.db.update(companies).set(companyUpdates).where(eq(companies.entityId, partnerEntityId))
			);
		}

		// Execute all updates in a batch if there are any
		if (updateQueries.length > 0) {
			await this.db.batch(updateQueries as [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]]);
		}

		return {
			updated: updateQueries.length > 0,
			partnerFieldsUpdated: Object.keys(partnerUpdates).length > 0,
			companyFieldsUpdated: Object.keys(companyUpdates).length > 0,
		};
	}

	async addAccountManager(
		partnerId: number,
		{ employeeId, relationshipId }: { employeeId: number; relationshipId?: number | null }
	): Promise<void> {
		if (relationshipId) {
			await this.db
				.update(entityRelationships)
				.set({
					parentEntityId: partnerId,
					childEntityId: employeeId,
					relationshipType: 'account_manager',
					createdAt: new Date().toISOString(),
				})
				.where(eq(entityRelationships.id, relationshipId));
		} else {
			await this.db.insert(entityRelationships).values({
				parentEntityId: partnerId,
				childEntityId: employeeId,
				relationshipType: 'account_manager',
			});
		}
	}

	async save(partnerId: number | null, formData: PartnerFormData): Promise<number> {
		if (partnerId) {
			// Update existing partner
			const entityId: number = partnerId;

			// Prepare batch operations
			const batchOperations: [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]] = [
				this.db
					.update(entities)
					.set({
						name: formData.name,
						netsuiteId: formData.netsuiteId || null,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(entities.id, entityId)),
			];

			// Update existing company
			batchOperations.push(
				this.db
					.update(companies)
					.set({
						legalName: formData.legalName || null,
						businessRegistrationNumber: formData.businessRegistrationNumber || null,
						industry: formData.industry || null,
						size: formData.size || null,
					})
					.where(eq(companies.entityId, entityId))
			);

			// Update partner
			batchOperations.push(
				this.db
					.update(partners)
					.set({
						demoDate: formData.demoDate || null,
						demoByEntityId: formData.demoByEntityId || null,
						msaSigned: formData.msaSigned,
						msaSignedDate: formData.msaSignedDate || null,
						startDate: formData.startDate || null,
						status: formData.status,
						acquisitionSource: formData.acquisitionSource || null,
						totalMonthlyRevenue: formData.totalMonthlyRevenue || null,
						availableCurrencies: formData.availableCurrencies || null,
						defaultCurrency: formData.defaultCurrency || null,
						analyticsFolderId: formData.analyticsFolderId || null,
						googleDriveLink: formData.googleDriveLink || null,
						externalId: formData.externalId || null,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(partners.entityId, entityId))
			);

			if (formData.billingAddressId) {
				// Update existing contact method
				batchOperations.push(
					this.db
						.update(entityContacts)
						.set({
							contactValue: formData.billingAddress,
						})
						.where(eq(entityContacts.id, formData.billingAddressId))
				);
			} else {
				// Create new contact method
				batchOperations.push(
					// @ts-expect-error So weird this errors here and not below.
					this.db.insert(entityContacts).values({
						entityId,
						contactType: 'address',
						contactValue: formData.billingAddress,
						contactLabel: 'billing',
						isPrimary: true,
					})
				);
			}

			// Execute batch
			await this.db.batch(batchOperations);
			return entityId;
		} else {
			// Create new partner
			// First create the entity and get its ID
			const entityResult = await this.db
				.insert(entities)
				.values({
					entityType: 'company',
					name: formData.name,
					netsuiteId: formData.netsuiteId || null,
				})
				.returning({ id: entities.id });

			const entityId = entityResult[0].id;

			// Prepare batch operations for related records
			const batchOperations: [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]] = [
				this.db.insert(partners).values({
					entityId,
					demoDate: formData.demoDate || null,
					demoByEntityId: formData.demoByEntityId || null,
					msaSigned: formData.msaSigned,
					msaSignedDate: formData.msaSignedDate || null,
					startDate: formData.startDate || null,
					status: formData.status,
					acquisitionSource: formData.acquisitionSource || null,
					totalMonthlyRevenue: formData.totalMonthlyRevenue || null,
					availableCurrencies: formData.availableCurrencies || null,
					defaultCurrency: formData.defaultCurrency || null,
					analyticsFolderId: formData.analyticsFolderId || null,
					googleDriveLink: formData.googleDriveLink || null,
					externalId: formData.externalId || null,
				}),
			];

			// Create company record if any company fields are provided

			batchOperations.push(
				this.db.insert(companies).values({
					entityId,
					legalName: formData.legalName || formData.name,
					businessRegistrationNumber: formData.businessRegistrationNumber || null,
					industry: formData.industry || null,
					size: formData.size || null,
				})
			);

			// Create new contact method
			if (formData.billingAddress) {
				batchOperations.push(
					this.db.insert(entityContacts).values({
						entityId,
						contactType: 'address',
						contactValue: formData.billingAddress,
						contactLabel: 'billing',
						isPrimary: true,
					})
				);
			}

			// Execute batch operations
			await this.db.batch(batchOperations);
			return entityId;
		}
	}

	async getContactEmails(partnerId: number): Promise<{ name: string; address: string }[]> {
		const emailContacts = await this.db
			.select({
				email: entityContacts.contactValue,
				firstName: individuals.firstName,
				lastName: individuals.lastName,
				entityName: entities.name,
				entityType: entities.entityType,
			})
			.from(entityContacts)
			.innerJoin(
				entityRelationships,
				eq(entityContacts.entityId, entityRelationships.childEntityId)
			)
			.innerJoin(entities, eq(entityContacts.entityId, entities.id))
			.leftJoin(individuals, eq(entities.id, individuals.entityId))
			.where(
				and(
					eq(entityRelationships.parentEntityId, partnerId),
					eq(entityRelationships.relationshipType, 'contact'),
					eq(entityContacts.contactType, 'email')
				)
			);

		return emailContacts.map((contact) => ({
			name:
				contact.firstName && contact.lastName
					? `${contact.firstName} ${contact.lastName}`
					: contact.entityName,
			address: contact.email,
		}));
	}
}
