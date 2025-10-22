<script lang="ts" module>
	import type { NavGroup } from '$lib/types';
	import { Icons } from '$lib/icons';

	const NAV_GROUPS: NavGroup[] = [
		{
			label: 'DATA',
			items: [
				{ url: '/partners', label: 'Partners', icon: Icons.Partner },
				{ url: '/campaigns', label: 'Campaigns', icon: Icons.Campaign },
			],
		},
		{
			label: 'FULFILLMENT',
			subgroups: [
				{
					label: 'Campaign Strategy',
					icon: Icons.Briefcase,
					items: [
						{ url: '#', label: 'Campaign Reviews', icon: Icons.Briefcase },
						{ url: '#', label: 'Content Plan Updates', icon: Icons.FileText },
						{ url: '#', label: 'Link Plan Updates', icon: Icons.Link },
						{ url: '#', label: 'SEO Plan Updates', icon: Icons.Users },
					],
				},
				{
					label: 'Link Building',
					icon: Icons.Link,
					items: [
						{ url: '#', label: 'DA20+ Link Building', icon: Icons.Link },
						{ url: '#', label: 'DA40+ Link Building', icon: Icons.Link },
						{ url: '#', label: 'ExecLinks', icon: Icons.Link },
					],
				},
				{
					label: 'Content',
					icon: Icons.FileText,
					items: [
						{ url: '#', label: 'Blog Post Creation', icon: Icons.FileText },
						{ url: '#', label: 'Geo Page Creation', icon: Icons.FileText },
						{ url: '#', label: 'Service Page Creation', icon: Icons.FileText },
						{ url: '#', label: 'Content Approvals', icon: Icons.FileText },
					],
				},
				{
					label: 'Technical SEO',
					icon: Icons.Bug,
					items: [
						{ url: '#', label: 'Crawl Maintenance', icon: Icons.Bug },
						{ url: '#', label: 'Technical SEO Tasks', icon: Icons.Activity },
					],
				},
				{
					label: 'Local SEO',
					icon: Icons.Location,
					items: [
						{ url: '#', label: 'GBP Posting', icon: Icons.Location },
						{ url: '#', label: 'Local SEO Tasks', icon: Icons.Location },
					],
				},
				{
					label: 'OnPage SEO',
					icon: Icons.FileText,
					items: [
						{ url: '#', label: 'Priority Page Reviews', icon: Icons.FileText },
						{ url: '#', label: 'OnPage SEO Tasks', icon: Icons.FileText },
					],
				},
			],
		},
		{
			label: 'OPERATIONS',
			subgroups: [
				{
					label: 'Dashboards',
					icon: Icons.Dashboard,
					items: [
						{ url: '#', label: 'Team Resourcing', icon: Icons.Users },
						{ url: '#', label: 'Overdue Tasks', icon: Icons.AlertTriangle },
					],
				},
				{
					label: 'Prompts',
					icon: Icons.FileText,
					items: [
						{ url: '#', label: 'Prompt Testing', icon: Icons.FileText },
						{ url: '#', label: 'Current Prompts', icon: Icons.FileText },
					],
				},
				{
					label: 'Campaign Health',
					icon: Icons.Activity,
					items: [
						{ url: '#', label: 'Issues', icon: Icons.AlertTriangle },
						{ url: '#', label: 'Checks', icon: Icons.Activity },
					],
				},
			],
		},
	];
</script>

<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import { invalidateAll } from '$app/navigation';
	import { Toaster } from '$lib/components/ui/sonner';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import AppSidebar from '$lib/components/app-sidebar.svelte';

	let { children, data } = $props();

	// Filter nav items based on user permissions
	let nav = $derived(
		NAV_GROUPS.map((ng) => ({
			...ng,
			items: ng.items?.filter((x) => !x.perm || data.permissions.has(x.perm)),
			subgroups: ng.subgroups?.map((sg) => ({
				...sg,
				items: sg.items.filter((x) => !x.perm || data.permissions.has(x.perm)),
			})),
		}))
	);

	const handleStopImpersonation: SubmitFunction = async () => {
		return async ({ result }) => {
			if (result?.type === 'success') {
				toast.success(`Stopped impersonating.`);
				invalidateAll();
			} else {
				toast.error(`Failed to stop impersonating.`);
			}
		};
	};
</script>

<Toaster richColors />
<Sidebar.Provider>
	<AppSidebar {nav} user={data.user} avatar={data.avatar} />
	<Sidebar.Inset>
		{#if data.impersonating}
			<header
				class="bg-destructive text-destructive-foreground sticky top-0 z-10 flex h-16 shrink-0 items-center justify-center gap-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12"
			>
				You are currently impersonating: {data.impersonating.givenName}
				{data.impersonating.familyName}
				<form action="/team/contacts?/stop" method="POST" use:enhance={handleStopImpersonation}>
					<Button type="submit" variant="secondary">Stop Impersonating</Button>
				</form>
			</header>
		{/if}
		<div class="pb-8">
			<svelte:boundary>{@render children()}</svelte:boundary>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
