// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { UserType } from '@kinde-oss/kinde-auth-sveltekit';

declare global {
	namespace App {
		interface Platform {
			env: {
				HYPERDRIVE: Hyperdrive;
				DATABASE_URL?: string;
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
