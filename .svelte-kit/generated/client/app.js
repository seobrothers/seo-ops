export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26'),
	() => import('./nodes/27'),
	() => import('./nodes/28'),
	() => import('./nodes/29'),
	() => import('./nodes/30'),
	() => import('./nodes/31'),
	() => import('./nodes/32'),
	() => import('./nodes/33'),
	() => import('./nodes/34'),
	() => import('./nodes/35')
];

export const server_loads = [2];

export const dictionary = {
		"/(base)": [~35],
		"/(app)/dashboard": [~4,[2]],
		"/(app)/ops/access-items": [~5,[2,3]],
		"/(app)/ops/access-items/new": [~8,[2,3]],
		"/(app)/ops/access-items/[id]/edit": [~6,[2,3]],
		"/(app)/ops/access-items/[id]/view": [~7,[2,3]],
		"/(app)/ops/campaign-onboarding": [~9,[2,3]],
		"/(app)/ops/campaign-onboarding/new": [~11,[2,3]],
		"/(app)/ops/campaign-onboarding/[id]/edit": [~10,[2,3]],
		"/(app)/ops/campaign-profiles": [~12,[2,3]],
		"/(app)/ops/campaign-profiles/new": [~14,[2,3]],
		"/(app)/ops/campaign-profiles/[id]": [~13,[2,3]],
		"/(app)/ops/packages": [~15,[2,3]],
		"/(app)/ops/packages/new": [~17,[2,3]],
		"/(app)/ops/packages/[id]": [~16,[2,3]],
		"/(app)/ops/partner-onboarding": [~18,[2,3]],
		"/(app)/ops/partner-onboarding/new": [~20,[2,3]],
		"/(app)/ops/partner-onboarding/[id]/edit": [~19,[2,3]],
		"/(app)/ops/permissions": [~21,[2,3]],
		"/(app)/ops/permissions/new": [~23,[2,3]],
		"/(app)/ops/permissions/[id]/edit": [~22,[2,3]],
		"/(app)/ops/scope-items": [~24,[2,3]],
		"/(app)/ops/scope-items/new": [~27,[2,3]],
		"/(app)/ops/scope-items/[id]": [~25,[2,3]],
		"/(app)/ops/scope-items/[itemId]/edit": [~26,[2,3]],
		"/(app)/ops/service-catalog": [~28,[2,3]],
		"/(app)/ops/service-catalog/new": [~31,[2,3]],
		"/(app)/ops/service-catalog/[id]": [~29,[2,3]],
		"/(app)/ops/service-catalog/[itemId]/edit": [~30,[2,3]],
		"/(app)/ops/service-categories": [~32,[2,3]],
		"/(app)/ops/service-categories/new": [~34,[2,3]],
		"/(app)/ops/service-categories/[categoryId]/edit": [~33,[2,3]]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';