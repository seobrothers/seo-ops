import { eq, sql } from 'drizzle-orm';
import type { ORM } from '../db/index.js';
import { user } from '../db/schema.js';
import type { NewUser } from '../db/schema.js';

export class UserRepository {
	constructor(private db: ORM) {}

	async getAllUsers() {
		return this.db.select().from(user);
	}

	async getUserById(id: number) {
		return this.db.select().from(user).where(eq(user.id, id));
	}

	async createUser(data: NewUser) {
		return this.db.insert(user).values(data).returning();
	}

	async updateUser(id: number, age: number) {
		return this.db
			.update(user)
			.set({ age, updatedAt: sql`NOW()` })
			.where(eq(user.id, id))
			.returning();
	}

	async deleteUser(id: number) {
		return this.db.delete(user).where(eq(user.id, id));
	}
}