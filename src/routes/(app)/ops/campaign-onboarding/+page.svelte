<script lang="ts">
	import { DataTable } from '$lib/components/ui/data-table';
	import { Input } from '$lib/components/ui/input';
	import { Icons } from '$lib/icons';
	import { createColumns } from './columns.js';
	import { Button } from '$lib/components/ui/button';
	import Callout from '$lib/components/callout.svelte';
	import SheetFormWrapper from '$lib/components/sheet-form-wrapper.svelte';
	import NewPage from './new/+page.svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { ShallowRouter } from '$lib/utils/shallow-router';
	import { Combobox } from '$lib/components/ui/combobox';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	// Detect if we're on an edit route
	let isEditRoute = $derived(page.url.pathname.includes('/edit'));
	let isNewRoute = $derived(page.url.pathname.endsWith('/new'));

	let filter = $state('');
	let selectedPartner = $state<number | null>(null);
	let selectedCampaignProfile = $state<number | null>(null);

	const router = new ShallowRouter('/team/ops/campaign-onboarding');

	async function openEdit(id: number) {
		await router.openEdit(id, 'editData');
	}

	// Check if any partner-specific templates exist
	let hasPartnerTemplates = $derived(
		data.taskTemplates.some(t => t.partnerEntityId !== null)
	);

	// Get unique partners that have templates
	let partnersWithTemplates = $derived(
		Array.from(
			new Set(
				data.taskTemplates
					.filter(t => t.partnerEntityId !== null)
					.map(t => t.partnerEntityId)
			)
		)
			.map(id => data.partners.find(p => p.id === id))
			.filter(Boolean)
	);

	// Format partners and campaign profiles for Combobox
	let partnerOptions = $derived(
		partnersWithTemplates.map(p => ({ value: p.id, label: p.name }))
	);

	let campaignProfileOptions = $derived(
		data.campaignProfiles.map(p => ({ value: p.id, label: p.name }))
	);

	// Apply hierarchical filtering logic
	let filteredTemplates = $derived((() => {
		let templates = data.taskTemplates;

		// If no campaign profile selected, show all templates
		if (selectedCampaignProfile === null) {
			// Just apply text filter
			return templates.filter(template =>
				!filter || template.title?.toLowerCase().includes(filter.toLowerCase())
			);
		}

		// Apply hierarchical selection logic based on filters
		const selectedTemplates = new Map();

		// Priority 1: Partner + Profile + ServiceCategory (if partner selected)
		if (selectedPartner !== null) {
			for (const template of templates) {
				if (
					template.partnerEntityId === selectedPartner &&
					template.campaignProfileId === selectedCampaignProfile &&
					template.serviceCategoryId !== null &&
					template.key
				) {
					selectedTemplates.set(template.key, template);
				}
			}
		}

		// Priority 2: Partner + Profile (no category)
		if (selectedPartner !== null) {
			for (const template of templates) {
				if (
					template.partnerEntityId === selectedPartner &&
					template.campaignProfileId === selectedCampaignProfile &&
					template.serviceCategoryId === null &&
					template.key &&
					!selectedTemplates.has(template.key)
				) {
					selectedTemplates.set(template.key, template);
				}
			}
		}

		// Priority 3: Partner only (no profile or category)
		if (selectedPartner !== null) {
			for (const template of templates) {
				if (
					template.partnerEntityId === selectedPartner &&
					template.campaignProfileId === null &&
					template.serviceCategoryId === null &&
					template.key &&
					!selectedTemplates.has(template.key)
				) {
					selectedTemplates.set(template.key, template);
				}
			}
		}

		// Priority 4: Profile + ServiceCategory
		for (const template of templates) {
			if (
				template.partnerEntityId === null &&
				template.campaignProfileId === selectedCampaignProfile &&
				template.serviceCategoryId !== null &&
				template.key &&
				!selectedTemplates.has(template.key)
			) {
				selectedTemplates.set(template.key, template);
			}
		}

		// Priority 5: Profile only
		for (const template of templates) {
			if (
				template.partnerEntityId === null &&
				template.campaignProfileId === selectedCampaignProfile &&
				template.serviceCategoryId === null &&
				template.key &&
				!selectedTemplates.has(template.key)
			) {
				selectedTemplates.set(template.key, template);
			}
		}

		// Priority 6: ServiceCategory only
		for (const template of templates) {
			if (
				template.partnerEntityId === null &&
				template.campaignProfileId === null &&
				template.serviceCategoryId !== null &&
				template.key &&
				!selectedTemplates.has(template.key)
			) {
				selectedTemplates.set(template.key, template);
			}
		}

		// Priority 7: Default (no partner, profile, or service category)
		for (const template of templates) {
			if (
				template.partnerEntityId === null &&
				template.campaignProfileId === null &&
				template.serviceCategoryId === null &&
				template.key &&
				!selectedTemplates.has(template.key)
			) {
				selectedTemplates.set(template.key, template);
			}
		}

		// Convert to array and apply text filter
		const result = Array.from(selectedTemplates.values());
		return result.filter(template =>
			!filter || template.title?.toLowerCase().includes(filter.toLowerCase())
		);
	})());

	async function openNewForm() {
		await router.openNew();
	}

	async function handleDelete(templateId: number) {
		try {
			const response = await fetch(`/team/ops/campaign-onboarding/${templateId}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				location.reload();
			} else {
				const errorData = await response.text();
				console.error('Failed to delete template:', errorData);
				toast.error('Failed to delete template. Please try again.');
			}
		} catch (error) {
			console.error('Error deleting template:', error);
			toast.error('Error deleting template. Please try again.');
		}
	}

	const columns = createColumns(openEdit);

	const hasActiveFilters = $derived(filter || selectedPartner !== null || selectedCampaignProfile !== null);

	function clearAllFilters() {
		filter = '';
		selectedPartner = null;
		selectedCampaignProfile = null;
	}
</script>

<svelte:head>
	<title>Campaign Onboarding Templates</title>
</svelte:head>

<main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-4">
			<div>
				<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Campaign Onboarding Templates</h1>
				<p class="text-muted-foreground mt-1">
					Task templates for campaign onboarding workflows - can be default or specific to partners/profiles.
				</p>
			</div>
			<div class="space-y-3">
				<div class="relative">
					<Icons.Filter
						class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
					/>
					<Input autofocus placeholder="Filter templates..." class="w-80 pl-10" bind:value={filter} />
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

					{#if hasPartnerTemplates}
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
				title={hasActiveFilters ? "Filtered Templates" : "Total Templates"}
				value={filteredTemplates.length}
				icon={Icons.CheckSquare}
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
						Add Template
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<DataTable data={filteredTemplates} {columns} pageSize={20} />
</main>

<SheetFormWrapper
	formName="Add Campaign Onboarding Template"
	open={!!page.state.newData}
	onclose={() => history.back()}
>
	{#if page.state.newData}
		<NewPage data={{ ...page.state.newData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>

<SheetFormWrapper
	formName="Edit Campaign Onboarding Template"
	open={!!page.state.editData}
	onclose={() => history.back()}
>
	{#if page.state.editData}
		{#await import('./[id]/edit/+page.svelte') then module}
			<module.default data={page.state.editData} />
		{/await}
	{/if}
</SheetFormWrapper>
