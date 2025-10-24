import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle/migrations',
	dialect: 'sqlite',
	driver: 'd1-http',
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
		databaseId: '24ff2fe8-80b2-4474-8fd4-7876c2836fff',
		token: process.env.CLOUDFLARE_D1_TOKEN!
	},
	verbose: true,
	strict: true
});
