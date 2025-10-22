import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';

export const user = pgTable('user', {
	id: serial('id').primaryKey(),
	age: integer('age'),
	createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow()
});

// Export type for use in repositories
export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
