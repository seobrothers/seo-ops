import { eq, ne, and, sql } from 'drizzle-orm';
import {
	employees,
	departments,
	entities,
	entityContacts,
	campaignAssignments,
	campaigns,
	entityRelationships,
	partners,
} from '../db/schema';
import { BaseRepository } from './d1-base-repository';
import type { BatchItem } from 'drizzle-orm/batch';
import { isError } from '$lib/utils';

export type FullEmployee = Awaited<
	ReturnType<InstanceType<typeof EmployeeRepository>['getAll']>
>[number];

export class EmployeeRepository extends BaseRepository {
	async countActive() {
		return await this.db.$count(employees, ne(employees.status, 'inactive'));
	}
	async getAll() {
		const res = await this.db
			.select({
				// Employee fields
				id: employees.entityId,
				firstName: employees.firstName,
				lastName: employees.lastName,
				title: employees.title,
				hireDate: employees.hireDate,
				status: employees.status,
				departmentId: employees.departmentId,
				hrId: employees.hrId,
				externalAuthId: employees.externalAuthId,
				// Entity fields
				name: entities.name,
				netsuiteId: entities.netsuiteId,
				avatar: entities.avatarUrl,
				entityCreatedAt: entities.createdAt,
				entityUpdatedAt: entities.updatedAt,
				// Department info
				departmentName: departments.name,
				// Email info
				email: entityContacts.contactValue,
			})
			.from(employees)
			.innerJoin(entities, eq(employees.entityId, entities.id))
			.leftJoin(departments, eq(employees.departmentId, departments.id))
			.leftJoin(
				entityContacts,
				and(
					eq(entities.id, entityContacts.entityId),
					eq(entityContacts.contactType, 'email'),
					eq(entityContacts.isPrimary, true)
				)
			)
			.orderBy(entities.name); // Changed to order by name instead of entityId

		return res;
	}

	async getById(id: number) {
		// First get basic employee info with department hierarchy
		const employee = await this.db
			.select({
				// Employee fields
				id: employees.entityId,
				firstName: employees.firstName,
				lastName: employees.lastName,
				title: employees.title,
				hireDate: employees.hireDate,
				status: employees.status,
				departmentId: employees.departmentId,
				externalAuthId: employees.externalAuthId,
				// Entity fields
				name: entities.name,
				netsuiteId: entities.netsuiteId,
				avatar: entities.avatarUrl,
				entityCreatedAt: entities.createdAt,
				entityUpdatedAt: entities.updatedAt,
				// Email info
				email: entityContacts.contactValue,
			})
			.from(employees)
			.innerJoin(entities, eq(employees.entityId, entities.id))
			.leftJoin(
				entityContacts,
				and(
					eq(entities.id, entityContacts.entityId),
					eq(entityContacts.contactType, 'email'),
					eq(entityContacts.isPrimary, true)
				)
			)
			.where(eq(employees.entityId, id))
			.get();

		if (!employee) {
			return null;
		}

		// Get department hierarchy
		const deptId = employee.departmentId;
		const d = deptId
			? await this.db.all<{ id: number; name: string; depth: number }>(sql`
			     WITH RECURSIVE ancestors(id, name, parent_id, depth) AS (
			       SELECT id, name, parent_department_id, 0 AS depth
			         FROM departments
			        WHERE id = ${deptId}
			       UNION ALL
			       SELECT d.id, d.name, d.parent_department_id, a.depth + 1
			         FROM departments d
			         JOIN ancestors a ON d.id = a.parent_id
			     )
			     SELECT id, name, depth
			       FROM ancestors
			    ORDER BY depth DESC
			    `)
			: [];

		const [c, p] = await this.db.batch([
			// Get campaign assignments
			this.db
				.select({
					campaignId: campaigns.id,
					siteUrl: campaigns.siteUrl,
					status: campaigns.status,
					role: campaignAssignments.role,
					assignedDate: campaignAssignments.assignedDate,
					partnerName: entities.name,
					partnerEntityId: campaigns.partnerEntityId,
				})
				.from(campaignAssignments)
				.innerJoin(campaigns, eq(campaignAssignments.campaignId, campaigns.id))
				.innerJoin(entities, eq(campaigns.partnerEntityId, entities.id))
				.where(
					and(eq(campaignAssignments.employeeEntityId, id), eq(campaignAssignments.isActive, true))
				)
				.orderBy(campaignAssignments.assignedDate),

			// Get partners they manage (account manager relationships)
			this.db
				.select({
					partnerEntityId: entities.id,
					partnerName: entities.name,
					status: partners.status,
					relationshipDate: entityRelationships.createdAt,
				})
				.from(entityRelationships)
				.innerJoin(entities, eq(entityRelationships.parentEntityId, entities.id))
				.innerJoin(partners, eq(entities.id, partners.entityId))
				.where(
					and(
						eq(entityRelationships.childEntityId, id),
						eq(entityRelationships.relationshipType, 'account_manager')
					)
				)
				.orderBy(entities.name),
		]);

		return {
			...employee,
			departments: d,
			campaigns: c,
			partners: p,
		};
	}

	async getForEdit(employeeId: number) {
		const res = await this.db
			.select({
				id: employees.entityId,
				first_name: employees.firstName,
				last_name: employees.lastName,
				title: employees.title,
				hire_date: employees.hireDate,
				status: employees.status,
				department_id: employees.departmentId,
				hr_id: employees.hrId,
				external_auth_id: employees.externalAuthId,
				netsuite_id: entities.netsuiteId,
				email: entityContacts.contactValue,
			})
			.from(employees)
			.innerJoin(entities, eq(employees.entityId, entities.id))
			.leftJoin(
				entityContacts,
				and(
					eq(entities.id, entityContacts.entityId),
					eq(entityContacts.contactType, 'email'),
					eq(entityContacts.isPrimary, true)
				)
			)
			.where(eq(employees.entityId, employeeId))
			.get();

		return res
			? {
					...res,
					title: res.title ?? undefined,
					hire_date: res.hire_date ?? undefined,
					hr_id: res.hr_id ?? undefined,
					external_auth_id: res.external_auth_id ?? undefined,
					netsuite_id: res.netsuite_id ?? undefined,
					email: res.email ?? undefined,
				}
			: res;
	}

