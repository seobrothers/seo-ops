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
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	// Detect if we're on an edit route
	let isEditRoute = $derived(page.url.pathname.includes('/edit'));
	let isNewRoute = $derived(page.url.pathname.endsWith('/new'));
	let filter = $state('');

	const router = new ShallowRouter('/team/ops/partner-onboarding');

	async function openEdit(id: number) {
		await router.openEdit(id, 'editData');
	}

	let filteredTemplates = $derived(
		data.taskTemplates.filter(
			(template) => {
				// Filter by search text (title only)
				const matchesText = !filter ||
					template.title?.toLowerCase().includes(filter.toLowerCase());

				return matchesText;
			}
		)
	);

	async function openNewForm() {
		await router.openNew();
	}

	async function handleDelete(templateId: number) {
		try {
			const response = await fetch(`/team/ops/partner-onboarding/${templateId}`, {
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

	const hasActiveFilters = $derived(filter);

	function clearAllFilters() {
		filter = '';
	}
</script>

<svelte:head>
	<title>Partner Onboarding Templates</title>
</svelte:head>

<main class="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-4">
			<div>
				<h1 class="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">Partner Onboarding Templates</h1>
				<p class="text-muted-foreground mt-1">
					Universal task templates for partner onboarding workflows.
				</p>
			</div>
			<div class="space-y-3">
				<div class="relative">
					<Icons.Filter
						class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
					/>
					<Input autofocus placeholder="Filter templates..." class="w-80 pl-10" bind:value={filter} />
				</div>

				{#if hasActiveFilters}
					<Button variant="outline" size="sm" onclick={clearAllFilters}>
						<Icons.X class="h-3 w-3 mr-1" />
						Clear Filters
					</Button>
				{/if}
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

	<DataTable data={filteredTemplates} {columns} />
</main>

<SheetFormWrapper
	formName="Add Partner Onboarding Template"
	open={!!page.state.newData}
	onclose={() => history.back()}
>
	{#if page.state.newData}
		<NewPage data={{ ...page.state.newData, oncancel: () => history.back() }} />
	{/if}
</SheetFormWrapper>

<SheetFormWrapper
	formName="Edit Partner Onboarding Template"
	open={!!page.state.editData}
	onclose={() => history.back()}
>
	{#if page.state.editData}
		{#await import('./[id]/edit/+page.svelte') then module}
			<module.default data={page.state.editData} />
		{/await}
	{/if}
</SheetFormWrapper>
