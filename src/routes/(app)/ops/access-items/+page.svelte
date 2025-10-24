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
	import ViewPage from './[id]/view/+page.svelte';
	import { preloadData, pushState, goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Combobox } from '$lib/components/ui/combobox';

	let { data } = $props();
	let filter = $state('');
	let selectedPartner = $state<number | 'none' | null>(null);

	// Create unique partner options from the access items data
	let partnerOptions = $derived(
		(() => {
			const uniquePartners = new Map();
			data.accessItems.forEach(item => {
				if (item.partnerEntityId && item.partnerEntityName) {
					uniquePartners.set(item.partnerEntityId, {
						value: item.partnerEntityId,
						label: item.partnerEntityName
					});
				}
			});
			// Add special options at the beginning
			return [
				{ value: null, label: 'All Partners' },
				{ value: 'none' as const, label: 'Non Partner Items' },
				...Array.from(uniquePartners.values())
			];
		})()
	);

	let filteredAccessItems = $derived(
		data.accessItems.filter((item) => {
			// Filter by search text
			const matchesText = !filter ||
				item.username.toLowerCase().includes(filter.toLowerCase()) ||
				item.email?.toLowerCase().includes(filter.toLowerCase());

			// Filter by partner
			const matchesPartner = !selectedPartner ||
				(selectedPartner === 'none' ? !item.partnerEntityId : item.partnerEntityId === selectedPartner);

			return matchesText && matchesPartner;
		})
	);

	// Helper to check if any filters are active
	const hasActiveFilters = $derived(filter || selectedPartner);

	// Clear all filters function
	function clearAllFilters() {
		filter = '';
		selectedPartner = null;
	}

	async function openNewForm() {
		const href = '/team/ops/access-items/new';
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { newData: result.data });
		} else {
			goto(href);
		}
	}

	async function openViewForm(itemId: number) {
		const href = `/team/ops/access-items/${itemId}/view`;
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { viewData: result.data });
		} else {
			goto(href);
		}
	}

	async function openEditForm(itemId: number) {
		const href = `/team/ops/access-items/${itemId}/edit`;
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { editData: result.data });
		} else {
			goto(href);
		}
	}

	const columns = createColumns(openViewForm);
</script>

<svelte:head>
	<title>Access Items</title>
</svelte:head>

<main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-4">
			<div>
				<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Access Items</h1>
				<p class="text-muted-foreground mt-1">
					Manage credential and access information.
				</p>
			</div>
			<div class="space-y-3">
				<div class="relative">
					<Icons.Filter
						class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
					/>
					<Input autofocus placeholder="Filter access items..." class="w-80 pl-10" bind:value={filter} />
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
				title={hasActiveFilters ? "Filtered Items" : "Total Items"}
				value={filteredAccessItems.length}
				icon={Icons.Key}
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
						Add Access Item
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<DataTable data={filteredAccessItems} {columns} />
</main>

<SheetFormWrapper
	formName="Add Access Item"
	open={!!page.state.newData}
	onclose={() => history.back()}
>
	{#if page.state.newData}
		<NewPage data={{ ...page.state.newData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>

<SheetFormWrapper
	formName="View Access Item"
	open={!!page.state.viewData}
	onclose={() => history.back()}
>
	{#if page.state.viewData}
		<ViewPage data={page.state.viewData} />
	{/if}
</SheetFormWrapper>

<SheetFormWrapper
	formName="Edit Access Item"
	open={!!page.state.editData}
	onclose={() => history.back()}
>
	{#if page.state.editData}
		<EditPage data={{ ...page.state.editData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>