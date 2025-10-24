<script lang="ts">
	import { DataTable } from '$lib/components/ui/data-table';
	import { Input } from '$lib/components/ui/input';
	import { Icons } from '$lib/icons';
	import { createColumns } from './columns.js';
	import { Button } from '$lib/components/ui/button';
	import Callout from '$lib/components/callout.svelte';
	import SheetFormWrapper from '$lib/components/sheet-form-wrapper.svelte';
	import NewPage from './new/+page.svelte';
		import { preloadData, pushState, goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();
	let filter = $state('');
	let filteredServiceItems = $derived(
		data.serviceItems.filter(
			(serviceItem) => {
				// Filter by partner assignment (exclude partner items by default)
				if (!data.includePartnerItems && serviceItem.partnerEntityId !== null) {
					return false;
				}

				// Filter by search text
				return !filter ||
					serviceItem.name.toLowerCase().includes(filter.toLowerCase()) ||
					serviceItem.serviceCategory?.toLowerCase().includes(filter.toLowerCase()) ||
					serviceItem.serviceLabel?.toLowerCase().includes(filter.toLowerCase());
			}
		)
	);

	async function openNewForm() {
		const href = '/team/ops/service-catalog/new';
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { newData: result.data });
		} else {
			// Fallback to navigation if preload fails
			goto(href);
		}
	}

	const columns = createColumns();
</script>

<svelte:head>
	<title>Service Catalog</title>
</svelte:head>

<main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-4">
			<div>
				<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Service Catalog</h1>
				<p class="text-muted-foreground mt-1">
					Our service catalog outlines our available service items we provide within a campaign. They can be added to packages, used for initial planning in discovery, or used part of specialist plans. They are the backbone of our production and fullfillment operations.
				</p>
			</div>
			<div class="relative">
				<Icons.Filter
					class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
				/>
				<Input autofocus placeholder="Filter service items..." class="w-80 pl-10" bind:value={filter} />
			</div>
		</div>
		<div class="flex flex-col gap-4">
			<Callout title="Total Service Items" value={data.serviceItems.length} icon={Icons.Briefcase} />
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
				<Button
					variant={data.includePartnerItems ? "default" : "outline"}
					onclick={() => {
						const url = new URL(window.location);
						if (data.includePartnerItems) {
							url.searchParams.delete('includePartnerItems');
						} else {
							url.searchParams.set('includePartnerItems', 'true');
						}
						goto(url.toString());
					}}
				>
					{data.includePartnerItems ? 'Hide Partner Items' : 'Show Partner Items'}
				</Button>
				{#if data.canEdit}
					<Button onclick={openNewForm} class="gap-2">
						<Icons.Plus class="h-4 w-4" />
						Add Service Item
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<DataTable data={filteredServiceItems} {columns} density="compact" pageSize={25} />
</main>

<SheetFormWrapper
	formName="Add Service Item"
	open={!!page.state.newData}
	onclose={() => history.back()}
	size="wide"
>
	{#if page.state.newData}
		<NewPage data={{ ...page.state.newData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>

