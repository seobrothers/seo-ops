<script lang="ts">
	import { DataTable } from '$lib/components/ui/data-table';
	import { Input } from '$lib/components/ui/input';
	import { Icons } from '$lib/icons';
	import { createColumns } from './columns.js';
	import { Button } from '$lib/components/ui/button';
	import Callout from '$lib/components/callout.svelte';
	import SheetFormWrapper from '$lib/components/sheet-form-wrapper.svelte';
	import NewPage from './new/+page.svelte';
	import EditPage from './[id]/edit/+page.svelte';
	import { preloadData, pushState, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Combobox } from '$lib/components/ui/combobox';

	let { data } = $props();
	let filter = $state('');
	let selectedPartner = $state<number | null>(null);
	let selectedCampaignProfile = $state<number | null>(null);

	// Check if any partner-specific permissions exist
	let hasPartnerPermissions = $derived(
		data.permissions.some(p => p.partnerEntityId !== null)
	);

	// Get unique partners that have permissions
	let partnersWithPermissions = $derived(
		Array.from(
			new Set(
				data.permissions
					.filter(p => p.partnerEntityId !== null)
					.map(p => p.partnerEntityId)
			)
		)
			.map(id => data.partners.find(partner => partner.id === id))
			.filter(Boolean)
	);

	// Format partners and campaign profiles for Combobox
	let partnerOptions = $derived([
		{ value: null, label: 'None' },
		...partnersWithPermissions.map(p => ({ value: p.id, label: p.name }))
	]);

	let campaignProfileOptions = $derived([
		{ value: null, label: 'None' },
		...data.campaignProfiles.map(p => ({ value: p.id, label: p.name }))
	]);

	// Apply hierarchical filtering logic for effective permissions
	let filteredPermissions = $derived((() => {
		let permissions = data.permissions;

		// If no campaign profile selected, show only non-partner permissions (base view)
		if (selectedCampaignProfile === null) {
			// Show only base permissions (no partner)
			const basePermissions = permissions.filter(permission => !permission.partnerEntityId);

			// Apply text filter
			return basePermissions.filter(permission =>
				!filter ||
				permission.name?.toLowerCase().includes(filter.toLowerCase()) ||
				permission.permissionKey.toLowerCase().includes(filter.toLowerCase()) ||
				permission.permissionState.toLowerCase().includes(filter.toLowerCase()) ||
				permission.serviceCategoryDisplayName?.toLowerCase().includes(filter.toLowerCase())
			);
		}

		// Apply hierarchical selection logic based on filters (effective permissions logic)
		const selectedPermissions = new Map();

		// Priority 1: Partner + Profile + ServiceCategory (if partner selected)
		if (selectedPartner !== null) {
			for (const permission of permissions) {
				if (
					permission.partnerEntityId === selectedPartner &&
					permission.campaignProfileId === selectedCampaignProfile &&
					permission.serviceCategoryId !== null &&
					permission.permissionKey
				) {
					selectedPermissions.set(permission.permissionKey, permission);
				}
			}
		}

		// Priority 2: Partner + Profile (no category - applies to all categories)
		if (selectedPartner !== null) {
			for (const permission of permissions) {
				if (
					permission.partnerEntityId === selectedPartner &&
					permission.campaignProfileId === selectedCampaignProfile &&
					permission.serviceCategoryId === null &&
					permission.permissionKey &&
					!selectedPermissions.has(permission.permissionKey)
				) {
					selectedPermissions.set(permission.permissionKey, permission);
				}
			}
		}

		// Priority 3: Partner only (no profile or category - partner-wide defaults)
		if (selectedPartner !== null) {
			for (const permission of permissions) {
				if (
					permission.partnerEntityId === selectedPartner &&
					permission.campaignProfileId === null &&
					permission.serviceCategoryId === null &&
					permission.permissionKey &&
					!selectedPermissions.has(permission.permissionKey)
				) {
					selectedPermissions.set(permission.permissionKey, permission);
				}
			}
		}

		// Priority 4: Profile + ServiceCategory
		for (const permission of permissions) {
			if (
				permission.partnerEntityId === null &&
				permission.campaignProfileId === selectedCampaignProfile &&
				permission.serviceCategoryId !== null &&
				permission.permissionKey &&
				!selectedPermissions.has(permission.permissionKey)
			) {
				selectedPermissions.set(permission.permissionKey, permission);
			}
		}

		// Priority 5: Profile only
		for (const permission of permissions) {
			if (
				permission.partnerEntityId === null &&
				permission.campaignProfileId === selectedCampaignProfile &&
				permission.serviceCategoryId === null &&
				permission.permissionKey &&
				!selectedPermissions.has(permission.permissionKey)
			) {
				selectedPermissions.set(permission.permissionKey, permission);
			}
		}

		// Priority 6: ServiceCategory only
		for (const permission of permissions) {
			if (
				permission.partnerEntityId === null &&
				permission.campaignProfileId === null &&
				permission.serviceCategoryId !== null &&
				permission.permissionKey &&
				!selectedPermissions.has(permission.permissionKey)
			) {
				selectedPermissions.set(permission.permissionKey, permission);
			}
		}

		// Priority 7: Base defaults (no partner, profile, or category)
		for (const permission of permissions) {
			if (
				permission.partnerEntityId === null &&
				permission.campaignProfileId === null &&
				permission.serviceCategoryId === null &&
				permission.permissionKey &&
				!selectedPermissions.has(permission.permissionKey)
			) {
				selectedPermissions.set(permission.permissionKey, permission);
			}
		}

		// Convert to array and apply text filter
		const result = Array.from(selectedPermissions.values());
		return result.filter(permission =>
			!filter ||
			permission.name?.toLowerCase().includes(filter.toLowerCase()) ||
			permission.permissionKey.toLowerCase().includes(filter.toLowerCase()) ||
			permission.permissionState.toLowerCase().includes(filter.toLowerCase()) ||
			permission.serviceCategoryDisplayName?.toLowerCase().includes(filter.toLowerCase())
		);
	})());

	async function openNewForm() {
		const href = '/team/ops/permissions/new';
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { newData: result.data });
		} else {
			goto(href);
		}
	}

	const columns = createColumns();

	const hasActiveFilters = $derived(filter || selectedPartner !== null || selectedCampaignProfile !== null);

	function clearAllFilters() {
		filter = '';
		selectedPartner = null;
		selectedCampaignProfile = null;
	}
