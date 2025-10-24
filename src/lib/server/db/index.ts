import { drizzle } from 'drizzle-orm/d1';
import { dev } from '$app/environment';
import * as schema from './schema.js';
import type { D1Database } from '@cloudflare/workers-types';

export function createDb(d1: D1Database) {
	return drizzle(d1, { schema, logger: dev });
}

export type ORM = ReturnType<typeof createDb>;