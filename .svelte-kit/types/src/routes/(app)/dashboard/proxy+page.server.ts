// @ts-nocheck
import type { PageServerLoad } from './$types';
import { UserRepository } from '$lib/server/repositories/userRepository.js';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
	try {
		const userRepo = new UserRepository(locals.db);
		const users = await userRepo.getAllUsers();

		return {
			users
		};
	} catch (error) {
		console.error('Database error:', error);
		return {
			users: [],
			error: 'Failed to fetch users'
		};
	}
};