</script>

<svelte:head>
	<title>Permissions</title>
</svelte:head>

<main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-4">
			<div>
				<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Default Permissions</h1>
				<p class="text-muted-foreground mt-1">
					Manage default permission gates for service catalog items or categories.
				</p>
			</div>
			<div class="space-y-3">
				<div class="relative">
					<Icons.Filter
						class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
					/>
					<Input autofocus placeholder="Filter permissions..." class="w-80 pl-10" bind:value={filter} />
				</div>

				<!-- Dropdown Filters -->
				<div class="flex gap-3 items-end">
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-muted-foreground">By Campaign Profile</label>
						<Combobox
							options={campaignProfileOptions}
							bind:value={selectedCampaignProfile}
							placeholder="All Campaign Profiles"
							class="w-52"
						/>
					</div>

					{#if hasPartnerPermissions}
						<div class="flex flex-col gap-1">
							<label class="text-xs font-medium text-muted-foreground">By Partner</label>
							<Combobox
								options={partnerOptions}
								bind:value={selectedPartner}
								placeholder="All Partners"
								class="w-52"
							/>
						</div>
					{/if}

					{#if hasActiveFilters}
						<Button variant="outline" size="sm" onclick={clearAllFilters} class="h-9">
							<Icons.X class="h-3 w-3 mr-1" />
							Clear Filters
						</Button>
					{/if}
				</div>
			</div>
		</div>
		<div class="flex flex-col gap-4">
			<Callout
				title={hasActiveFilters ? "Filtered Permissions" : "Total Permissions"}
				value={filteredPermissions.length}
				icon={Icons.Shield}
			/>
			<div class="flex gap-2">
				<Button
					variant={data.includeInactive ? "default" : "outline"}
					onclick={() => {
						const url = new URL(window.location);
						if (data.includeInactive) {
							url.searchParams.delete('includeInactive');
						} else {
							url.searchParams.set('includeInactive', 'true');
						}
						goto(url.toString());
					}}
				>
					{data.includeInactive ? 'Show Active' : 'Show Inactive'}
				</Button>
				{#if data.canEdit}
					<Button onclick={openNewForm} class="gap-2">
						<Icons.Plus class="h-4 w-4" />
						Add Permission
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<DataTable data={filteredPermissions} {columns} />
</main>

<SheetFormWrapper
	formName="Add Permission"
	open={!!page.state.newData}
	onclose={() => history.back()}
>
	{#if page.state.newData}
		<NewPage data={{ ...page.state.newData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>

<SheetFormWrapper
	formName="Edit Permission"
	open={!!page.state.editData}
	onclose={() => history.back()}
>
	{#if page.state.editData}
		<EditPage data={{ ...page.state.editData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>