	async getByEmail(email: string) {
		const res = await this.db
			.select({
				// Employee fields
				id: employees.entityId,
				firstName: employees.firstName,
				lastName: employees.lastName,
				title: employees.title,
				hireDate: employees.hireDate,
				status: employees.status,
				departmentId: employees.departmentId,
				hrId: employees.hrId,
				externalAuthId: employees.externalAuthId,
				// Entity fields
				name: entities.name,
				netsuiteId: entities.netsuiteId,
				entityCreatedAt: entities.createdAt,
				entityUpdatedAt: entities.updatedAt,
				// Department info
				departmentName: departments.name,
				// Email info
				email: entityContacts.contactValue,
			})
			.from(employees)
			.innerJoin(entities, eq(employees.entityId, entities.id))
			.innerJoin(
				entityContacts,
				and(eq(entities.id, entityContacts.entityId), eq(entityContacts.contactType, 'email'))
			)
			.leftJoin(departments, eq(employees.departmentId, departments.id))
			.where(eq(entityContacts.contactValue, email))
			.get();

		return res;
	}

	async getFromAuthId(aid: string) {
		try {
			const res = await this.db
				.select({
					id: employees.entityId,
					netsuiteId: entities.netsuiteId,
					firstName: employees.firstName,
					lastName: employees.lastName,
					avatar: entities.avatarUrl,
				})
				.from(employees)
				.innerJoin(entities, eq(employees.entityId, entities.id))
				.where(eq(employees.externalAuthId, aid))
				.get();

			return res;
		} catch (err) {
			const error = isError(err) ? err : new Error(`${err}`);
			console.error('Error fetching employee details.', {
				message: (error as any)?.message,
				stack: (error as any)?.stack,
				name: (error as any)?.name,
			});
			throw error;
		}
	}
	async setAuthId(id: number, aid: string) {
		await this.db
			.update(employees)
			.set({ externalAuthId: aid })
			.where(eq(employees.entityId, id))
			.run();
	}

	async getAllDepartments() {
		const res = await this.db
			.select({
				id: departments.id,
				name: departments.name,
				parentDepartmentId: departments.parentDepartmentId,
			})
			.from(departments)
			.orderBy(departments.name);

		return res;
	}

	async getEmployeeList() {
		const res = await this.db
			.select({
				id: employees.entityId,
				name: sql<string>`${employees.firstName} || ' ' || ${employees.lastName}`,
			})
			.from(employees)
			.where(ne(employees.status, 'inactive'))
			.orderBy(sql`${employees.firstName} || ' ' || ${employees.lastName}`);

		return res;
	}

	async save(employeeData: {
		id?: number; // entity ID if updating
		firstName: string;
		lastName: string;
		title?: string;
		hireDate?: string;
		status?: string;
		departmentId?: number;
		externalAuthId?: string;
		email?: string; // primary email
	}) {
		const isUpdate = !!employeeData.id;
		const fullName = `${employeeData.firstName} ${employeeData.lastName}`;
		const now = new Date().toISOString();

		if (isUpdate) {
			// Update existing employee
			const updateBatch: [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]] = [
				// Update entity
				this.db
					.update(entities)
					.set({
						name: fullName,
						updatedAt: now,
					})
					.where(eq(entities.id, employeeData.id!)),

				// Update employee
				this.db
					.update(employees)
					.set({
						firstName: employeeData.firstName,
						lastName: employeeData.lastName,
						title: employeeData.title,
						hireDate: employeeData.hireDate,
						status: employeeData.status || 'active',
						departmentId: employeeData.departmentId,
						externalAuthId: employeeData.externalAuthId,
					})
					.where(eq(employees.entityId, employeeData.id!)),
			];

			// Update primary email if provided
			if (employeeData.email) {
				updateBatch.push(
					this.db
						.update(entityContacts)
						.set({
							contactValue: employeeData.email,
						})
						.where(
							and(
								eq(entityContacts.entityId, employeeData.id!),
								eq(entityContacts.contactType, 'email'),
								eq(entityContacts.isPrimary, true)
							)
						)
				);
			}

			await this.db.batch(updateBatch);
			return employeeData.id!;
		} else {
			// Create new employee
			const createBatch: [BatchItem<'sqlite'>, ...BatchItem<'sqlite'>[]] = [
				// Create entity
				this.db.insert(entities).values({
					entityType: 'employee',
					name: fullName,
				}),

				// Create employee (uses last_insert_rowid)
				this.db.insert(employees).values({
					entityId: sql`last_insert_rowid()`,
					firstName: employeeData.firstName,
					lastName: employeeData.lastName,
					title: employeeData.title,
					hireDate: employeeData.hireDate,
					status: employeeData.status || 'active',
					departmentId: employeeData.departmentId,
					externalAuthId: employeeData.externalAuthId,
				}),
			];

			// Add primary email if provided
			if (employeeData.email) {
				createBatch.push(
					this.db.insert(entityContacts).values({
						entityId: sql`last_insert_rowid()`,
						contactType: 'email',
						contactValue: employeeData.email,
						isPrimary: true,
						contactLabel: 'work',
					})
				);
			}

			const results = await this.db.batch(createBatch);

			// Return the new entity ID
			return results[0].meta.last_row_id as number;
		}
	}
}
