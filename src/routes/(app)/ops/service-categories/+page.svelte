<script lang="ts">
	import { DataTable } from '$lib/components/ui/data-table';
	import { Input } from '$lib/components/ui/input';
	import { Icons } from '$lib/icons';
	import { createColumns } from './columns.js';
	import { Button } from '$lib/components/ui/button';
	import Callout from '$lib/components/callout.svelte';
	import SheetFormWrapper from '$lib/components/sheet-form-wrapper.svelte';
	import NewPage from './new/+page.svelte';
	import EditPage from './[categoryId]/edit/+page.svelte';
	import { preloadData, pushState, goto } from '$app/navigation';
	import { page } from '$app/state';

	let { data } = $props();
	let filter = $state('');

	let filteredCategories = $derived(
		data.serviceCategories.filter((category) => {
			return !filter ||
				category.displayName.toLowerCase().includes(filter.toLowerCase()) ||
				category.key.toLowerCase().includes(filter.toLowerCase()) ||
				category.description?.toLowerCase().includes(filter.toLowerCase());
		})
	);

	async function openNewForm() {
		const href = '/team/ops/service-categories/new';
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { newData: result.data });
		} else {
			goto(href);
		}
	}

	async function openEdit(id: number) {
		const href = `/team/ops/service-categories/${id}/edit`;
		const result = await preloadData(href);
		if (result.type === 'loaded' && result.status === 200) {
			pushState(href, { editData: result.data });
		} else {
			goto(href);
		}
	}

	const columns = createColumns(openEdit);
</script>

<svelte:head>
	<title>Service Categories</title>
</svelte:head>

<main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-4">
			<div>
				<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Service Categories</h1>
				<p class="text-muted-foreground mt-1">
					Manage service categories for organizing service items.
				</p>
			</div>
			<div class="relative">
				<Icons.Filter
					class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
				/>
				<Input autofocus placeholder="Filter categories..." class="w-80 pl-10" bind:value={filter} />
			</div>
		</div>
		<div class="flex flex-col gap-4">
			<Callout title="Total Categories" value={data.serviceCategories.length} icon={Icons.FolderTree} />
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
						Add Category
					</Button>
				{/if}
			</div>
		</div>
	</div>

	<DataTable data={filteredCategories} {columns} pageSize={25} />
</main>

<SheetFormWrapper
	formName="Add Service Category"
	open={!!page.state.newData}
	onclose={() => history.back()}
>
	{#if page.state.newData}
		<NewPage data={{ ...page.state.newData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>

<SheetFormWrapper
	formName="Edit Service Category"
	open={!!page.state.editData}
	onclose={() => history.back()}
>
	{#if page.state.editData}
		<EditPage data={{ ...page.state.editData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>
