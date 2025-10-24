// @ts-nocheck
import type { LayoutServerLoad } from './$types';

export const load = async ({ locals, url }: Parameters<LayoutServerLoad>[0]) => {
	const path = url.pathname;
	const avatar = locals.user && locals.user.picture;
	return {
		user: locals.user,
		permissions: locals.permissions,
		avatar,
		initials:
			(locals.user?.given_name?.charAt(0) ?? '') + (locals.user?.family_name?.charAt(0) ?? ''),
		path,
	};
};
