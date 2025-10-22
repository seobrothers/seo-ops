import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { dev } from '$app/environment';
import * as schema from './schema.js';

export function getDb(connectionString: string) {
	const client = postgres(connectionString, { prepare: false });
	return drizzle(client, { schema, logger: dev });
}

export function getHyperdriveDb(hyperdrive: any) {
	const client = postgres(hyperdrive.connectionString, { prepare: false });
	return drizzle(client, { schema, logger: dev });
}

export function createDb(platform?: App.Platform) {
	// Always use direct connection in development, regardless of platform availability
	if (dev || !platform?.env?.HYPERDRIVE) {
		// Development - use direct connection to dev Supabase
		const connectionString = process.env.DATABASE_URL;
		if (!connectionString) {
			throw new Error('DATABASE_URL environment variable not found');
		}
		return getDb(connectionString);
	} else {
		// Production - use Hyperdrive
		return getHyperdriveDb(platform.env.HYPERDRIVE);
	}
}

export type ORM = ReturnType<typeof getDb>;