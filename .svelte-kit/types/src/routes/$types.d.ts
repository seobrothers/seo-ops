import type * as Kit from '@sveltejs/kit';

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
// @ts-ignore
type MatcherParam<M> = M extends (param : string) => param is infer U ? U extends string ? U : string : string;
type RouteParams = {  };
type RouteId = '/';
type MaybeWithVoid<T> = {} extends T ? T | void : T;
export type RequiredKeys<T> = { [K in keyof T]-?: {} extends { [P in K]: T[K] } ? never : K; }[keyof T];
type OutputDataShape<T> = MaybeWithVoid<Omit<App.PageData, RequiredKeys<T>> & Partial<Pick<App.PageData, keyof T & keyof App.PageData>> & Record<string, any>>
type EnsureDefined<T> = T extends null | undefined ? {} : T;
type OptionalUnion<U extends Record<string, any>, A extends keyof U = U extends U ? keyof U : never> = U extends unknown ? { [P in Exclude<A, keyof U>]?: never } & U : never;
export type Snapshot<T = any> = Kit.Snapshot<T>;
type LayoutRouteId = RouteId | "/(app)/dashboard" | "/(app)/ops/access-items" | "/(app)/ops/access-items/[id]/edit" | "/(app)/ops/access-items/[id]/view" | "/(app)/ops/access-items/new" | "/(app)/ops/campaign-onboarding" | "/(app)/ops/campaign-onboarding/[id]/edit" | "/(app)/ops/campaign-onboarding/new" | "/(app)/ops/campaign-profiles" | "/(app)/ops/campaign-profiles/[id]" | "/(app)/ops/campaign-profiles/new" | "/(app)/ops/packages" | "/(app)/ops/packages/[id]" | "/(app)/ops/packages/new" | "/(app)/ops/partner-onboarding" | "/(app)/ops/partner-onboarding/[id]/edit" | "/(app)/ops/partner-onboarding/new" | "/(app)/ops/permissions" | "/(app)/ops/permissions/[id]/edit" | "/(app)/ops/permissions/new" | "/(app)/ops/scope-items" | "/(app)/ops/scope-items/[id]" | "/(app)/ops/scope-items/[itemId]/edit" | "/(app)/ops/scope-items/new" | "/(app)/ops/service-catalog" | "/(app)/ops/service-catalog/[id]" | "/(app)/ops/service-catalog/[itemId]/edit" | "/(app)/ops/service-catalog/new" | "/(app)/ops/service-categories" | "/(app)/ops/service-categories/[categoryId]/edit" | "/(app)/ops/service-categories/new" | "/(base)" | null
type LayoutParams = RouteParams & { id?: string; itemId?: string; categoryId?: string }
type LayoutParentData = EnsureDefined<{}>;

export type LayoutServerData = null;
export type LayoutData = Expand<LayoutParentData>;
export type LayoutProps = { data: LayoutData; children: import("svelte").Snippet }