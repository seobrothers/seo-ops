import type { RequestEvent } from '@sveltejs/kit';
import type { D1ORM } from '../db';
import type { UserType } from '@kinde-oss/kinde-auth-sveltekit';

export class BaseRepository {
	db: D1ORM;
	user: UserType | undefined;
	permissions: Set<string>;
	fetch: RequestEvent['fetch'];
	entityId: number;

	constructor(event: RequestEvent) {
		this.db = event.locals.db;
		this.user = event.locals.user;
		this.permissions = event.locals.permissions;
		this.fetch = event.fetch;
		this.entityId = event.locals.employee?.id ?? event.locals.contact?.id ?? 0;
	}
}
