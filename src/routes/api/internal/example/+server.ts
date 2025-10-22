import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Internal API Route - Worker-to-Worker Communication
 *
 * These routes are accessible only to internal workers via service bindings.
 * Auth is bypassed for these routes (see /src/hooks.server.ts ROUTE_ACCESS).
 *
 * Usage from a worker:
 * const response = await env.WORKBENCH.fetch('/api/internal/example', {
 *   method: 'POST',
 *   body: JSON.stringify({ ... })
 * });
 *
 * Optional: Add header validation to ensure requests come from known workers
 */

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Optional: Validate request is from a known internal source
		// const origin = request.headers.get('origin');
		// if (origin && !['https://worker-a.example.com'].includes(origin)) {
		//   error(403, 'Forbidden');
		// }

		const body = await request.json();

		// Your logic here - you have access to:
		// - locals.db (database connection)
		// - locals.user (optional, may be null for internal calls)
		// - body (request payload)

		return json({
			success: true,
			message: 'Internal API call processed',
		});
	} catch (err) {
		console.error('Internal API error:', err);
		error(500, 'Internal server error');
	}
};
