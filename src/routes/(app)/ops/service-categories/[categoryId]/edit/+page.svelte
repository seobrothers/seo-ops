<script lang="ts">
	import ServiceCategoryForm from '$lib/forms/service-category/service-category-form.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Icons } from '$lib/icons';
	import * as Dialog from '$lib/components/ui/dialog';

	let { data } = $props();
	let deleteDialogOpen = $state(false);
</script>

<div class="flex flex-col gap-4">
	<!-- Header with Deactivate/Activate button -->
	<div class="flex justify-end">
		{#if data.category.isActive}
			<Button
				variant="ghost"
				size="sm"
				class="text-destructive hover:text-destructive hover:bg-destructive/10"
				onclick={() => deleteDialogOpen = true}
			>
				<Icons.Trash class="h-4 w-4 mr-2" />
				Deactivate
			</Button>
		{:else}
			<Button
				variant="ghost"
				size="sm"
				class="text-green-600 hover:text-green-600 hover:bg-green-50"
				onclick={() => {
					const form = document.createElement('form');
					form.method = 'POST';
					form.action = '?/reactivateCategory';
					document.body.appendChild(form);
					form.submit();
				}}
			>
				<Icons.RotateCcw class="h-4 w-4 mr-2" />
				Activate
			</Button>
		{/if}
	</div>

	<ServiceCategoryForm
		sform={data.form}
		oncancel={data.oncancel}
		action="?/updateCategory"
	/>
</div>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Deactivate Service Category</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to deactivate "{data.category.displayName}"? This will hide it from the active categories list.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex justify-end gap-3">
			<Button variant="outline" onclick={() => deleteDialogOpen = false}>Cancel</Button>
			<Button
				variant="destructive"
				onclick={() => {
					const form = document.createElement('form');
					form.method = 'POST';
					form.action = '?/deleteCategory';
					document.body.appendChild(form);
					form.submit();
				}}
			>
				Deactivate
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
