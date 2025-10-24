// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { UserType } from '@kinde-oss/kinde-auth-sveltekit';
import type { D1Database } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Platform {
			env: {
				DB: D1Database;
			};
			cf: CfProperties;
			ctx: ExecutionContext;
		}
		interface Locals {
			user?: UserType;
			permissions: Set<string>;
			db: import('$lib/server/db').ORM;
		}
	}
}

export {};
