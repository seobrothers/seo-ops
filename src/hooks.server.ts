import { createDb } from '$lib/server/db';
import {
	sessionHooks,
	kindeAuthClient,
	type Handler,
	type EventHandler,
	type SessionManager,
} from '@kinde-oss/kinde-auth-sveltekit';
import { error, redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const ROUTE_ACCESS: { route: string; isPrefix?: boolean; perms?: string; isApi?: boolean }[] = [
	{ route: '/', perms: undefined },
	{ route: '/api/auth/', isPrefix: true, perms: undefined },
	{ route: '/api/internal/', isPrefix: true, perms: undefined, isApi: true }, // Internal worker-to-worker APIs, no auth required
	{ route: '/api/', isPrefix: true, perms: 'workbench:access', isApi: true },
	{ route: '/', isPrefix: true, perms: 'user:login' },
];

function canAccess(path: string, permissions: Set<string>) {
	for (const ra of ROUTE_ACCESS) {
		const isMatch = ra.isPrefix ? path.startsWith(ra.route) : path === ra.route;
		if (isMatch) {
			return ra.perms ? permissions.has(ra.perms) : true;
		}
	}
	return false;
}

function getKindeAuthSessionManager(event: EventHandler): [boolean, SessionManager] {
	for (const ra of ROUTE_ACCESS) {
		const isMatch = ra.isPrefix
			? event.url.pathname.startsWith(ra.route)
			: event.url.pathname === ra.route;
		if (isMatch) {
			if (ra.isApi) {
				// For API routes, we'd use bearer token auth (not implemented yet)
				break;
			} else {
				break;
			}
		}
	}
	sessionHooks({ event });
	return [false, event.request];
}

const handleDb: Handle = async ({ event, resolve }) => {
	try {
		if (!event.platform?.env?.DB) {
			throw new Error('Database binding not found');
		}
		event.locals.db = createDb(event.platform.env.DB);
	} catch (err) {
		console.error('Database connection error:', err);
		return error(500, 'Database connection failed');
	}
	const res = await resolve(event);
	return res;
};

const handleAuth: Handler = async ({ event, resolve }) => {
	const [isApi, sm] = getKindeAuthSessionManager(event);
	event.locals.permissions = new Set<string>();
	const isAuth = await kindeAuthClient.isAuthenticated(sm);
	console.log('Is Authenticated:', isAuth);
	if (isAuth) {
		const access = await kindeAuthClient.getPermissions(sm);
		const isWorkbenchUser = await kindeAuthClient.getBooleanFlag(sm, 'workbench-access', false);
		if (isWorkbenchUser) {
			event.locals.permissions = new Set(access.permissions);
			event.locals.permissions.add('user:login');
		}
		if (!isApi) {
			event.locals.user = await kindeAuthClient.getUser(sm);
		} else {
			const sub = (await kindeAuthClient.getClaimValue(sm, 'sub')) as string;
			event.locals.user = {
				id: sub,
				email: '',
				family_name: '',
				given_name: '',
				picture: '',
				phone: '',
			};
		}
	} else if (isApi) {
		error(403, 'Unauthorized');
	} else if (!canAccess(event.url.pathname, event.locals.permissions)) {
		redirect(303, `/api/auth/login?post_login_redirect_url=${event.url.pathname}`);
	}
	if (!canAccess(event.url.pathname, event.locals.permissions)) {
		console.log(
			`User ${event.locals.user?.given_name} cannot access ${event.url.pathname} with permissions: ${Array.from(event.locals.permissions).join(', ')}`
		);
		error(404);
	}
	const response = await resolve(event);
	return response;
};

export const handle: Handle = sequence(handleDb, handleAuth as Handle);
