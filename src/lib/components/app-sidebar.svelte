<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Avatar from '$lib/components/ui/avatar';
	import type { ComponentProps } from 'svelte';
	import Logo from '@lucide/svelte/icons/search';
	import { Icons } from '$lib/icons';
	import { goto } from '$app/navigation';
	import type { NavGroup } from '$lib/types';

	let {
		ref = $bindable(null),
		collapsible = 'icon',
		user,
		avatar,
		nav,
		...restProps
	}: ComponentProps<typeof Sidebar.Root> & {
		user?: { given_name: string; family_name: string; initials: string };
		avatar?: string;
		nav: NavGroup[];
	} = $props();

	// Track open state for each collapsible group by label
	let collapsibleStates = $state<Record<string, boolean>>({});

	function logout() {
		goto(`/api/auth/logout`);
	}
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
	<Sidebar.Header
		class="flex-row items-center py-6 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:py-3"
	>
		<a href="/" class="hidden group-data-[collapsible=icon]:block"><Logo /></a>
		<a href="/" class="group-data-[collapsible=icon]:hidden"
			><img src="/image/seobros-logo.png" class="mx-2 h-10 invert" alt="SEO Brothers logo" /></a
		>
		<Sidebar.Trigger class="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
	</Sidebar.Header>
	<Sidebar.Content>
		<!-- Grouped navigation -->
		{#each nav as group (group.label)}
			<Collapsible.Root
				open={collapsibleStates[group.label] ?? true}
				onOpenChange={(open) => collapsibleStates[group.label] = open}
				class="group/group-collapsible"
			>
				<Sidebar.Group>
					<Collapsible.Trigger class="w-full [&>button]:w-full">
						{#snippet child({ props })}
							<Sidebar.GroupLabel class="font-semibold tracking-wider uppercase cursor-pointer hover:bg-sidebar-accent/50 rounded-md flex items-center group/label" {...props}>
								<span class="flex-1">{group.label}</span>
								<Icons.ChevronRight
									class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/group-collapsible:rotate-90"
								/>
							</Sidebar.GroupLabel>
						{/snippet}
					</Collapsible.Trigger>
					<Collapsible.Content>
						<Sidebar.Menu>
							{#if group.subgroups}
								<!-- Render collapsible subgroups -->
								{#each group.subgroups as subgroup (subgroup.label)}
									<Collapsible.Root
										open={collapsibleStates[subgroup.label] ?? false}
										onOpenChange={(open) => collapsibleStates[subgroup.label] = open}
										class="group/collapsible"
									>
										<Sidebar.MenuItem>
											<Collapsible.Trigger>
												{#snippet child({ props })}
													<Sidebar.MenuButton {...props}>
														<subgroup.icon />
														<span>{subgroup.label}</span>
														<Icons.ChevronRight
															class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
														/>
													</Sidebar.MenuButton>
												{/snippet}
											</Collapsible.Trigger>
											<Collapsible.Content>
												<Sidebar.MenuSub>
													{#each subgroup.items as item (item.label)}
														<Sidebar.MenuSubItem>
															<Sidebar.MenuSubButton>
																{#snippet child({ props })}
																	<a href={item.url} {...props}>
																		<span>{item.label}</span>
																	</a>
																{/snippet}
															</Sidebar.MenuSubButton>
														</Sidebar.MenuSubItem>
													{/each}
												</Sidebar.MenuSub>
											</Collapsible.Content>
										</Sidebar.MenuItem>
									</Collapsible.Root>
								{/each}
							{:else if group.items}
								<!-- Render flat items -->
								{#each group.items as item (item.label)}
									<Sidebar.MenuItem>
										<Sidebar.MenuButton>
											{#snippet tooltipContent()}
												{item.label}
											{/snippet}
											{#snippet child({ props })}
												<a href={item.url} target="_blank" rel="noopener noreferrer" {...props}>
													<item.icon />
													<span>{item.label}</span>
												</a>
											{/snippet}
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								{/each}
							{/if}
						</Sidebar.Menu>
					</Collapsible.Content>
				</Sidebar.Group>
			</Collapsible.Root>
		{/each}
	</Sidebar.Content>
	<Sidebar.Footer>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class="hover:bg-sidebar-accent flex items-center gap-3 rounded-lg p-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:p-0"
			>
				<Avatar.Root class="group-data-[collapsible=icon]:size-7">
					<Avatar.Image src={avatar} alt={`${user?.given_name} ${user?.family_name}`} />
					<Avatar.Fallback class="text-primary group-data-[collapsible=icon]:text-xs"
						>{user?.initials}</Avatar.Fallback
					>
				</Avatar.Root>
				<div class="text-sm group-data-[collapsible=icon]:hidden">
					{user?.given_name}
					{user?.family_name}
				</div>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="start">
				<DropdownMenu.Label>{user?.given_name} {user?.family_name}</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Item><a href="/account">Account Settings</a></DropdownMenu.Item>
				<DropdownMenu.Item>Support</DropdownMenu.Item>
				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={logout}>Sign out</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
