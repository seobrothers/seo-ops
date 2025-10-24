<script lang="ts">
	import { DataTable } from '$lib/components/ui/data-table';
	import { Input } from '$lib/components/ui/input';
	import { Icons } from '$lib/icons';
	import { createColumns } from './columns.js';
	import { Button } from '$lib/components/ui/button';
	import Callout from '$lib/components/callout.svelte';
	import SheetFormWrapper from '$lib/components/sheet-form-wrapper.svelte';
	import NewPage from './new/+page.svelte';
	import PackageCard from './package-card.svelte';
	import { preloadData, pushState, goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Select from '$lib/components/ui/select';
	import { Combobox } from '$lib/components/ui/combobox';
	import { ShallowRouter } from '$lib/utils/shallow-router';

	let { data } = $props();
	let filter = $state('');
	let selectedPartner = $state<number | 'none' | null>(null);
	let selectedCampaignProfile = $state<number | null>(null);
	let selectedType = $state<'ongoing' | 'one_time' | null>(null);

	// Initialize shallow router for this route
	const packageRouter = new ShallowRouter('/team/ops/packages');

	// Create unique partner options from the packages data (only partners that have packages)
	let partnerOptions = $derived(
		(() => {
			const uniquePartners = new Map();
			data.packages.forEach(pkg => {
				if (pkg.partnerEntityId && pkg.partnerName) {
					uniquePartners.set(pkg.partnerEntityId, {
						value: pkg.partnerEntityId,
						label: pkg.partnerName
					});
				}
			});
			// Add special options at the beginning
			return [
				{ value: null, label: 'All Partners' },
				{ value: 'none' as const, label: 'Non Partner Packages' },
				...Array.from(uniquePartners.values())
			];
		})()
	);

	// Create unique campaign profile options from the packages data (only profiles that have packages)
	let campaignProfileOptions = $derived(
		(() => {
			const uniqueProfiles = new Map();
			data.packages.forEach(pkg => {
				if (pkg.relatedCampaignProfileId && pkg.campaignProfileName) {
					uniqueProfiles.set(pkg.relatedCampaignProfileId, {
						id: pkg.relatedCampaignProfileId,
						name: pkg.campaignProfileName
					});
				}
			});
			return Array.from(uniqueProfiles.values());
		})()
	);
	
	
	let filteredPackages = $derived(
		data.packages.filter(
			(pkg) => {
				// Filter by search text (name only)
				const matchesText = !filter ||
					pkg.name?.toLowerCase().includes(filter.toLowerCase());

				// Filter by partner
				const matchesPartner = !selectedPartner ||
					(selectedPartner === 'none' ? !pkg.partnerEntityId : pkg.partnerEntityId === selectedPartner);

				// Filter by campaign profile
				const matchesCampaignProfile = !selectedCampaignProfile ||
					pkg.relatedCampaignProfileId === selectedCampaignProfile;

				// Filter by type
				const matchesType = !selectedType || pkg.type === selectedType;

				return matchesText && matchesPartner && matchesCampaignProfile && matchesType;
			}
		)
	);

	async function openNewForm() {
		await packageRouter.openNew('newData');
	}

	const columns = createColumns();
	
	// Helper to check if any filters are active
	const hasActiveFilters = $derived(filter || selectedPartner || selectedCampaignProfile || selectedType);
	
	// Clear all filters function
	function clearAllFilters() {
		filter = '';
		selectedPartner = null;
		selectedCampaignProfile = null;
		selectedType = null;
	}
	
	// Pagination state
	let currentPage = $state(1);
	let itemsPerPage = 25;
	let totalPages = $derived(Math.ceil(filteredPackages.length / itemsPerPage));
	let paginatedPackages = $derived(
		filteredPackages.slice(
			(currentPage - 1) * itemsPerPage,
			currentPage * itemsPerPage
		)
	);
	
	// Reset page when filters change
	$effect(() => {
		// Reset to first page when filters change
		filter; selectedPartner; selectedCampaignProfile; selectedType;
		currentPage = 1;
	});
</script>

<svelte:head>
	<title>Packages</title>
</svelte:head>

<main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-4">
			<div>
				<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Packages</h1>
				<p class="text-muted-foreground mt-1">
					Manage custom service packages for partners with tailored pricing and configurations.
				</p>
			</div>
			<div class="space-y-3">
				<div class="relative">
					<Icons.Search
						class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
					/>
					<Input autofocus placeholder="Search by name..." class="w-80 pl-10" bind:value={filter} />
				</div>
				
				<!-- Filter Row -->
				<div class="flex gap-3 items-end flex-wrap">
					<Combobox
						bind:value={selectedPartner}
						options={partnerOptions}
						label="By Partner"
						placeholder="All Partners"
						searchPlaceholder="Search partners..."
						emptyMessage="No partners found."
						class="w-64"
					/>
					
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-muted-foreground">By Campaign Profile</label>
						<Select.Root type="single" bind:value={selectedCampaignProfile}>
							<Select.Trigger class="w-64">
								{selectedCampaignProfile 
									? campaignProfileOptions.find(profile => profile.id === selectedCampaignProfile)?.name 
									: 'All Campaign Profiles'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value={null} label="All Campaign Profiles">All Campaign Profiles</Select.Item>
								{#each campaignProfileOptions as profile}
									<Select.Item value={profile.id} label={profile.name}>{profile.name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-muted-foreground">By Type</label>
						<Select.Root type="single" bind:value={selectedType}>
							<Select.Trigger class="w-48">
								{selectedType === 'ongoing' ? 'Ongoing' : selectedType === 'one_time' ? 'One Time' : 'All Types'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value={null} label="All Types">All Types</Select.Item>
								<Select.Item value="ongoing" label="Ongoing">Ongoing</Select.Item>
								<Select.Item value="one_time" label="One Time">One Time</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					
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
				title={hasActiveFilters ? "Filtered Packages" : "Total Packages"} 
				value={filteredPackages.length} 
				icon={Icons.Briefcase} 
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
						Add Package
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<!-- Cards View -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
		{#each paginatedPackages as pkg}
			<PackageCard package={pkg} />
		{/each}
	</div>
	
	{#if totalPages > 1}
		<div class="flex items-center justify-between px-2">
			<div class="text-sm text-muted-foreground">
				Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredPackages.length)} of {filteredPackages.length} packages
			</div>
			<div class="flex items-center space-x-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => currentPage = Math.max(1, currentPage - 1)}
					disabled={currentPage === 1}
				>
					<Icons.ChevronLeft class="h-4 w-4" />
					Previous
				</Button>
				<div class="text-sm">
					Page {currentPage} of {totalPages}
				</div>
				<Button
					variant="outline"
					size="sm"
					onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
					disabled={currentPage === totalPages}
				>
					Next
					<Icons.ChevronRight class="h-4 w-4" />
				</Button>
			</div>
		</div>
	{/if}
</main>

<SheetFormWrapper
	formName={page.state.duplicateData ? "Duplicate Package" : "Add Package"}
	open={!!(page.state.newData || page.state.duplicateData)}
	onclose={() => history.back()}
	size="wide"
>
	{#if page.state.newData}
		<NewPage data={{ ...page.state.newData, oncancel: () => history.back() }} />
	{:else if page.state.duplicateData}
		<NewPage data={{ ...page.state.duplicateData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>