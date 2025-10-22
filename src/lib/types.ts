//import type { BadgeVariant } from '$lib/components/ui/badge';
import type { Component } from 'svelte';

export type Identifiable = { id: string | number };

export type NavItem = {
	label: string;
	url: string;
	icon: Component;
	perm?: string;
};

export type CollapsibleGroup = {
	label: string;
	icon: Component;
	items: NavItem[];
};

export type NavGroup = {
	label: string;
	items?: NavItem[];
	subgroups?: CollapsibleGroup[];
};