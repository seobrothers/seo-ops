import { activities, individuals, employees, type RelatedTable } from '$lib/server/db/d1-schema';
import type { D1ORM } from '$lib/server/db';
import { eq, and, desc, inArray, getTableColumns, sql } from 'drizzle-orm';
import type { ActivityType } from '$lib/activity-types';

export async function getActivityForItem(db: D1ORM, table: RelatedTable, id: number) {
	const actCols = getTableColumns(activities);
	return await db
		.select({
			...actCols,
			actor: sql`CASE
        WHEN ${employees.entityId} IS NOT NULL
            THEN COALESCE(${employees.firstName}, '') || ' ' || COALESCE(${employees.lastName}, '')
        ELSE
            COALESCE(${individuals.firstName}, '') || ' ' || COALESCE(${individuals.lastName}, '')
        END`.as('name'),
		})
		.from(activities)
		.leftJoin(employees, eq(employees.externalAuthId, activities.userId))
		.leftJoin(individuals, eq(individuals.externalAuthId, activities.userId))
		.where(and(eq(activities.relatedTable, table), eq(activities.relatedId, id)))
		.orderBy(desc(activities.activityDate));
}

export type ActivityLog = Awaited<ReturnType<typeof getActivityForItem>>;

export async function getRecentActivity(db: D1ORM, limit = 20) {
	const actCols = getTableColumns(activities);
	return await db
		.select({
			...actCols,
			actor: sql`CASE
        WHEN ${employees.entityId} IS NOT NULL
            THEN COALESCE(${employees.firstName}, '') || ' ' || COALESCE(${employees.lastName}, '')
        ELSE
            COALESCE(${individuals.firstName}, '') || ' ' || COALESCE(${individuals.lastName}, '')
        END`.as('name'),
		})
		.from(activities)
		.leftJoin(employees, eq(employees.externalAuthId, activities.userId))
		.leftJoin(individuals, eq(individuals.externalAuthId, activities.userId))
		.orderBy(desc(activities.activityDate))
		.limit(limit);
}

export async function getActivityByUser(db: D1ORM, userId: string, limit = 50) {
	const actCols = getTableColumns(activities);
	return await db
		.select({
			...actCols,
			actor: sql`CASE
        WHEN ${employees.entityId} IS NOT NULL
            THEN COALESCE(${employees.firstName}, '') || ' ' || COALESCE(${employees.lastName}, '')
        ELSE
            COALESCE(${individuals.firstName}, '') || ' ' || COALESCE(${individuals.lastName}, '')
        END`.as('name'),
		})
		.from(activities)
		.leftJoin(employees, eq(employees.externalAuthId, activities.userId))
		.leftJoin(individuals, eq(individuals.externalAuthId, activities.userId))
		.where(eq(activities.userId, userId))
		.orderBy(desc(activities.activityDate))
		.limit(limit);
}

export async function getActivityForPartner(db: D1ORM, partnerId: number, limit = 50) {
	const actCols = getTableColumns(activities);
	return await db
		.select({
			...actCols,
			actor: sql`CASE
        WHEN ${employees.entityId} IS NOT NULL
            THEN COALESCE(${employees.firstName}, '') || ' ' || COALESCE(${employees.lastName}, '')
        ELSE
            COALESCE(${individuals.firstName}, '') || ' ' || COALESCE(${individuals.lastName}, '')
        END`.as('name'),
		})
		.from(activities)
		.leftJoin(employees, eq(employees.externalAuthId, activities.userId))
		.leftJoin(individuals, eq(individuals.externalAuthId, activities.userId))
		.where(eq(activities.partnerId, partnerId))
		.orderBy(desc(activities.activityDate))
		.limit(limit);
}

export async function getActivityByType(db: D1ORM, types: ActivityType[], limit = 50) {
	const actCols = getTableColumns(activities);
	return await db
		.select({
			...actCols,
			actor: sql`CASE
        WHEN ${employees.entityId} IS NOT NULL
            THEN COALESCE(${employees.firstName}, '') || ' ' || COALESCE(${employees.lastName}, '')
        ELSE
            COALESCE(${individuals.firstName}, '') || ' ' || COALESCE(${individuals.lastName}, '')
        END`.as('name'),
		})
		.from(activities)
		.leftJoin(employees, eq(employees.externalAuthId, activities.userId))
		.leftJoin(individuals, eq(individuals.externalAuthId, activities.userId))
		.where(inArray(activities.activityType, types))
		.orderBy(desc(activities.activityDate))
		.limit(limit);
}

export async function createActivity(
	db: D1ORM,
	userId: string,
	partnerId: number | null,
	activityType: ActivityType,
	relatedTable: RelatedTable,
	relatedId: number,
	details: string | null
) {
	const now = new Date().toISOString();
	return await db.insert(activities).values({
		userId,
		partnerId,
		activityType,
		activityDate: now,
		relatedId,
		relatedTable,
		details,
	});
}
